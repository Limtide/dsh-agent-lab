/**
 * dsh-agent-lab — Agent behavior regression lab.
 *
 * The Host half records a Session log as a comparable "run", keeps runs as
 * plain JSON files, and compares two of them. A small same-origin JSON API
 * feeds the browser page; the page itself is a Client slot plugin.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { buildRun, summarizeRun } from './lib/capture.mjs'
import { compareRuns } from './lib/compare.mjs'

export const name = 'agent-lab'

const ROUTE_PREFIX = '/agent-lab'
const MAX_BODY_BYTES = 256 * 1024
const MAX_EVENTS = 200000
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/u
const RUN_ID_PATTERN = /^run-[A-Za-z0-9-]{4,80}$/u

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ storeDir?: string }} [config]
 */
export function apply(ctx, config = {}) {
  const storeDir = resolveStoreDir(config)
  const runsDir = join(storeDir, 'runs')

  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.webServer
    const handler = createHandler(webCtx, { runsDir })

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
 * @param {{ runsDir: string }} options
 */
function createHandler(webCtx, { runsDir }) {
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

      respondJson(res, 404, { ok: false, error: 'not found' })
    } catch (error) {
      respondJson(res, 500, { ok: false, error: errorMessage(error) })
    }
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
      if (RUN_ID_PATTERN.test(String(run?.id ?? ''))) runs.push(summarizeRun(run))
    } catch {
      /* a half-written or hand-edited file must not break the library */
    }
  }
  return runs.sort((left, right) => (right.capturedAt ?? 0) - (left.capturedAt ?? 0))
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
