/**
 * Replay planning and progress helpers.
 *
 * A replay re-runs one task in an isolated copy of the baseline workspace and
 * turns the new session log into another run. Only the task prompt and the
 * model route may differ; everything else comes from the same profile.
 */

export const MAX_PROMPT_CHARS = 100_000

/**
 * Validate a replay request against its baseline run.
 *
 * @param {any} baseRun
 * @param {any} request
 */
export function planReplay(baseRun, request = {}) {
  const prompt = typeof request?.prompt === 'string' ? request.prompt : (baseRun?.prompt ?? '')
  if (prompt.trim() === '') throw new Error('a replay needs a task prompt')
  if (prompt.length > MAX_PROMPT_CHARS) throw new Error('the task prompt is too long')

  const baseConfig = baseRun?.config ?? {}
  const provider = stringOr(request?.provider, baseConfig.provider)
  const model = stringOr(request?.model, baseConfig.model)
  if (provider === '' || model === '') throw new Error('a replay needs a provider and model')

  const requestedEffort = stringOr(request?.reasoningEffort, '')
  const baseEffort = stringOr(baseConfig.reasoningEffort, '')
  const reasoningEffort = requestedEffort !== '' ? requestedEffort : baseEffort

  return {
    prompt,
    provider,
    model,
    reasoningEffort: reasoningEffort === '' ? undefined : reasoningEffort,
    promptEdited: normalizePrompt(prompt) !== normalizePrompt(baseRun?.prompt ?? ''),
  }
}

/**
 * The turn this replay is waiting for: the first `turn/end` after the seq the
 * prompt admission started at. Earlier turns in a reused session are ignored.
 *
 * @param {readonly any[]} events
 * @param {number} fromSeq
 */
export function firstTurnEndAfter(events, fromSeq) {
  for (const event of events ?? []) {
    if (typeof event?.seq !== 'number' || event.seq <= fromSeq) continue
    if (event.type === 'turn/end') return event
  }
  return undefined
}

/**
 * Cheap live counters for the replay dialog.
 *
 * @param {readonly any[]} events
 * @param {number} fromSeq
 */
export function replayProgress(events, fromSeq) {
  let toolCalls = 0
  let steps = 0
  let turn = null
  let step = null
  for (const event of events ?? []) {
    if (typeof event?.seq !== 'number' || event.seq <= fromSeq) continue
    if (event.type === 'tool/call') {
      toolCalls += 1
    } else if (event.type === 'assistant/message') {
      steps += 1
    } else if (event.type === 'turn/start') {
      turn = Number(event.data?.turn)
    } else if (event.type === 'step/start') {
      step = Number(event.data?.step)
    }
  }
  return { toolCalls, steps, turn, step }
}

/** @param {unknown} reason */
export function turnReasonOf(reason) {
  return typeof reason?.kind === 'string' ? reason.kind : null
}

/** @param {unknown} value @param {string} fallback */
function stringOr(value, fallback) {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  return typeof fallback === 'string' ? fallback.trim() : ''
}

/** @param {string} text */
function normalizePrompt(text) {
  return String(text).replace(/\r\n/gu, '\n').replace(/\r/gu, '\n').trim()
}
