/**
 * dsh-agent-lab — Agent behavior regression lab.
 *
 * The Host half records a Session log as a comparable "run", keeps runs as
 * plain JSON files, and compares two of them. A small same-origin JSON API
 * feeds the browser page; the page itself is a Client slot plugin.
 */

import { randomUUID } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { buildRun, summarizeRun } from './lib/capture.mjs'
import { compareRuns } from './lib/compare.mjs'
import { evaluateRun, normalizeChecks } from './lib/checks.mjs'
import { buildMatrix, taskKeyOf } from './lib/matrix.mjs'
import { firstTurnEndAfter, planReplay, replayProgress, turnReasonOf } from './lib/replay.mjs'

export const name = 'agent-lab'

const ROUTE_PREFIX = '/agent-lab'
const MAX_BODY_BYTES = 256 * 1024
const MAX_EVENTS = 200000
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/u
const RUN_ID_PATTERN = /^run-[A-Za-z0-9-]{4,80}$/u
const TASK_KEY_PATTERN = /^task-[a-f0-9]{12}$/u
const REPLAY_POLL_MS = 1_000
const REPLAY_TIMEOUT_MS = 20 * 60 * 1_000
const REPLAY_CANCEL_GRACE_MS = 10 * 1_000
const REPLAY_TERMINAL = new Set(['completed', 'cancelled', 'timeout', 'failed'])

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ storeDir?: string }} [config]
 */
export function apply(ctx, config = {}) {
  const storeDir = resolveStoreDir(config)
  const runsDir = join(storeDir, 'runs')
  const checksDir = join(storeDir, 'checks')

  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.webServer
    const handler = createHandler(webCtx, { runsDir, storeDir, checksDir })

    webCtx.effect(
      () => webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler }),
      'agent-lab: http api',
    )

    try {
      console.log(`[agent-lab] ${webServer.getOrigin()}${ROUTE_PREFIX}/api/state`)
    } catch {
      /* origin is unavailable until the listener binds */
    }
  })
}

/**
 * @param {any} webCtx
 * @param {{ runsDir: string, storeDir: string, checksDir: string }} options
 */
