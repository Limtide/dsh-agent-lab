/**
 * Turn a session event log into one comparable "run" record.
 *
 * A run keeps only what behavior comparison needs: the task prompt, the
 * configuration fingerprint of the model request, the ordered tool calls with
 * their arguments and results, per-step timing, and token usage. Large tool
 * results are truncated; nothing here changes the session log.
 */

import { createHash } from 'node:crypto'

export const RUN_SCHEMA_VERSION = 2

const RESULT_LIMIT = 2000
const ASSISTANT_LIMIT = 4000
const ARGS_LIMIT = 4000

/**
 * @param {{
 *   sessionId: string,
 *   header: { createdAt?: number, cwd?: string, agentPreset?: string, origin?: string },
 *   events: readonly any[],
 *   isLive?: boolean,
 *   capturedAt?: number,
 * }} input
 */
export function buildRun({ sessionId, header, events, isLive = false, capturedAt = Date.now() }) {
  const ordered = events
    .filter((event) => typeof event?.seq === 'number' && Number.isFinite(event.seq))
    .sort((left, right) => left.seq - right.seq)

  const toolCalls = new Map()
  const trace = []
  const assistantSteps = []
  const userTexts = []
  let title = ''
  let provider = ''
  let model = ''
  let reasoningEffort
  let temperature
  let maxTokens
  let contextWindow
  let toolSchemas
  let systemPrompt = ''
  let permissionPreset
  let sandboxMode
  let approvalPolicy
  const turns = []
  const stepTimes = new Map()
  let activeMs = 0
  const usage = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cacheReadTokens: 0 }

  for (const event of ordered) {
    const data = event.data ?? {}
    switch (event.type) {
      case 'session/title':
        if (typeof data.title === 'string' && data.title.trim() !== '') title = data.title.trim()
        break
      case 'user/message': {
        // Only what a person (or a steering gesture) actually said. DSH also
        // stores runtime context, the skill catalog, and time snapshots as
        // user-role messages; those are infrastructure, not the task.
        const sourceKind = data.source?.kind
        if (typeof sourceKind === 'string' && sourceKind !== 'user') break
        const text = textOf(data.content).trim()
        if (text === '' || isRuntimeContext(text)) break
        userTexts.push(text)
        break
      }
      case 'system/message': {
        const text = textOf(data.message?.content)
        if (text !== '' && systemPrompt === '') systemPrompt = text
        break
      }
      case 'request/header': {
        const config = data.header?.config ?? {}
        if (provider === '' && typeof config.provider === 'string') provider = config.provider
        if (model === '' && typeof config.model === 'string') model = config.model
        if (reasoningEffort === undefined && config.reasoningEffort !== undefined) reasoningEffort = config.reasoningEffort
        if (temperature === undefined && typeof config.temperature === 'number') temperature = config.temperature
        if (maxTokens === undefined && typeof config.maxTokens === 'number') maxTokens = config.maxTokens
        if (toolSchemas === undefined && Array.isArray(data.header?.tools)) toolSchemas = data.header.tools
        break
      }
      case 'request/context': {
        if (contextWindow === undefined && typeof data.contextWindow === 'number') contextWindow = data.contextWindow
        break
      }
      case 'permission/preset':
        if (typeof data.preset === 'string') permissionPreset = data.preset
        break
      case 'sandbox/mode':
        if (typeof data.mode === 'string') sandboxMode = data.mode
        break
      case 'approval/policy':
        if (typeof data.policy === 'string') approvalPolicy = data.policy
        break
      case 'step/start':
        stepTimes.set(`${data.turn}.${data.step}`, { start: event.time, end: undefined })
        break
      case 'step/end': {
        const entry = stepTimes.get(`${data.turn}.${data.step}`)
        if (entry !== undefined) {
          entry.end = event.time
          activeMs += Math.max(0, event.time - entry.start)
        }
        break
      }
      case 'assistant/message': {
        const message = data.message ?? {}
        const source = message.source ?? {}
        const text = textOf(message.content)
        const reasoning = textOf(message.content, 'reasoning')
        assistantSteps.push({
          turn: Number(data.turn),
          step: Number(data.step),
          time: event.time,
          text: truncate(text, ASSISTANT_LIMIT),
          textChars: text.length,
          reasoningChars: reasoning.length,
          usage: data.usage,
        })
        if (data.usage !== undefined) {
          usage.inputTokens += numberOr(data.usage.inputTokens)
          usage.outputTokens += numberOr(data.usage.outputTokens)
          usage.reasoningTokens += numberOr(data.usage.reasoningTokens)
          usage.cacheReadTokens += numberOr(data.usage.cacheReadTokens)
        }
        if (model === '' && typeof source.model === 'string') model = source.model
        if (provider === '' && typeof source.provider === 'string') provider = source.provider
        break
      }
      case 'tool/call': {
        const call = {
          index: trace.length,
          turn: Number(data.turn),
          step: Number(data.step),
          callId: String(data.callId),
          name: String(data.name),
          args: parseArguments(data.arguments),
          argsRaw: truncate(String(data.arguments ?? ''), ARGS_LIMIT),
          startedAt: event.time,
          durationMs: undefined,
          resultText: undefined,
          resultChars: 0,
          isError: false,
          errorCode: undefined,
        }
        trace.push(call)
        toolCalls.set(call.callId, call)
        break
      }
      case 'tool/result': {
        const call = toolCalls.get(String(data.toolCallId ?? data.message?.toolCallId))
        const text = textOf(data.message?.content)
        if (call !== undefined) {
          call.resultText = truncate(text, RESULT_LIMIT)
          call.resultChars = text.length
          call.isError = data.message?.isError === true || data.error !== undefined
          call.errorCode = data.error?.code
          call.durationMs = Math.max(0, event.time - call.startedAt)
        }
        break
      }
      case 'turn/end':
        turns.push({
          turn: Number(data.turn),
          reason: typeof data.reason?.kind === 'string' ? data.reason.kind : 'unknown',
          endedAt: event.time,
        })
        break
      default:
        break
    }
  }

  const firstTime = ordered.length > 0 ? ordered[0].time : (header?.createdAt ?? capturedAt)
  const lastTime = ordered.length > 0 ? ordered[ordered.length - 1].time : capturedAt
  const toolHistogram = {}
  let toolMs = 0
  let timedCalls = 0
  let resultChars = 0
  let failures = 0
  for (const call of trace) {
    toolHistogram[call.name] = (toolHistogram[call.name] ?? 0) + 1
    resultChars += call.resultChars
    if (call.isError) failures += 1
    if (typeof call.durationMs === 'number') {
      toolMs += call.durationMs
      timedCalls += 1
    }
  }

  const finalAssistant = assistantSteps.length > 0 ? assistantSteps[assistantSteps.length - 1] : undefined
  const assistantChars = assistantSteps.reduce((sum, step) => sum + step.textChars, 0)
  const reasoningChars = assistantSteps.reduce((sum, step) => sum + step.reasoningChars, 0)
  const prompt = userTexts.join('\n\n---\n\n')
  const label = title !== '' ? title : firstLine(prompt)

  return {
    schemaVersion: RUN_SCHEMA_VERSION,
    capturedAt,
    title: label,
    prompt,
    finalText: finalAssistant?.text ?? '',
    session: {
      sessionId,
      cwd: typeof header?.cwd === 'string' ? header.cwd : undefined,
      createdAt: typeof header?.createdAt === 'number' ? header.createdAt : firstTime,
      agentPreset: header?.agentPreset,
      isLive,
      eventCount: ordered.length,
    },
    config: {
      provider,
      model,
      reasoningEffort,
      temperature,
      maxTokens,
      contextWindow,
      toolCount: Array.isArray(toolSchemas) ? toolSchemas.length : 0,
      toolNames: Array.isArray(toolSchemas) ? toolSchemas.map((tool) => String(tool?.name ?? '')).sort() : [],
      toolsHash: hashTools(toolSchemas),
      systemPromptHash: systemPrompt === '' ? undefined : sha256(systemPrompt),
      systemPromptChars: systemPrompt.length,
      permissionPreset,
      sandboxMode,
      approvalPolicy,
      agentPreset: header?.agentPreset,
      cwd: typeof header?.cwd === 'string' ? header.cwd : undefined,
    },
    stats: {
      toolCalls: trace.length,
      failures,
      steps: assistantSteps.length,
      turns: turns.length,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      reasoningTokens: usage.reasoningTokens,
      cacheReadTokens: usage.cacheReadTokens,
      // Active processing time, not wall-clock span: a session resumed days
      // later must not read as "51 hours of work".
      durationMs: activeMs > 0 ? activeMs : Math.max(0, lastTime - firstTime),
      wallMs: Math.max(0, lastTime - firstTime),
      resultChars,
      assistantChars,
      reasoningChars,
      uniqueTools: Object.keys(toolHistogram).length,
      avgToolMs: timedCalls === 0 ? 0 : Math.round(toolMs / timedCalls),
      toolHistogram,
    },
    trace,
    turns,
  }
}

