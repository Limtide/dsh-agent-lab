/**
 * Task assertions ("checks") evaluated against one recorded run.
 *
 * A check set belongs to a task (one normalized prompt), not to a single run,
 * so the same gate applies to every run of that task. `turn-completed` is
 * always evaluated and is not part of the stored set: a partial, cancelled, or
 * failed turn can never pass a gate.
 */

import { resolve, sep } from 'node:path'

const MAX_CHECKS = 20
const MAX_TEXT = 2000
const MAX_PATH = 500
const MAX_NAME = 200
const MAX_REGEX = 2000
const DETAIL_TEXT = 60
const SANDBOX_MODES = new Set(['read-only', 'workspace-write', 'danger-full-access'])
const APPROVAL_POLICIES = new Set(['ask', 'never'])
const REGEX_FLAGS = /^[ims]*$/u

/**
 * Validate a stored check set. Throws with a human-readable message so the
 * HTTP route, the editor, and the CLI all reject the same input.
 *
 * @param {unknown} input
 * @returns {any[]}
 */
export function normalizeChecks(input) {
  if (input === undefined || input === null) return []
  if (!Array.isArray(input)) throw new Error('checks must be an array')
  if (input.length > MAX_CHECKS) throw new Error(`at most ${MAX_CHECKS} checks are allowed`)
  return input.map((check, index) => normalizeCheck(check, index))
}

/**
 * Evaluate the implicit completion rule plus every configured check.
 *
 * @param {{
 *   run: any,
 *   checks?: readonly any[],
 *   readText?: (path: string) => Promise<string>,
 *   statPath?: (path: string) => Promise<any>,
 * }} input
 */
export async function evaluateRun({ run, checks = [], readText, statPath } = {}) {
  const results = [completionResult(run)]
  for (const check of checks ?? []) {
    results.push(await evaluateCheck(check, run, readText, statPath))
  }
  return { passed: results.every((result) => result.ok === true), results }
}

/**
 * The workspace a run's file checks read. A replay owns its copy; an imported
 * run falls back to the session directory as it is now.
 *
 * @param {any} run
 */
export function workspaceOf(run) {
  const copy = run?.replay?.workspace?.dir
  if (typeof copy === 'string' && copy !== '') return copy
  const cwd = run?.session?.cwd
  return typeof cwd === 'string' && cwd !== '' ? cwd : undefined
}

/** @param {any} check @param {number} index */
function normalizeCheck(check, index) {
  const where = `check ${index + 1}`
  if (check === null || typeof check !== 'object' || Array.isArray(check)) {
    throw new Error(`${where}: expected an object`)
  }
  switch (check.type) {
    case 'no-tool':
      return { type: 'no-tool' }
    case 'tool-called':
    case 'tool-not-called':
      return { type: check.type, name: requireText(check.name, `${where}: name`, MAX_NAME) }
    case 'tool-args-contains': {
      const name = requireText(check.name, `${where}: name`, MAX_NAME)
      const text = requireText(check.text, `${where}: text`, MAX_TEXT)
      const key = typeof check.key === 'string' && check.key.trim() !== '' ? check.key.trim() : undefined
      if (key !== undefined && key.length > MAX_NAME) {
        throw new Error(`${where}: key is longer than ${MAX_NAME} characters`)
      }
      return key === undefined
        ? { type: 'tool-args-contains', name, text }
        : { type: 'tool-args-contains', name, text, key }
    }
    case 'sandbox-mode-is': {
      const mode = requireText(check.mode, `${where}: mode`, 40)
      if (!SANDBOX_MODES.has(mode)) {
        throw new Error(`${where}: mode must be read-only, workspace-write, or danger-full-access`)
      }
      return { type: 'sandbox-mode-is', mode }
    }
    case 'approval-policy-is': {
      const policy = requireText(check.policy, `${where}: policy`, 20)
      if (!APPROVAL_POLICIES.has(policy)) throw new Error(`${where}: policy must be ask or never`)
      return { type: 'approval-policy-is', policy }
    }
    case 'file-exists':
    case 'file-not-exists':
      return { type: check.type, path: requireText(check.path, `${where}: path`, MAX_PATH) }
    case 'file-contains':
      return {
        type: 'file-contains',
        path: requireText(check.path, `${where}: path`, MAX_PATH),
        text: requireText(check.text, `${where}: text`, MAX_TEXT),
      }
    case 'final-contains':
      return { type: 'final-contains', text: requireText(check.text, `${where}: text`, MAX_TEXT) }
    case 'final-regex': {
      const pattern = requireText(check.pattern, `${where}: pattern`, MAX_REGEX)
      const flags = typeof check.flags === 'string' ? check.flags.trim() : ''
      if (!REGEX_FLAGS.test(flags)) throw new Error(`${where}: flags may only contain i, m, s`)
      compileRegex(pattern, flags, where)
      return { type: 'final-regex', pattern, flags }
    }
    case 'max-tool-calls':
    case 'max-failures':
      return { type: check.type, max: requireCount(check.max, `${where}: max`) }
    case 'max-total-tokens':
      return { type: 'max-total-tokens', max: requireCount(check.max, `${where}: max`) }
    default:
      throw new Error(`${where}: unknown type "${String(check.type)}"`)
  }
}