function createHandler(webCtx, { runsDir, storeDir, checksDir }) {
  const replay = createReplayRunner(webCtx, { runsDir, storeDir })

  return async function handler(req, res) {
    if (!requestAllowed(req)) {
      respondJson(res, 403, { ok: false, error: 'forbidden' })
      return
    }

    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname.slice(ROUTE_PREFIX.length)

    try {
      if (path === '/api/state' && req.method === 'GET') {
        const runs = await listRuns(runsDir)
        respondJson(res, 200, { ok: true, dir: runsDir, runs })
        return
      }

      if (path === '/api/sessions' && req.method === 'GET') {
        const sessions = await listSessions(webCtx)
        respondJson(res, 200, { ok: true, sessions })
        return
      }

      if (path === '/api/capture' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
        if (!SESSION_ID_PATTERN.test(sessionId)) {
          respondJson(res, 400, { ok: false, error: 'invalid session id' })
          return
        }
        const run = await captureSession(webCtx, sessionId)
        run.id = `run-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`
        run.capturedAt = Date.now()
        await writeRun(runsDir, run)
        respondJson(res, 200, { ok: true, run })
        return
      }

      if (path === '/api/run' && req.method === 'GET') {
        const id = url.searchParams.get('id') ?? ''
        if (!RUN_ID_PATTERN.test(id)) {
          respondJson(res, 400, { ok: false, error: 'invalid run id' })
          return
        }
        const run = await readRun(runsDir, id)
        if (run === undefined) {
          respondJson(res, 404, { ok: false, error: 'run not found' })
          return
        }
        respondJson(res, 200, { ok: true, run })
        return
      }

      if (path === '/api/compare' && req.method === 'GET') {
        const aId = url.searchParams.get('a') ?? ''
        const bId = url.searchParams.get('b') ?? ''
        if (!RUN_ID_PATTERN.test(aId) || !RUN_ID_PATTERN.test(bId)) {
          respondJson(res, 400, { ok: false, error: 'invalid run id' })
          return
        }
        const [a, b] = await Promise.all([readRun(runsDir, aId), readRun(runsDir, bId)])
        if (a === undefined || b === undefined) {
          respondJson(res, 404, { ok: false, error: 'run not found' })
          return
        }
        respondJson(res, 200, { ok: true, diff: compareRuns(a, b) })
        return
      }

      if (path === '/api/delete' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const id = typeof body?.id === 'string' ? body.id.trim() : ''
        if (!RUN_ID_PATTERN.test(id)) {
          respondJson(res, 400, { ok: false, error: 'invalid run id' })
          return
        }
        await rm(join(runsDir, `${id}.json`), { force: true })
        respondJson(res, 200, { ok: true })
        return
      }

      if (path === '/api/models' && req.method === 'GET') {
        respondJson(res, 200, { ok: true, ...(await readModelCatalog(webCtx)) })
        return
      }

      if (path === '/api/matrix' && req.method === 'GET') {
        respondJson(res, 200, { ok: true, matrix: await readMatrix(runsDir, checksDir) })
        return
      }

      if (path === '/api/checks' && req.method === 'GET') {
        const taskKey = url.searchParams.get('task') ?? ''
        if (!TASK_KEY_PATTERN.test(taskKey)) {
          respondJson(res, 400, { ok: false, error: 'invalid task key' })
          return
        }
        const loaded = await loadChecks(checksDir, taskKey)
        respondJson(res, 200, { ok: true, taskKey, checks: loaded.checks, error: loaded.error })
        return
      }

      if (path === '/api/checks' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const taskKey = typeof body?.taskKey === 'string' ? body.taskKey.trim() : ''
        if (!TASK_KEY_PATTERN.test(taskKey)) {
          respondJson(res, 400, { ok: false, error: 'invalid task key' })
          return
        }
        let checks
        try {
          checks = normalizeChecks(body?.checks)
        } catch (error) {
          respondJson(res, 400, { ok: false, error: errorMessage(error) })
          return
        }
        await writeChecks(checksDir, taskKey, checks)
        respondJson(res, 200, { ok: true, taskKey, checks })
        return
      }

      if (path === '/api/checks/preview' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const runId = typeof body?.runId === 'string' ? body.runId.trim() : ''
        if (!RUN_ID_PATTERN.test(runId)) {
          respondJson(res, 400, { ok: false, error: 'invalid run id' })
          return
        }
        const run = await readRun(runsDir, runId)
        if (run === undefined) {
          respondJson(res, 404, { ok: false, error: 'run not found' })
          return
        }
        let checks
        try {
          checks = normalizeChecks(body?.checks)
        } catch (error) {
          respondJson(res, 400, { ok: false, error: errorMessage(error) })
          return
        }
        const evaluation = await evaluateRun({
          run,
          checks,
          readText: readUtf8,
          statPath: (target) => stat(target),
        })
        respondJson(res, 200, { ok: true, passed: evaluation.passed, results: evaluation.results })
        return
      }

      if (path === '/api/replay' && req.method === 'GET') {
        const id = url.searchParams.get('id') ?? ''
        const job = replay.get(id)
        if (job === undefined) {
          respondJson(res, 404, { ok: false, error: 'replay not found' })
          return
        }
        respondJson(res, 200, { ok: true, job })
        return
      }

      if (path === '/api/replay' && req.method === 'POST') {
        const body = await readJsonBody(req)
        try {
          const job = await replay.start(body)
          respondJson(res, 200, { ok: true, job })
        } catch (error) {
          respondJson(res, 400, { ok: false, error: errorMessage(error) })
        }
        return
      }

      if (path === '/api/replay/cancel' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const id = typeof body?.id === 'string' ? body.id.trim() : ''
        if (id === '') {
          respondJson(res, 400, { ok: false, error: 'invalid replay id' })
          return
        }
        const job = replay.cancel(id)
        if (job === undefined) {
          respondJson(res, 404, { ok: false, error: 'replay not found' })
          return
        }
        respondJson(res, 200, { ok: true, job })
        return
      }

      respondJson(res, 404, { ok: false, error: 'not found' })
    } catch (error) {
      respondJson(res, 500, { ok: false, error: errorMessage(error) })
    }
  }
}

