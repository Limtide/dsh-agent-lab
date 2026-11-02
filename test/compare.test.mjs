import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRun } from '../lib/capture.mjs'
import { compareRuns } from '../lib/compare.mjs'

let seq = 0

/** @param {string} type @param {any} data @param {number} time */
function event(type, data, time) {
  return { type, seq: seq++, time, data, ...surfaceOf(type) }
}

function surfaceOf(type) {
  if (type === 'user/message') return { surfaceOp: 'append' }
  if (type === 'tool/result' || type === 'assistant/message') return { surfaceOp: 'append' }
  return {}
}

const HEADER = {
  createdAt: 1_000,
  cwd: 'C:\\work\\repo',
  agentPreset: 'standard',
  isSeeded: false,
}

/** @param {{calls: Array<[string, any, boolean]>, prompt?: string}} spec */
function session(spec) {
  seq = 0
  const events = [event('user/message', { role: 'user', content: [{ type: 'text', text: spec.prompt ?? 'fix the bug' }] }, 1_100)]
  for (const [index, [name, args, isError]] of spec.calls.entries()) {
    const callId = `call-${index}`
    const turn = 1
    const step = index + 1
    events.push(event('step/start', { turn, step }, 2_000 + index * 100))
    events.push(event('assistant/message', {
      turn,
      step,
      message: {
        role: 'assistant',
        content: [
          { type: 'reasoning', text: `thinking about step ${step}` },
          { type: 'text', text: `step ${step}` },
        ],
        source: { kind: 'model', provider: 'deepseek-account', model: 'deepseek-flash' },
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    }, 2_010 + index * 100))
    events.push(event('tool/call', { turn, step, callId, name, arguments: JSON.stringify(args) }, 2_020 + index * 100))
    events.push(event('tool/result', {
      turn,
      step,
      message: {
        role: 'tool',
        toolCallId: callId,
        source: { kind: 'tool', callId },
        content: [{ type: 'text', text: isError ? `error: ${name} failed` : `${name} ok` }],
        isError,
      },
    }, 2_050 + index * 100))
    events.push(event('step/end', { turn, step }, 2_060 + index * 100))
  }
  events.push(event('turn/end', { turn: 1, reason: { kind: 'completed' } }, 9_000))
  return buildRun({ sessionId: 'session-test', header: HEADER, events, capturedAt: 9_000 })
}

test('identical traces score 100', () => {
  const spec = { calls: [['read', { path: 'src/a.ts' }, false], ['edit', { path: 'src/a.ts', text: 'x' }, false]] }
  const diff = compareRuns(session(spec), session(spec))
  assert.equal(diff.score, 100)
  assert.equal(diff.counts.same, 2)
  assert.equal(diff.counts.onlyA + diff.counts.onlyB, 0)
})

test('an extra call is reported as onlyB without shifting earlier pairs', () => {
  const base = session({ calls: [['read', { path: 'a' }, false], ['edit', { path: 'a', text: 'x' }, false]] })
  const candidate = session({
    calls: [['read', { path: 'a' }, false], ['grep', { pattern: 'x' }, false], ['edit', { path: 'a', text: 'x' }, false]],
  })
  const diff = compareRuns(base, candidate)
  assert.equal(diff.counts.onlyB, 1)
  assert.equal(diff.counts.same, 2)
  assert.deepEqual(diff.aligned.map((row) => row.status), ['same', 'onlyB', 'same'])
})

test('argument drift keeps the pair and lists the changed key', () => {
  const base = session({ calls: [['edit', { path: 'a', text: 'one' }, false]] })
  const candidate = session({ calls: [['edit', { path: 'a', text: 'two' }, false]] })
  const diff = compareRuns(base, candidate)
  assert.equal(diff.counts.args, 1)
  assert.deepEqual(diff.aligned[0].changedKeys.map((row) => row.key), ['text'])
})

test('an outcome flip is distinct from an argument change', () => {
  const base = session({ calls: [['pwsh', { command: 'npm test' }, false]] })
  const candidate = session({ calls: [['pwsh', { command: 'npm test' }, true]] })
  const diff = compareRuns(base, candidate)
  assert.equal(diff.counts.flip, 1)
  assert.equal(diff.metrics.find((metric) => metric.key === 'failures').b, 1)
})

test('cwd differences do not count as argument drift', () => {
  const base = session({ calls: [['read', { path: 'C:\\work\\repo\\src\\a.ts' }, false]] })
  const candidate = buildRun({
    sessionId: 'session-test',
    header: { ...HEADER, cwd: 'D:\\other\\repo' },
    events: [
      { type: 'user/message', seq: 11, time: 1_100, data: { role: 'user', content: [{ type: 'text', text: 'fix the bug' }] }, surfaceOp: 'append' },
      { type: 'tool/call', seq: 12, time: 1_200, data: { turn: 1, step: 1, callId: 'c', name: 'read', arguments: JSON.stringify({ path: 'D:\\other\\repo\\src\\a.ts' }) } },
      { type: 'tool/result', seq: 13, time: 1_300, data: { turn: 1, step: 1, message: { role: 'tool', toolCallId: 'c', content: [{ type: 'text', text: 'read ok' }] } }, surfaceOp: 'append' },
    ],
    capturedAt: 2_000,
  })
  const diff = compareRuns(base, candidate)
  assert.equal(diff.counts.same, 1)
})

test('a changed result with identical arguments is its own status', () => {
  seq = 0
  const base = session({ calls: [['read', { path: 'a' }, false]] })
  const eventsB = [
    { type: 'user/message', seq: 30, time: 1_100, data: { role: 'user', content: [{ type: 'text', text: 'fix the bug' }] }, surfaceOp: 'append' },
    { type: 'tool/call', seq: 31, time: 1_200, data: { turn: 1, step: 1, callId: 'x', name: 'read', arguments: JSON.stringify({ path: 'a' }) } },
    { type: 'tool/result', seq: 32, time: 1_300, data: { turn: 1, step: 1, message: { role: 'tool', toolCallId: 'x', content: [{ type: 'text', text: 'different content' }] } }, surfaceOp: 'append' },
  ]
  const candidate = buildRun({ sessionId: 'session-test', header: HEADER, events: eventsB, capturedAt: 2_000 })
  const diff = compareRuns(base, candidate)
  assert.equal(diff.counts.result, 1)
})

test('capture keeps reasoning length and active time separate from idle time', () => {
  const run = session({ calls: [['read', { path: 'a' }, false], ['edit', { path: 'a', text: 'x' }, false]] })
  assert.ok(run.stats.reasoningChars > 0)
  assert.ok(run.stats.wallMs > run.stats.durationMs, 'the idle tail must not count as active work')
  assert.ok(run.stats.durationMs >= 100)
})
