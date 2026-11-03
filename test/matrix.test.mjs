import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMatrix, normalizePrompt, taskKeyOf, variantOf } from '../lib/matrix.mjs'

/**
 * @param {string} id
 * @param {string} prompt
 * @param {{ provider?: string, model?: string, effort?: string, at?: number, calls?: number, tokens?: number }} [spec]
 */
function run(id, prompt, spec = {}) {
  const provider = spec.provider ?? 'deepseek-account'
  const model = spec.model ?? 'deepseek-flash'
  const inputTokens = spec.tokens ?? 100
  return {
    id,
    title: `title ${id}`,
    prompt,
    capturedAt: spec.at ?? 1_000,
    config: { provider, model, reasoningEffort: spec.effort, agentPreset: 'standard' },
    session: { sessionId: `session-${id}`, cwd: 'C:\\work' },
    stats: { toolCalls: spec.calls ?? 2, failures: 0, inputTokens, outputTokens: 0, durationMs: 1_000 },
    turns: [{ turn: 1, reason: 'completed' }],
  }
}

test('task keys are stable across line endings and surrounding space', () => {
  const left = taskKeyOf('fix the bug\nsecond line')
  assert.equal(left, taskKeyOf('  fix the bug\r\nsecond line  \n'))
  assert.notEqual(left, taskKeyOf('fix the other bug'))
  assert.match(left, /^task-[a-f0-9]{12}$/u)
  assert.equal(normalizePrompt('a\r\nb'), 'a\nb')
})

test('variant keys separate provider, model, and effort', () => {
  const plain = variantOf({ provider: 'p', model: 'm' })
  const high = variantOf({ provider: 'p', model: 'm', reasoningEffort: 'high' })
  assert.equal(plain.key, 'p/m@default')
  assert.equal(high.key, 'p/m@high')
  assert.equal(plain.effort, null)
  assert.equal(high.effort, 'high')
})

test('the matrix groups runs by task and variant with pass rates', () => {
  const runs = [
    run('r1', 'task alpha', { at: 1_000, calls: 2, tokens: 100 }),
    run('r2', 'task alpha', { at: 2_000, calls: 4, tokens: 300 }),
    run('r3', 'task alpha', { at: 3_000, model: 'deepseek-pro', calls: 6, tokens: 500 }),
    run('r4', 'task beta', { at: 4_000, calls: 1, tokens: 50 }),
  ]
  const resultsByRun = new Map([
    ['r1', { passed: true, results: [] }],
    ['r2', { passed: false, results: [] }],
    ['r3', { passed: true, results: [] }],
    ['r4', { passed: true, results: [] }],
  ])
  const matrix = buildMatrix(runs, { resultsByRun })

  assert.equal(matrix.tasks.length, 2)
  assert.equal(matrix.columns.length, 2)
  assert.deepEqual(
    matrix.columns.map((column) => column.model),
    ['deepseek-flash', 'deepseek-pro'],
  )

  const alpha = matrix.tasks.find((task) => task.title === 'task alpha')
  const flashCell = alpha.cells[variantOf({ provider: 'deepseek-account', model: 'deepseek-flash' }).key]
  assert.equal(flashCell.total, 2)
  assert.equal(flashCell.passCount, 1)
  assert.equal(flashCell.avgToolCalls, 3)
  assert.equal(flashCell.avgTokens, 200)
  assert.deepEqual(
    flashCell.runs.map((entry) => entry.id),
    ['r2', 'r1'],
  )

  const proCell = alpha.cells['deepseek-account/deepseek-pro@default']
  assert.equal(proCell.passCount, 1)
  assert.equal(alpha.replayBase.id, 'r3')
  assert.equal(alpha.replayBase.prompt, 'task alpha')
  assert.equal(alpha.replayBase.config.agentPreset, 'standard')

  // Newest run first, so beta (r4) leads the matrix.
  assert.deepEqual(
    matrix.tasks.map((task) => task.title),
    ['task beta', 'task alpha'],
  )
})

test('checks and check errors are attached to their task', () => {
  const checks = [{ type: 'no-tool' }]
  const matrix = buildMatrix([run('r1', 'task alpha')], {
    checksByTask: { [taskKeyOf('task alpha')]: checks },
    checksErrors: { [taskKeyOf('task alpha')]: 'checks file is corrupt' },
  })
  assert.deepEqual(matrix.tasks[0].checks, checks)
  assert.equal(matrix.tasks[0].checksError, 'checks file is corrupt')
})

test('a task replays from its imported run, not from another replay copy', () => {
  const imported = run('r1', 'task alpha', { at: 1_000 })
  const replay = run('r2', 'task alpha', { at: 5_000 })
  replay.replay = { workspace: { dir: 'C:\\copies\\x' } }
  replay.session = { cwd: 'C:\\copies\\x' }
  const matrix = buildMatrix([imported, replay])
  assert.equal(matrix.tasks[0].replayBase.id, 'r1')
  assert.equal(matrix.tasks[0].replayBase.session.cwd, 'C:\\work')

  const onlyReplay = buildMatrix([replay])
  assert.equal(onlyReplay.tasks[0].replayBase.id, 'r2')
  assert.equal(onlyReplay.tasks[0].replayBase.session.cwd, 'C:\\copies\\x')
})

test('runs without a prompt are not tasks', () => {
  const matrix = buildMatrix([run('r1', '   '), run('r2', 'real task')])
  assert.equal(matrix.tasks.length, 1)
  assert.equal(matrix.tasks[0].title, 'real task')
})