/**
 * One replay at a time: copy the baseline workspace, create a fresh Session
 * there, force an unattended policy, prompt it, and wait for its turn to end.
 *
 * @param {any} ctx
 * @param {{ runsDir: string, storeDir: string }} options
 */
function createReplayRunner(ctx, { runsDir, storeDir }) {
  const replaysDir = join(storeDir, 'replays')
  let current = null

  /** @param {any} body */
  async function start(body) {
    if (current !== null && !REPLAY_TERMINAL.has(current.status)) {
      throw new Error('another replay is running; wait for it or cancel it first')
    }
    const baseRunId = typeof body?.baseRunId === 'string' ? body.baseRunId.trim() : ''
    if (!RUN_ID_PATTERN.test(baseRunId)) throw new Error('invalid base run id')
    const base = await readRun(runsDir, baseRunId)
    if (base === undefined) throw new Error('baseline run not found')

    const spec = planReplay(base, body)
    const job = {
      id: `replay-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`,
      status: 'preparing',
      phase: 'preparing',
      baseRunId,
      baseTitle: base.title ?? '',
      spec,
      session: null,
      sessionId: null,
      runId: null,
      workspaceDir: null,
      startedAt: Date.now(),
      finishedAt: null,
      error: null,
      turnReason: null,
      cancelRequested: false,
      progress: { toolCalls: 0, steps: 0, turn: null, step: null },
    }
    current = job
    void execute(job, base).catch((error) => {
      job.status = 'failed'
      job.phase = 'done'
      job.error = errorMessage(error)
      job.finishedAt = Date.now()
    })
    return snapshot(job)
  }

  /** @param {string} id */
  function get(id) {
    if (current === null || current.id !== id) return undefined
    return snapshot(current)
  }

  /** @param {string} id */
  function cancel(id) {
    if (current === null || current.id !== id) return undefined
    if (REPLAY_TERMINAL.has(current.status)) return snapshot(current)
    current.cancelRequested = true
    return snapshot(current)
  }

  /**
   * @param {any} job
   * @param {any} base
   */
  async function execute(job, base) {
    const controller = ctx.get('sessionController')
    const sessions = ctx.get('sessions')
    if (controller === undefined || sessions === undefined) {
      throw new Error('session services are unavailable')
    }

    job.phase = 'preparing'
    const sourceCwd =
      typeof base?.session?.cwd === 'string' && base.session.cwd !== '' ? base.session.cwd : undefined
    const workspaceDir = join(replaysDir, job.id, 'workspace')
    await mkdir(workspaceDir, { recursive: true })
    if (sourceCwd !== undefined) {
      const info = await stat(sourceCwd).catch(() => undefined)
      if (info === undefined || !info.isDirectory()) {
        throw new Error(`baseline workspace is unavailable: ${sourceCwd}`)
      }
      await cp(sourceCwd, workspaceDir, { recursive: true, force: true, errorOnExist: false })
    }
    job.workspaceDir = workspaceDir
    if (job.cancelRequested) {
      finish(job, 'cancelled')
      return
    }

    job.phase = 'starting'
    const created = await createReplaySession(controller, base, workspaceDir)
    job.sessionId = String(created.sessionId)
    const session = sessions.get(job.sessionId)
    if (session === undefined) throw new Error('the replay session was not published')
    job.session = session

    configureUnattended(ctx, session)
    await selectReplayModel(ctx, controller, job.sessionId, job.spec)
    if (job.cancelRequested) {
      finish(job, 'cancelled')
      return
    }

    const fromSeq = session.seq
    await controller.prompt(
      {
        requestId: `agent-lab-${job.id}`,
        sessionId: job.sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: job.spec.prompt }],
        clientTimeZone: timeZone(),
      },
      new AbortController().signal,
    )

    job.phase = 'running'
    const outcome = await waitForTurn(ctx, job, session, fromSeq)

    job.phase = 'finishing'
    await captureReplay(job, base, sessions, outcome, sourceCwd, workspaceDir)
    job.turnReason = outcome.reason
    finish(job, outcome.status)
  }

  /**
   * @param {any} controller
   * @param {any} base
   * @param {string} cwd
   */
  async function createReplaySession(controller, base, cwd) {
    const agentPreset =
      typeof base?.config?.agentPreset === 'string' && base.config.agentPreset !== ''
        ? base.config.agentPreset
        : undefined
    if (agentPreset !== undefined) {
      try {
        return await controller.create({ cwd, agentPreset })
      } catch {
        // A preset can disappear between recording and replay; the default
        // preset still produces a comparable run, and the config chip shows it.
      }
    }
    return controller.create({ cwd })
  }

  /**
   * @param {any} ctx
   * @param {any} controller
   * @param {string} sessionId
   * @param {any} spec
   */
  async function selectReplayModel(ctx, controller, sessionId, spec) {
    const defaults = ctx.get('agentDefaultModel')
    const previous = defaults?.currentSelection()
    const selection = { sessionId, provider: spec.provider, model: spec.model }
    if (spec.reasoningEffort !== undefined) selection.reasoningEffort = spec.reasoningEffort
    await controller.selectModel(selection)

    // selectModel also persists the profile default in the background. Put the
    // exact previous selection back so a replay never silently changes it.
    if (defaults !== undefined && previous !== undefined && selectionDiffers(previous, spec)) {
      try {
        await defaults.saveSelection(previous)
      } catch (error) {
        console.warn(`[agent-lab] could not restore the default model: ${errorMessage(error)}`)
      }
    }
  }

  /**
   * @param {any} ctx
   * @param {any} job
   * @param {any} session
   * @param {number} fromSeq
   */
  async function waitForTurn(ctx, job, session, fromSeq) {
    const deadline = Date.now() + REPLAY_TIMEOUT_MS
    let cancelAt = null
    let timeoutAt = null
    for (;;) {
      const events = session.snapshotEvents()
      job.progress = replayProgress(events, fromSeq)
      const end = firstTurnEndAfter(events, fromSeq)
      if (end !== undefined) {
        const status = timeoutAt !== null ? 'timeout' : cancelAt !== null ? 'cancelled' : 'completed'
        return { status, reason: turnReasonOf(end.data?.reason) }
      }

      const now = Date.now()
      if (job.cancelRequested && cancelAt === null) {
        cancelAt = now
        cancelTurn(ctx, job)
      }
      if (now > deadline && timeoutAt === null) {
        timeoutAt = now
        cancelTurn(ctx, job)
      }
      if (cancelAt !== null && now - cancelAt >= REPLAY_CANCEL_GRACE_MS) {
        return { status: 'cancelled', reason: null }
      }
      if (timeoutAt !== null && now - timeoutAt >= REPLAY_CANCEL_GRACE_MS) {
        return { status: 'timeout', reason: null }
      }
      await delay(REPLAY_POLL_MS)
    }
  }

  /**
   * @param {any} job
   * @param {any} base
   * @param {any} sessions
   * @param {{ status: string, reason: string | null }} outcome
   * @param {string | undefined} sourceCwd
   * @param {string} workspaceDir
   */
  async function captureReplay(job, base, sessions, outcome, sourceCwd, workspaceDir) {
    const live = sessions.get(job.sessionId) ?? job.session
    const run = buildRun({
      sessionId: job.sessionId,
      header: live.header,
      events: live.snapshotEvents(),
      isLive: true,
    })
    run.id = `run-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`
    run.capturedAt = Date.now()
    run.replay = {
      baseRunId: job.baseRunId,
      baseTitle: job.baseTitle,
      baseSessionId: typeof base?.session?.sessionId === 'string' ? base.session.sessionId : null,
      status: outcome.status,
      turnReason: outcome.reason,
      promptEdited: job.spec.promptEdited,
      workspace: { kind: 'copy', source: sourceCwd ?? null, dir: workspaceDir },
      model: {
        provider: job.spec.provider,
        model: job.spec.model,
        reasoningEffort: job.spec.reasoningEffort ?? null,
      },
      startedAt: job.startedAt,
      finishedAt: run.capturedAt,
    }
    await writeRun(runsDir, run)
    job.runId = run.id
  }

  /** @param {any} job @param {string} status */
  function finish(job, status) {
    job.status = status
    job.phase = 'done'
    job.finishedAt = Date.now()
  }

  return { start, get, cancel }
}

