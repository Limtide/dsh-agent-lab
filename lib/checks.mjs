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
const DETAIL_TEXT = 60

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
 * @param {{ run: any, checks?: readonly any[], readText?: (path: string) => Promise<string> }} input
 */
export async function evaluateRun({ run, checks = [], readText } = {}) {
  const results = [completionResult(run)]
  for (const check of checks ?? []) {
    results.push(await evaluateCheck(check, run, readText))
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
    case 'file-contains':
      return {
        type: 'file-contains',
        path: requireText(check.path, `${where}: path`, MAX_PATH),
        text: requireText(check.text, `${where}: text`, MAX_TEXT),
      }
    case 'final-contains':
      return { type: 'final-contains', text: requireText(check.text, `${where}: text`, MAX_TEXT) }
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

/** @param {any} check @param {any} run @param {((path: string) => Promise<string>) | undefined} readText */
async function evaluateCheck(check, run, readText) {
  switch (check?.type) {
    case 'no-tool': {
      const calls = countOf(run?.stats?.toolCalls)
      return { type: 'no-tool', ok: calls === 0, detail: plural(calls, 'tool call') }
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
    case 'file-contains':
      return evaluateFileContains(check, run, readText)
    default:
      return { type: String(check?.type), ok: false, detail: 'unknown check type' }
  }
}

/** @param {any} check @param {any} run @param {((path: string) => Promise<string>) | undefined} readText */
async function evaluateFileContains(check, run, readText) {
  const root = workspaceOf(run)
  if (root === undefined) {
    return { type: 'file-contains', ok: false, detail: 'the run has no workspace' }
  }
  const target = resolveInside(root, String(check.path ?? ''))
  if (target === undefined) {
    return { type: 'file-contains', ok: false, detail: `path escapes the workspace: ${check.path}` }
  }
  if (typeof readText !== 'function') {
    return { type: 'file-contains', ok: false, detail: 'file reading is unavailable' }
  }
  let text
  try {
    text = String(await readText(target))
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

/** @param {number} count @param {string} noun */
function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** @param {string} text */
function clip(text) {
  const flat = String(text).replace(/\s+/gu, ' ')
  return flat.length > DETAIL_TEXT ? `${flat.slice(0, DETAIL_TEXT)}…` : flat
}
