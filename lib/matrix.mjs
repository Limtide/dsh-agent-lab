/**
 * Group recorded runs into the v0.3 variant matrix.
 *
 * A row is a task (one normalized prompt); a column is a variant (provider,
 * model, and reasoning effort); a cell aggregates every run recorded for that
 * pair. Checks belong to the task, so a cell's pass rate always means "runs of
 * this task that satisfied this task's gate".
 */

import { createHash } from 'node:crypto'

/**
 * @param {string} prompt
 */
export function normalizePrompt(prompt) {
  return String(prompt ?? '')
    .replace(/\r\n/gu, '\n')
    .replace(/\r/gu, '\n')
    .trim()
}

/**
 * @param {string} prompt
 */
export function taskKeyOf(prompt) {
  const digest = createHash('sha256').update(normalizePrompt(prompt), 'utf8').digest('hex')
  return `task-${digest.slice(0, 12)}`
}

/**
 * @param {any} config
 */
export function variantOf(config) {
  const provider = textOr(config?.provider, 'unknown')
  const model = textOr(config?.model, 'unknown')
  const effort = textOr(config?.reasoningEffort, '')
  return {
    key: `${provider}/${model}@${effort === '' ? 'default' : effort}`,
    provider,
    model,
    effort: effort === '' ? null : effort,
    label: effort === '' ? `${model} · ${provider}` : `${model} @ ${effort} · ${provider}`,
  }
}

/**
 * @param {readonly any[]} runs
 * @param {{
 *   checksByTask?: Map<string, any[]> | Record<string, any[]>,
 *   checksErrors?: Map<string, string> | Record<string, string>,
 *   resultsByRun?: Map<string, { passed: boolean, results: any[] }>,
 * }} [options]
 */
export function buildMatrix(runs, options = {}) {
  const { checksByTask = {}, checksErrors = {}, resultsByRun = new Map() } = options
  const columns = new Map()
  const tasks = new Map()

  for (const run of Array.isArray(runs) ? runs : []) {
    const prompt = typeof run?.prompt === 'string' ? run.prompt : ''
    if (normalizePrompt(prompt) === '') continue

    const taskKey = taskKeyOf(prompt)
    const variant = variantOf(run?.config)
    const capturedAt = numberOr(run?.capturedAt)
    columns.set(variant.key, variant)

    let task = tasks.get(taskKey)
    if (task === undefined) {
      task = {
        key: taskKey,
        title: taskTitle(prompt),
        prompt,
        checks: lookup(checksByTask, taskKey) ?? [],
        checksError: lookup(checksErrors, taskKey) ?? null,
        cells: {},
        latestCapturedAt: 0,
        latestRunSource: null,
        importedCapturedAt: 0,
        importedSource: null,
      }
      tasks.set(taskKey, task)
    }

    const evaluation = resultsByRun.get(String(run?.id))
    const entry = {
      id: String(run?.id ?? ''),
      title: typeof run?.title === 'string' ? run.title : task.title,
      capturedAt,
      passed: evaluation?.passed === true,
      results: Array.isArray(evaluation?.results) ? evaluation.results : [],
      toolCalls: numberOr(run?.stats?.toolCalls),
      tokens: numberOr(run?.stats?.inputTokens) + numberOr(run?.stats?.outputTokens),
      failures: numberOr(run?.stats?.failures),
      durationMs: numberOr(run?.stats?.durationMs),
    }

    let cell = task.cells[variant.key]
    if (cell === undefined) {
      cell = { key: variant.key, runs: [] }
      task.cells[variant.key] = cell
    }
    cell.runs.push(entry)

    if (capturedAt >= task.latestCapturedAt) {
      task.latestCapturedAt = capturedAt
      task.latestRunSource = run
    }
    if (run?.replay === undefined && capturedAt >= task.importedCapturedAt) {
      task.importedCapturedAt = capturedAt
      task.importedSource = run
    }
  }

  for (const task of tasks.values()) {
    for (const cell of Object.values(task.cells)) {
      cell.runs.sort((left, right) => right.capturedAt - left.capturedAt)
      cell.total = cell.runs.length
      cell.passCount = cell.runs.filter((run) => run.passed).length
      cell.avgToolCalls = round1(cell.runs.reduce((sum, run) => sum + run.toolCalls, 0) / cell.total)
      cell.avgTokens = round1(cell.runs.reduce((sum, run) => sum + run.tokens, 0) / cell.total)
      cell.latest = cell.runs[0]
    }
    // A cell replay starts from the project a person recorded, not from another
    // replay's throwaway copy; a task known only from replays uses the newest.
    task.replayBase = replayBaseOf(task.importedSource ?? task.latestRunSource, task.prompt)
    delete task.latestRunSource
    delete task.importedSource
    delete task.importedCapturedAt
  }

  return {
    columns: [...columns.values()].sort((left, right) => left.label.localeCompare(right.label)),
    tasks: [...tasks.values()].sort((left, right) => right.latestCapturedAt - left.latestCapturedAt),
  }
}

/** @param {any} run @param {string} prompt */
function replayBaseOf(run, prompt) {
  return {
    id: String(run?.id ?? ''),
    title: typeof run?.title === 'string' ? run.title : '',
    prompt,
    config: {
      provider: run?.config?.provider ?? '',
      model: run?.config?.model ?? '',
      reasoningEffort: run?.config?.reasoningEffort ?? null,
      agentPreset: run?.config?.agentPreset ?? null,
    },
    session: { cwd: run?.session?.cwd ?? null },
  }
}

/** @param {string} prompt */
function taskTitle(prompt) {
  const line = String(prompt)
    .split('\n')
    .find((candidate) => candidate.trim() !== '')
  const flat = (line ?? '').trim().replace(/^[#>*\-\s]+/u, '')
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat
}

/** @param {any} source @param {string} key */
function lookup(source, key) {
  if (source instanceof Map) return source.get(key)
  return source?.[key]
}

/** @param {unknown} value @param {string} fallback */
function textOr(value, fallback) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

/** @param {unknown} value */
function numberOr(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

/** @param {number} value */
function round1(value) {
  return Math.round(value * 10) / 10
}