/**
 * Public, JSON-safe view of one replay job.
 *
 * @param {any} job
 */
function snapshot(job) {
  return {
    id: job.id,
    status: job.status,
    phase: job.phase,
    baseRunId: job.baseRunId,
    baseTitle: job.baseTitle,
    sessionId: job.sessionId,
    runId: job.runId,
    workspaceDir: job.workspaceDir,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    error: job.error,
    turnReason: job.turnReason,
    cancelRequested: job.cancelRequested,
    progress: job.progress,
    model: {
      provider: job.spec.provider,
      model: job.spec.model,
      reasoningEffort: job.spec.reasoningEffort ?? null,
    },
    promptEdited: job.spec.promptEdited,
  }
}

/**
 * Force the replay session to write only inside the copied workspace and to
 * never wait for a human: an unheard approval request would stall the replay.
 *
 * @param {any} ctx
 * @param {any} session
 */
function configureUnattended(ctx, session) {
  const presets = ctx.get('permissionPresets')
  const presetName = pickWorkspacePreset(presets)
  if (presetName !== undefined) {
    try {
      presets.set(session, presetName)
    } catch {
      /* fall back to the logged mode below */
    }
  } else {
    try {
      session.append('sandbox/mode', { mode: 'workspace-write' })
    } catch {
      /* leave the deployment default; the run records what was in effect */
    }
  }

  const approval = ctx.get('approval')
  const agent = ctx.get('agents')?.get(session.id)
  if (approval !== undefined && agent !== undefined) {
    try {
      approval.setPolicy(agent, 'never')
      return
    } catch {
      /* fall through to the logged policy */
    }
  }
  try {
    session.append('approval/policy', { policy: 'never' })
  } catch {
    /* leave the deployment default */
  }
}