/** @param {unknown} value @param {string} where @param {number} limit */
function requireText(value, where, limit) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') throw new Error(`${where} is required`)
  if (text.length > limit) throw new Error(`${where} is longer than ${limit} characters`)
  return text
}

/** @param {unknown} value @param {string} where */
function requireCount(value, where) {
  const count = typeof value === 'number' ? value : Number.NaN
  if (!Number.isSafeInteger(count) || count < 0) throw new Error(`${where} must be a non-negative integer`)
  return count
}

/**
 * @param {string} pattern
 * @param {string} flags
 * @param {string} where
 */
function compileRegex(pattern, flags, where = 'pattern') {
  try {
    return new RegExp(pattern, flags)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${where}: invalid regular expression (${message})`)
  }
}

/** @param {any} run */
function completionResult(run) {
  const reason = lastTurnReason(run)
  return {
    type: 'turn-completed',
    ok: reason === 'completed',
    detail: reason === null ? 'no turn was recorded' : `last turn: ${reason}`,
  }
}

/** @param {any} run */
function lastTurnReason(run) {
  const turns = Array.isArray(run?.turns) ? run.turns : []
  const last = turns[turns.length - 1]
  return typeof last?.reason === 'string' ? last.reason : null
}

/**
 * @param {any} check
 * @param {any} run
 * @param {((path: string) => Promise<string>) | undefined} readText
 * @param {((path: string) => Promise<any>) | undefined} statPath
 */
async function evaluateCheck(check, run, readText, statPath) {
  switch (check?.type) {
    case 'no-tool': {
      const calls = countOf(run?.stats?.toolCalls)
      return { type: 'no-tool', ok: calls === 0, detail: plural(calls, 'tool call') }
    }
    case 'tool-called': {
      const count = countCalls(run, check.name)
      return { type: 'tool-called', ok: count > 0, detail: `${plural(count, 'call')} to ${check.name}` }
    }
    case 'tool-not-called': {
      const count = countCalls(run, check.name)
      return { type: 'tool-not-called', ok: count === 0, detail: `${plural(count, 'call')} to ${check.name}` }
    }
    case 'tool-args-contains': {
      const calls = traceOf(run).filter((call) => String(call?.name ?? '') === check.name)
      if (calls.length === 0) {
        return { type: 'tool-args-contains', ok: false, detail: `no call to ${check.name}` }
      }
      const found = calls.some((call) => argumentText(call, check.key).includes(check.text))
      const where = check.key === undefined ? 'arguments' : `argument "${check.key}"`
      return {
        type: 'tool-args-contains',
        ok: found,
        detail: `${check.name} ${where} ${found ? 'contain' : 'do not contain'} "${clip(check.text)}"`,
      }
    }
    case 'sandbox-mode-is': {
      const actual = textOrNull(run?.config?.sandboxMode)
      return {
        type: 'sandbox-mode-is',
        ok: actual === check.mode,
        detail: `sandbox: ${actual ?? 'unrecorded'} (expected ${check.mode})`,
      }
    }
    case 'approval-policy-is': {
      const actual = textOrNull(run?.config?.approvalPolicy)
      return {
        type: 'approval-policy-is',
        ok: actual === check.policy,
        detail: `approval: ${actual ?? 'unrecorded'} (expected ${check.policy})`,
      }
    }
    case 'max-tool-calls': {
      const calls = countOf(run?.stats?.toolCalls)
      return { type: 'max-tool-calls', ok: calls <= check.max, detail: `${plural(calls, 'tool call')} (max ${check.max})` }
    }
    case 'max-total-tokens': {
      const tokens = countOf(run?.stats?.inputTokens) + countOf(run?.stats?.outputTokens)
      return { type: 'max-total-tokens', ok: tokens <= check.max, detail: `${tokens} tokens (max ${check.max})` }
    }
    case 'max-failures': {
      const failures = countOf(run?.stats?.failures)
      return { type: 'max-failures', ok: failures <= check.max, detail: `${plural(failures, 'failed call')} (max ${check.max})` }
    }
    case 'final-contains': {
      const text = typeof run?.finalText === 'string' ? run.finalText : ''
      const ok = text.includes(check.text)
      return {
        type: 'final-contains',
        ok,
        detail: `final reply ${ok ? 'contains' : 'does not contain'} "${clip(check.text)}"`,
      }
    }
    case 'final-regex': {
      const text = typeof run?.finalText === 'string' ? run.finalText : ''
      const regex = compileRegex(check.pattern, check.flags)
      const ok = regex.test(text)
      return {
        type: 'final-regex',
        ok,
        detail: `final reply ${ok ? 'matches' : 'does not match'} /${clip(check.pattern)}/${check.flags}`,
      }
    }
    case 'file-contains':
      return evaluateFileContains(check, run, readText)
    case 'file-exists':
    case 'file-not-exists':
      return evaluateFilePresence(check, run, statPath)
    default:
      return { type: String(check?.type), ok: false, detail: 'unknown check type' }
  }
}

/** @param {any} check @param {any} run @param {((path: string) => Promise<string>) | undefined} readText */
async function evaluateFileContains(check, run, readText) {
  const target = resolveCheckPath(check.path, run, 'file-contains')
  if (target.ok === false) return target.result
  if (typeof readText !== 'function') {
    return { type: 'file-contains', ok: false, detail: 'file reading is unavailable' }
  }
  let text
  try {
    text = String(await readText(target.path))
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'read failed'
    return { type: 'file-contains', ok: false, detail: `cannot read ${check.path}: ${code}` }
  }
  const ok = text.includes(check.text)
  return {
    type: 'file-contains',
    ok,
    detail: `${check.path} ${ok ? 'contains' : 'does not contain'} "${clip(check.text)}"`,
  }
}

/**
 * @param {any} check
 * @param {any} run
 * @param {((path: string) => Promise<any>) | undefined} statPath
 */
async function evaluateFilePresence(check, run, statPath) {
  const target = resolveCheckPath(check.path, run, check.type)
  if (target.ok === false) return target.result
  if (typeof statPath !== 'function') {
    return { type: check.type, ok: false, detail: 'file metadata is unavailable' }
  }

  let exists
  try {
    const info = await statPath(target.path)
    exists = info !== undefined && info !== null
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : undefined
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      exists = false
    } else {
      return { type: check.type, ok: false, detail: `cannot stat ${check.path}: ${code ?? 'error'}` }
    }
  }

  const ok = check.type === 'file-exists' ? exists : !exists
  return { type: check.type, ok, detail: `${check.path} ${exists ? 'exists' : 'does not exist'}` }
}

/**
 * @param {string} path
 * @param {any} run
 * @param {string} type
 */
function resolveCheckPath(path, run, type) {
  const root = workspaceOf(run)
  if (root === undefined) {
    return { ok: false, result: { type, ok: false, detail: 'the run has no workspace' } }
  }
  const target = resolveInside(root, String(path ?? ''))
  if (target === undefined) {
    return { ok: false, result: { type, ok: false, detail: `path escapes the workspace: ${path}` } }
  }
  return { ok: true, path: target }
}

/** @param {any} run */
function traceOf(run) {
  return Array.isArray(run?.trace) ? run.trace : []
}

/** @param {any} run @param {string} name */
function countCalls(run, name) {
  return traceOf(run).filter((call) => String(call?.name ?? '') === name).length
}

/** @param {any} call @param {string | undefined} key */
function argumentText(call, key) {
  if (key === undefined) {
    return typeof call?.argsRaw === 'string' ? call.argsRaw : JSON.stringify(call?.args ?? null)
  }
  const value = call?.args?.[key]
  return typeof value === 'string' ? value : JSON.stringify(value ?? null)
}

/** @param {string} root @param {string} relative */
function resolveInside(root, relative) {
  if (relative === '') return undefined
  const base = resolve(root)
  const target = resolve(base, relative)
  if (target === base) return undefined
  const prefix = base.endsWith(sep) ? base : `${base}${sep}`
  return target.toLowerCase().startsWith(prefix.toLowerCase()) ? target : undefined
}

/** @param {unknown} value */
function countOf(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

/** @param {unknown} value */
function textOrNull(value) {
  return typeof value === 'string' && value !== '' ? value : null
}

/** @param {number} count @param {string} noun */
function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** @param {string} text */
function clip(text) {
  const flat = String(text).replace(/\s+/gu, ' ')
  return flat.length > DETAIL_TEXT ? `${flat.slice(0, DETAIL_TEXT)}…` : flat
}
