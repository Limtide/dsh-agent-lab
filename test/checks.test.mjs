import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateRun, normalizeChecks, workspaceOf } from '../lib/checks.mjs'

/** @param {Partial<any>} [overrides] */
function run(overrides = {}) {
  return {
    id: 'run-test',
    finalText: 'all done',
    turns: [{ turn: 1, reason: 'completed' }],
    stats: { toolCalls: 0, failures: 0, inputTokens: 100, outputTokens: 50, durationMs: 1_000 },
    session: { cwd: 'C:\\work\\repo' },
    ...overrides,
  }
}

/** @param {Record<string, string>} files */
function reader(files) {
  return async (path) => {
    const normalized = path.toLowerCase().replaceAll('/', '\\')
    const key = Object.keys(files).find((candidate) =>
      normalized.endsWith(candidate.toLowerCase().replaceAll('/', '\\')),
    )
    if (key === undefined) throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    return files[key]
  }
}

/** @param {string[]} present */
function statOf(present) {
  return async (path) => {
    const normalized = path.toLowerCase().replaceAll('/', '\\')
    const found = present.some((candidate) => normalized.endsWith(candidate.toLowerCase().replaceAll('/', '\\')))
    if (!found) throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    return { size: 1 }
  }
}

test('normalization keeps known checks and rejects bad parameters', () => {
  assert.deepEqual(
    normalizeChecks([
      { type: 'no-tool', extra: true },
      { type: 'max-tool-calls', max: 3 },
      { type: 'file-contains', path: 'out/result.txt', text: 'OK' },
    ]),
    [
      { type: 'no-tool' },
      { type: 'max-tool-calls', max: 3 },
      { type: 'file-contains', path: 'out/result.txt', text: 'OK' },
    ],
  )
  assert.throws(() => normalizeChecks([{ type: 'nope' }]), /unknown type/u)
  assert.throws(() => normalizeChecks([{ type: 'file-contains', path: '', text: 'x' }]), /path is required/u)
  assert.throws(() => normalizeChecks([{ type: 'max-tool-calls', max: -1 }]), /non-negative/u)
  assert.throws(() => normalizeChecks({}), /array/u)
})

test('a completed turn is the implicit gate, and a failed turn can never pass', async () => {
  const passed = await evaluateRun({ run: run(), checks: [] })
  assert.equal(passed.passed, true)
  assert.deepEqual(passed.results.map((result) => result.type), ['turn-completed'])

  const failed = await evaluateRun({ run: run({ turns: [{ turn: 1, reason: 'error' }] }), checks: [] })
  assert.equal(failed.passed, false)
  assert.equal(failed.results[0].ok, false)
})

test('tool-call and token thresholds compare the recorded stats', async () => {
  const toolRun = run({ stats: { toolCalls: 3, failures: 2, inputTokens: 900, outputTokens: 100 } })
  const result = await evaluateRun({
    run: toolRun,
    checks: [
      { type: 'max-tool-calls', max: 3 },
      { type: 'max-total-tokens', max: 999 },
      { type: 'max-failures', max: 1 },
      { type: 'no-tool' },
    ],
  })
  assert.deepEqual(
    result.results.slice(1).map((entry) => [entry.type, entry.ok]),
    [
      ['max-tool-calls', true],
      ['max-total-tokens', false],
      ['max-failures', false],
      ['no-tool', false],
    ],
  )
  assert.equal(result.passed, false)
})

test('file-contains reads inside the run workspace and rejects escapes', async () => {
  const replayRun = run({
    replay: { workspace: { dir: 'C:\\copies\\task-a' } },
    session: { cwd: 'C:\\work\\repo' },
  })
  assert.equal(workspaceOf(replayRun), 'C:\\copies\\task-a')

  const ok = await evaluateRun({
    run: replayRun,
    checks: [{ type: 'file-contains', path: 'out/result.txt', text: 'ALL GREEN' }],
    readText: reader({ 'out/result.txt': 'tests: ALL GREEN\n' }),
  })
  assert.equal(ok.passed, true)

  const missing = await evaluateRun({
    run: replayRun,
    checks: [{ type: 'file-contains', path: 'out/result.txt', text: 'ALL GREEN' }],
    readText: reader({}),
  })
  assert.equal(missing.passed, false)
  assert.match(missing.results[1].detail, /ENOENT/u)

  const escape = await evaluateRun({
    run: replayRun,
    checks: [{ type: 'file-contains', path: '../secret.txt', text: 'x' }],
    readText: reader({ 'secret.txt': 'x' }),
  })
  assert.equal(escape.passed, false)
  assert.match(escape.results[1].detail, /escapes/u)

  const noWorkspace = await evaluateRun({
    run: run({ session: {} }),
    checks: [{ type: 'file-contains', path: 'a.txt', text: 'x' }],
    readText: reader({}),
  })
  assert.equal(noWorkspace.passed, false)
  assert.match(noWorkspace.results[1].detail, /no workspace/u)
})