/** Summary shape used by the library list. */
export function summarizeRun(run) {
  return {
    id: run.id,
    title: run.title,
    prompt: truncate(run.prompt, 240),
    model: run.config?.model ?? '',
    provider: run.config?.provider ?? '',
    reasoningEffort: run.config?.reasoningEffort,
    capturedAt: run.capturedAt,
    sessionId: run.session?.sessionId,
    cwd: run.session?.cwd,
    isLive: run.session?.isLive === true,
    replay:
      run.replay === undefined
        ? undefined
        : {
            baseRunId: run.replay.baseRunId,
            baseTitle: run.replay.baseTitle,
            status: run.replay.status,
          },
    stats: {
      toolCalls: run.stats?.toolCalls ?? 0,
      failures: run.stats?.failures ?? 0,
      steps: run.stats?.steps ?? 0,
      inputTokens: run.stats?.inputTokens ?? 0,
      outputTokens: run.stats?.outputTokens ?? 0,
      durationMs: run.stats?.durationMs ?? 0,
    },
  }
}

/** @param {any[] | undefined} tools */
function hashTools(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return undefined
  const canonical = tools
    .map((tool) => [String(tool?.name ?? ''), String(tool?.description ?? ''), tool?.parameters ?? null])
    .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
  return sha256(JSON.stringify(canonical))
}

/** @param {string} text */
function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/** @param {any} content @param {'text' | 'reasoning'} [blockType] */
function textOf(content, blockType = 'text') {
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const block of content) {
    if (block?.type === blockType && typeof block.text === 'string') text += block.text
  }
  return text
}

/** @param {string} raw */
function parseArguments(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  try {
    const parsed = JSON.parse(trimmed)
    return parsed !== null && typeof parsed === 'object' ? parsed : { value: parsed }
  } catch {
    return null
  }
}

/** @param {string} text */
function isRuntimeContext(text) {
  return (
    text.startsWith('Current runtime context.') ||
    text.startsWith('<system-reminder>') ||
    text.startsWith('<available_skills>') ||
    text.includes('Tokens prefixed with @ are paths the user explicitly referenced')
  )
}

/** @param {string} text */
export function firstLine(text) {
  const line = (text.split('\n').find((candidate) => candidate.trim() !== '') ?? '').trim()
  return truncate(line.replace(/^[#>*\-\s]+/u, ''), 90)
}

/** @param {string} text */
export function truncate(text, limit) {
  if (typeof text !== 'string') return ''
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}\n… (${text.length - limit} more characters)`
}

/** @param {unknown} value */
function numberOr(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