/**
 * @param {any} presets
 * @returns {string | undefined}
 */
function pickWorkspacePreset(presets) {
  if (presets === undefined) return undefined
  let catalog
  try {
    catalog = presets.catalog()
  } catch {
    return undefined
  }
  const options = Array.isArray(catalog?.options) ? catalog.options : []
  let fallback
  for (const option of options) {
    try {
      const spec = presets.resolve(option.value)
      if (spec?.sandbox !== 'workspace-write') continue
      if (spec.approval === 'never') return option.value
      fallback ??= option.value
    } catch {
      /* a preset that no longer resolves cannot be selected either */
    }
  }
  return fallback
}

/** @param {any} ctx @param {any} job */
function cancelTurn(ctx, job) {
  try {
    ctx.get('sessionController')?.cancel({ sessionId: job.sessionId })
  } catch {
    /* the turn may already be settling; the poll loop will observe it */
  }
}

/** @param {any} previous @param {any} spec */
function selectionDiffers(previous, spec) {
  return (
    previous?.provider !== spec.provider ||
    previous?.model !== spec.model ||
    (previous?.reasoningEffort ?? undefined) !== (spec.reasoningEffort ?? undefined)
  )
}

/** @param {number} ms */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Host model catalog for the replay dialog. */
async function readModelCatalog(ctx) {
  const controller = ctx.get('sessionController')
  if (controller === undefined) return { default: null, groups: [], failures: [] }
  try {
    const catalog = await controller.modelCatalog()
    return {
      default: catalog?.default ?? null,
      groups: Array.isArray(catalog?.groups) ? catalog.groups : [],
      failures: Array.isArray(catalog?.failures) ? catalog.failures : [],
    }
  } catch (error) {
    return {
      default: null,
      groups: [],
      failures: [{ id: 'catalog', name: 'catalog', message: errorMessage(error) }],
    }
  }
}