test('final-contains reads the last assistant reply', async () => {
  const result = await evaluateRun({
    run: run({ finalText: 'Implemented and verified.' }),
    checks: [{ type: 'final-contains', text: 'verified' }],
  })
  assert.equal(result.passed, true)

  const missing = await evaluateRun({
    run: run({ finalText: 'nothing here' }),
    checks: [{ type: 'final-contains', text: 'verified' }],
  })
  assert.equal(missing.passed, false)
})

test('tool assertions read the recorded trace', async () => {
  const trace = [
    {
      name: 'pwsh',
      args: { command: 'echo hi', description: 'run echo' },
      argsRaw: '{"command":"echo hi","description":"run echo"}',
    },
    { name: 'read', args: { path: 'a.ts' }, argsRaw: '{"path":"a.ts"}' },
  ]
  const result = await evaluateRun({
    run: run({ trace, stats: { toolCalls: 2, failures: 0, inputTokens: 1, outputTokens: 1 } }),
    checks: [
      { type: 'tool-called', name: 'pwsh' },
      { type: 'tool-not-called', name: 'edit' },
      { type: 'tool-args-contains', name: 'pwsh', text: 'echo hi' },
      { type: 'tool-args-contains', name: 'pwsh', key: 'command', text: 'hi' },
      { type: 'tool-args-contains', name: 'pwsh', key: 'description', text: 'nope' },
      { type: 'tool-not-called', name: 'read' },
    ],
  })
  assert.deepEqual(
    result.results.slice(1).map((entry) => [entry.type, entry.ok]),
    [
      ['tool-called', true],
      ['tool-not-called', true],
      ['tool-args-contains', true],
      ['tool-args-contains', true],
      ['tool-args-contains', false],
      ['tool-not-called', false],
    ],
  )
})

test('policy assertions compare the recorded sandbox and approval', async () => {
  const record = run({ config: { sandboxMode: 'workspace-write', approvalPolicy: 'never' } })
  const result = await evaluateRun({
    run: record,
    checks: [
      { type: 'sandbox-mode-is', mode: 'workspace-write' },
      { type: 'approval-policy-is', policy: 'never' },
      { type: 'approval-policy-is', policy: 'ask' },
      { type: 'sandbox-mode-is', mode: 'danger-full-access' },
    ],
  })
  assert.deepEqual(
    result.results.slice(1).map((entry) => entry.ok),
    [true, true, false, false],
  )
})

test('file existence checks stat inside the workspace', async () => {
  const replayRun = run({ replay: { workspace: { dir: 'C:\\copies\\task-a' } } })
  const result = await evaluateRun({
    run: replayRun,
    checks: [
      { type: 'file-exists', path: 'out/result.txt' },
      { type: 'file-not-exists', path: 'out/missing.txt' },
      { type: 'file-exists', path: 'out/missing.txt' },
    ],
    statPath: statOf(['out/result.txt']),
  })
  assert.deepEqual(
    result.results.slice(1).map((entry) => entry.ok),
    [true, true, false],
  )

  const escape = await evaluateRun({
    run: replayRun,
    checks: [{ type: 'file-exists', path: '../secret.txt' }],
    statPath: statOf(['secret.txt']),
  })
  assert.match(escape.results[1].detail, /escapes/u)

  const noStat = await evaluateRun({
    run: replayRun,
    checks: [{ type: 'file-exists', path: 'a.txt' }],
  })
  assert.match(noStat.results[1].detail, /metadata is unavailable/u)
})

test('final-regex matches the final reply and validates its pattern', async () => {
  const result = await evaluateRun({
    run: run({ finalText: 'Done: 42 tests passed.' }),
    checks: [
      { type: 'final-regex', pattern: '\\d+ tests passed', flags: 'i' },
      { type: 'final-regex', pattern: '^failed' },
    ],
  })
  assert.deepEqual(
    result.results.slice(1).map((entry) => entry.ok),
    [true, false],
  )

  assert.throws(() => normalizeChecks([{ type: 'final-regex', pattern: '(' }]), /invalid regular expression/u)
  assert.throws(() => normalizeChecks([{ type: 'final-regex', pattern: 'x', flags: 'g' }]), /flags may only/u)
  assert.throws(() => normalizeChecks([{ type: 'sandbox-mode-is', mode: 'nope' }]), /mode must be/u)
  assert.throws(() => normalizeChecks([{ type: 'approval-policy-is', policy: 'sometimes' }]), /policy must be/u)
  assert.deepEqual(normalizeChecks([{ type: 'tool-args-contains', name: 'pwsh', text: 'x', key: '  ' }]), [
    { type: 'tool-args-contains', name: 'pwsh', text: 'x' },
  ])
})
