import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { main } from '../bin/agent-lab-check.mjs'
import { taskKeyOf } from '../lib/matrix.mjs'

/** @param {string} id @param {Partial<any>} [overrides] */
function run(id, overrides = {}) {
  return {
    id,
    title: 'fix the test',
    prompt: 'fix the failing test',
    capturedAt: 1_000,
    finalText: 'done',
    config: { provider: 'deepseek-account', model: 'deepseek-flash', reasoningEffort: 'high' },
    session: { cwd: 'C:\\work' },
    stats: { toolCalls: 0, failures: 0, inputTokens: 100, outputTokens: 50, durationMs: 1_000 },
    turns: [{ turn: 1, reason: 'completed' }],
    ...overrides,
  }
}

/**
 * @param {import('node:test').TestContext} t
 */
async function store(t) {
  const root = await mkdtemp(join(tmpdir(), 'agent-lab-cli-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const runsDir = join(root, 'runs')
  const checksDir = join(root, 'checks')
  await mkdir(runsDir)
  await mkdir(checksDir)
  return { root, runsDir, checksDir }
}

/** @param {string} runsDir @param {any} record */
async function putRun(runsDir, record) {
  await writeFile(join(runsDir, `${record.id}.json`), JSON.stringify(record, null, 2))
}

/** @param {string} checksDir @param {string} taskKey @param {any[]} checks */
async function putChecks(checksDir, taskKey, checks) {
  await writeFile(join(checksDir, `${taskKey}.json`), JSON.stringify({ taskKey, checks }, null, 2))
}

function capture() {
  const chunks = []
  return {
    io: {
      stdout: (text) => chunks.push(text),
      stderr: (text) => chunks.push(text),
    },
    text: () => chunks.join(''),
  }
}

test('a passing gate exits 0 and prints machine-readable results', async (t) => {
  const { runsDir, checksDir } = await store(t)
  const record = run('run-pass0001')
  const taskKey = taskKeyOf(record.prompt)
  await putRun(runsDir, record)
  await putChecks(checksDir, taskKey, [{ type: 'no-tool' }])

  const output = capture()
  const code = await main(
    ['--run', record.id, '--runs-dir', runsDir, '--checks-dir', checksDir, '--json'],
    output.io,
  )
  assert.equal(code, 0)
  const parsed = JSON.parse(output.text())
  assert.equal(parsed.ok, true)
  assert.equal(parsed.taskKey, taskKey)
  assert.deepEqual(
    parsed.results.map((result) => [result.type, result.ok]),
    [
      ['turn-completed', true],
      ['no-tool', true],
    ],
  )
})

test('a failing check exits 1 and names the failed check', async (t) => {
  const { runsDir, checksDir } = await store(t)
  const record = run('run-fail0001', { stats: { toolCalls: 4, failures: 0, inputTokens: 1, outputTokens: 1 } })
  await putRun(runsDir, record)
  await putChecks(checksDir, taskKeyOf(record.prompt), [{ type: 'max-tool-calls', max: 2 }])

  const output = capture()
  const code = await main(['--run', record.id, '--runs-dir', runsDir, '--checks-dir', checksDir], output.io)
  assert.equal(code, 1)
  assert.match(output.text(), /FAIL {2}max-tool-calls/u)
  assert.match(output.text(), /FAIL · 1 of 2 checks/u)
})

test('file checks read the replay workspace', async (t) => {
  const { root, runsDir, checksDir } = await store(t)
  const workspace = join(root, 'workspace')
  await mkdir(join(workspace, 'out'), { recursive: true })
  await writeFile(join(workspace, 'out', 'result.txt'), 'ALL GREEN\n')
  const record = run('run-file0001', { replay: { workspace: { dir: workspace } } })
  await putRun(runsDir, record)
  await putChecks(checksDir, taskKeyOf(record.prompt), [
    { type: 'file-contains', path: 'out/result.txt', text: 'ALL GREEN' },
  ])

  const passing = capture()
  assert.equal(
    await main(['--run', record.id, '--runs-dir', runsDir, '--checks-dir', checksDir], passing.io),
    0,
  )

  await writeFile(join(workspace, 'out', 'result.txt'), 'still failing\n')
  const failing = capture()
  assert.equal(
    await main(['--run', record.id, '--runs-dir', runsDir, '--checks-dir', checksDir], failing.io),
    1,
  )
  assert.match(failing.text(), /does not contain "ALL GREEN"/u)
})

test('--task and --variant pick the latest run of that cell', async (t) => {
  const { runsDir, checksDir } = await store(t)
  const older = run('run-older001', {
    capturedAt: 1_000,
    stats: { toolCalls: 9, failures: 0, inputTokens: 1, outputTokens: 1 },
  })
  const newer = run('run-newer001', {
    capturedAt: 2_000,
    stats: { toolCalls: 1, failures: 0, inputTokens: 1, outputTokens: 1 },
  })
  await putRun(runsDir, older)
  await putRun(runsDir, newer)
  const taskKey = taskKeyOf(newer.prompt)
  await putChecks(checksDir, taskKey, [{ type: 'max-tool-calls', max: 3 }])

  const output = capture()
  const code = await main(
    [
      '--task',
      taskKey,
      '--variant',
      'deepseek-account/deepseek-flash@high',
      '--runs-dir',
      runsDir,
      '--checks-dir',
      checksDir,
      '--json',
    ],
    output.io,
  )
  assert.equal(code, 0)
  assert.equal(JSON.parse(output.text()).runId, 'run-newer001')
})

test('--checks overrides the stored check set', async (t) => {
  const { root, runsDir, checksDir } = await store(t)
  const record = run('run-over0001', { stats: { toolCalls: 1, failures: 0, inputTokens: 1, outputTokens: 1 } })
  await putRun(runsDir, record)
  const checksFile = join(root, 'ci-checks.json')
  await writeFile(checksFile, JSON.stringify([{ type: 'max-tool-calls', max: 0 }]))

  const output = capture()
  const code = await main(
    ['--run', record.id, '--checks', checksFile, '--runs-dir', runsDir, '--checks-dir', checksDir],
    output.io,
  )
  assert.equal(code, 1)
})

test('usage and store problems exit 2 without claiming a pass', async (t) => {
  const { runsDir, checksDir } = await store(t)

  assert.equal(await main(['--runs-dir', runsDir, '--checks-dir', checksDir], capture().io), 2)
  assert.equal(
    await main(['--run', 'run-missing1', '--runs-dir', runsDir, '--checks-dir', checksDir], capture().io),
    2,
  )
  assert.equal(
    await main(['--task', 'task-000000000000', '--variant', 'p/m@default', '--runs-dir', runsDir, '--checks-dir', checksDir], capture().io),
    2,
  )

  const record = run('run-badcheck1')
  const taskKey = taskKeyOf(record.prompt)
  await putRun(runsDir, record)
  await writeFile(join(checksDir, `${taskKey}.json`), '{ not json')
  const output = capture()
  assert.equal(
    await main(['--run', record.id, '--runs-dir', runsDir, '--checks-dir', checksDir], output.io),
    2,
  )
  assert.match(output.text(), /cannot read|JSON|Unexpected/u)
})