/** Browser-independent IANA zone for the accepted prompt. */
function timeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

/**
 * Read one Session — live when the process holds it, otherwise from durable
 * storage — and fold its events into a run.
 *
 * @param {any} ctx
 * @param {string} sessionId
 */
async function captureSession(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  const live = sessions?.get(sessionId)
  if (live !== undefined) {
    return buildRun({
      sessionId,
      header: live.header,
      events: live.snapshotEvents(),
      isLive: true,
    })
  }

  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined) throw new Error('session storage is unavailable')

  const handle = await persistence.open(sessionId, 'read')
  try {
    const result = await handle.read(0, MAX_EVENTS)
    return buildRun({
      sessionId,
      header: handle.header,
      events: result.events,
      isLive: false,
    })
  } finally {
    await handle.close()
  }
}

/**
 * Sessions a person can record: durable non-delegated sessions plus live ones.
 *
 * @param {any} ctx
 */
async function listSessions(ctx) {
  const sessions = ctx.get('sessions')
  const persistence = ctx.get('sessionPersistence')
  const seen = new Map()

  if (persistence !== undefined) {
    let snapshots = []
    try {
      snapshots = await persistence.list()
    } catch {
      snapshots = []
    }
    for (const snapshot of snapshots) {
      const header = snapshot.header
      if (header.origin === 'subagent') continue
      seen.set(header.id, {
        id: header.id,
        cwd: header.cwd,
        createdAt: header.createdAt,
        agentPreset: header.agentPreset,
        eventCount: snapshot.eventCount,
        sizeBytes: snapshot.sizeBytes,
        isLive: false,
      })
    }
  }

  for (const session of sessions?.list() ?? []) {
    const header = session.header
    if (header.origin === 'subagent') continue
    const existing = seen.get(header.id)
    seen.set(header.id, {
      id: header.id,
      cwd: header.cwd ?? existing?.cwd,
      createdAt: header.createdAt ?? existing?.createdAt,
      agentPreset: header.agentPreset ?? existing?.agentPreset,
      eventCount: session.snapshotEvents().length,
      sizeBytes: existing?.sizeBytes,
      isLive: true,
    })
  }

  return [...seen.values()]
    .sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))
    .slice(0, 80)
}

/**
 * @param {string} runsDir
 */
async function listRuns(runsDir) {
  const runs = await listRunsFull(runsDir)
  return runs
    .map((run) => summarizeRun(run))
    .sort((left, right) => (right.capturedAt ?? 0) - (left.capturedAt ?? 0))
}

/**
 * @param {string} runsDir
 */
async function listRunsFull(runsDir) {
  let names
  try {
    names = await readdir(runsDir)
  } catch {
    return []
  }
  const runs = []
  for (const fileName of names) {
    if (!fileName.endsWith('.json')) continue
    try {
      const raw = await readFile(join(runsDir, fileName), 'utf8')
      const run = JSON.parse(raw)
      if (RUN_ID_PATTERN.test(String(run?.id ?? ''))) runs.push(run)
    } catch {
      /* a half-written or hand-edited file must not break the library */
    }
  }
  return runs
}

/**
 * Aggregate every run into the task × variant matrix, evaluating each task's
 * checks on each of its runs. A corrupt checks file fails that task's cells
 * instead of silently dropping its gate.
 *
 * @param {string} runsDir
 * @param {string} checksDir
 */
async function readMatrix(runsDir, checksDir) {
  const runs = (await listRunsFull(runsDir)).filter(
    (run) => typeof run?.prompt === 'string' && run.prompt.trim() !== '',
  )

  const checksByTask = new Map()
  const checksErrors = new Map()
  for (const run of runs) {
    const taskKey = taskKeyOf(run.prompt)
    if (checksByTask.has(taskKey)) continue
    const loaded = await loadChecks(checksDir, taskKey)
    checksByTask.set(taskKey, loaded.checks)
    if (loaded.error !== null) checksErrors.set(taskKey, loaded.error)
  }

  const resultsByRun = new Map()
  for (const run of runs) {
    const taskKey = taskKeyOf(run.prompt)
    const evaluation = await evaluateRun({
      run,
      checks: checksByTask.get(taskKey) ?? [],
      readText: readUtf8,
      statPath: (target) => stat(target),
    })
    if (checksErrors.has(taskKey)) {
      evaluation.results.push({ type: 'checks-error', ok: false, detail: checksErrors.get(taskKey) })
      evaluation.passed = false
    }
    resultsByRun.set(run.id, evaluation)
  }

  return buildMatrix(runs, { checksByTask, checksErrors, resultsByRun })
}

/**
 * @param {string} checksDir
 * @param {string} taskKey
 */
async function loadChecks(checksDir, taskKey) {
  let raw
  try {
    raw = await readFile(join(checksDir, `${taskKey}.json`), 'utf8')
  } catch (error) {
    const missing = error?.code === 'ENOENT'
    return { checks: [], error: missing ? null : `cannot read checks: ${errorMessage(error)}` }
  }
  try {
    const parsed = JSON.parse(raw)
    const source = Array.isArray(parsed) ? parsed : parsed?.checks
    return { checks: normalizeChecks(source), error: null }
  } catch (error) {
    return { checks: [], error: errorMessage(error) }
  }
}

/**
 * @param {string} checksDir
 * @param {string} taskKey
 * @param {any[]} checks
 */
async function writeChecks(checksDir, taskKey, checks) {
  await mkdir(checksDir, { recursive: true })
  const payload = { taskKey, checks, updatedAt: Date.now() }
  await writeFile(join(checksDir, `${taskKey}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

/** @param {string} path */
function readUtf8(path) {
  return readFile(path, 'utf8')
}

/**
 * @param {string} runsDir
 * @param {string} id
 */
async function readRun(runsDir, id) {
  try {
    return JSON.parse(await readFile(join(runsDir, `${id}.json`), 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * @param {string} runsDir
 * @param {any} run
 */
async function writeRun(runsDir, run) {
  await mkdir(runsDir, { recursive: true })
  await writeFile(join(runsDir, `${run.id}.json`), `${JSON.stringify(run, null, 2)}\n`, 'utf8')
}

/**
 * @param {import('node:http').IncomingMessage} req
 */
async function readJsonBody(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('request body too large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('request body is not JSON')
  }
}

/**
 * Same-origin browser requests, or loopback callers without an Origin header.
 *
 * @param {import('node:http').IncomingMessage} req
 */
function requestAllowed(req) {
  const origin = req.headers.origin
  const host = req.headers.host
  if (typeof origin === 'string' && origin !== '') {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  return isLoopback(req)
}

/** @param {import('node:http').IncomingMessage} req */
function isLoopback(req) {
  const address = req.socket?.remoteAddress ?? ''
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1' ||
    address.startsWith('127.')
  )
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {Record<string, unknown>} body
 */
function respondJson(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

/**
 * @param {any} config
 */
function resolveStoreDir(config) {
  if (typeof config?.storeDir === 'string' && config.storeDir.trim() !== '') return config.storeDir.trim()
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  return join(home, 'agent-lab')
}

/** @param {unknown} error */
function errorMessage(error) {
  if (error instanceof Error) return error.message
  return String(error)
}
