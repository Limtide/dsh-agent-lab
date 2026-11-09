#!/usr/bin/env node
/**
 * agent-lab-check — evaluate one recorded run against its task checks.
 *
 * This is the v0.4 CI gate: it reads only the on-disk run library and check
 * set, never contacts the Host, and exits nonzero when the run fails.
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

import { evaluateRun, normalizeChecks } from '../lib/checks.mjs'
import { taskKeyOf, variantOf } from '../lib/matrix.mjs'

const RUN_ID_PATTERN = /^run-[A-Za-z0-9-]{4,80}$/u
const TASK_KEY_PATTERN = /^task-[a-f0-9]{12}$/u

const USAGE = `agent-lab-check — gate one run against its task checks

Usage:
  node bin/agent-lab-check.mjs --run <run-id> [options]
  node bin/agent-lab-check.mjs --task <task-key> --variant <variant-key> [options]

Options:
  --checks <file>       use this JSON check set instead of the task's stored one
  --runs-dir <dir>      run library (default: $DSH_HOME/agent-lab/runs)
  --checks-dir <dir>    check library (default: $DSH_HOME/agent-lab/checks)
  --json                print a machine-readable result
  -h, --help

Exit codes: 0 pass, 1 gate failed, 2 usage or store error.
`

/**
 * @param {string[]} argv
 * @param {{ stdout?: (text: string) => void, stderr?: (text: string) => void }} [io]
 */
export async function main(argv, io = {}) {
  const out = io.stdout ?? ((text) => process.stdout.write(text))
  const err = io.stderr ?? ((text) => process.stderr.write(text))

  let values
  try {
    ;({ values } = parseArgs({
      args: argv,
      options: {
        run: { type: 'string' },
        task: { type: 'string' },
        variant: { type: 'string' },
        checks: { type: 'string' },
        'runs-dir': { type: 'string' },
        'checks-dir': { type: 'string' },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: false,
    }))
  } catch (error) {
    err(`agent-lab check: ${error.message}\n\n${USAGE}`)
    return 2
  }

  if (values.help === true) {
    out(USAGE)
    return 0
  }

  try {
    return await gate(values, out, err)
  } catch (error) {
    err(`agent-lab check: ${messageOf(error)}\n`)
    return 2
  }
}

/**
 * @param {any} values
 * @param {(text: string) => void} out
 * @param {(text: string) => void} err
 */
async function gate(values, out, err) {
  if (values.run !== undefined && values.task !== undefined) {
    err('agent-lab check: use either --run or --task, not both\n')
    return 2
  }
  if (values.run === undefined && values.task === undefined) {
    err(`agent-lab check: --run or --task is required\n\n${USAGE}`)
    return 2
  }
  if (values.task !== undefined && values.variant === undefined) {
    err('agent-lab check: --task also needs --variant\n')
    return 2
  }

  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const storeDir = join(home, 'agent-lab')
  const runsDir = resolve(values['runs-dir'] ?? join(storeDir, 'runs'))
  const checksDir = resolve(values['checks-dir'] ?? join(storeDir, 'checks'))

  let run
  if (values.run !== undefined) {
    if (!RUN_ID_PATTERN.test(values.run)) {
      err(`agent-lab check: invalid run id "${values.run}"\n`)
      return 2
    }
    run = await readRun(runsDir, values.run)
    if (run === undefined) {
      err(`agent-lab check: run "${values.run}" was not found in ${runsDir}\n`)
      return 2
    }
  } else {
    if (!TASK_KEY_PATTERN.test(values.task)) {
      err(`agent-lab check: invalid task key "${values.task}"\n`)
      return 2
    }
    const runs = await listRuns(runsDir)
    const matches = runs
      .filter((candidate) => taskKeyOf(candidate?.prompt ?? '') === values.task)
      .filter((candidate) => variantOf(candidate?.config).key === values.variant)
      .sort((left, right) => numberOr(right.capturedAt) - numberOr(left.capturedAt))
    run = matches[0]
    if (run === undefined) {
      err(`agent-lab check: no run for ${values.task} / ${values.variant}\n`)
      return 2
    }
  }

  const taskKey = taskKeyOf(run.prompt ?? '')
  const checks = await resolveChecks(values.checks, checksDir, taskKey)
  const evaluation = await evaluateRun({
    run,
    checks,
    readText: (path) => readFile(path, 'utf8'),
    statPath: (path) => stat(path),
  })

  if (values.json === true) {
    out(
      `${JSON.stringify(
        {
          ok: evaluation.passed,
          runId: run.id,
          taskKey,
          variant: variantOf(run.config),
          checks,
          results: evaluation.results,
        },
        null,
        2,
      )}\n`,
    )
  } else {
    out(`agent-lab check · ${run.id}\n`)
    out(`  task    ${taskKey}\n`)
    out(`  variant ${variantOf(run.config).label}\n`)
    for (const result of evaluation.results) {
      out(`  ${result.ok ? 'PASS' : 'FAIL'}  ${result.type} — ${result.detail}\n`)
    }
    const failed = evaluation.results.filter((result) => result.ok !== true).length
    out(
      evaluation.passed
        ? `\nPASS · ${evaluation.results.length} checks\n`
        : `\nFAIL · ${failed} of ${evaluation.results.length} checks\n`,
    )
  }

  return evaluation.passed ? 0 : 1
}

/**
 * @param {string | undefined} explicitPath
 * @param {string} checksDir
 * @param {string} taskKey
 */
async function resolveChecks(explicitPath, checksDir, taskKey) {
  if (explicitPath !== undefined) {
    const raw = JSON.parse(await readFile(resolve(explicitPath), 'utf8'))
    const source = Array.isArray(raw) ? raw : raw?.checks
    return normalizeChecks(source)
  }
  let raw
  try {
    raw = await readFile(join(checksDir, `${taskKey}.json`), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw new Error(`cannot read checks for ${taskKey}: ${messageOf(error)}`)
  }
  const parsed = JSON.parse(raw)
  return normalizeChecks(Array.isArray(parsed) ? parsed : parsed?.checks)
}

/** @param {string} runsDir @param {string} id */
async function readRun(runsDir, id) {
  try {
    const raw = await readFile(join(runsDir, `${id}.json`), 'utf8')
    const run = JSON.parse(raw)
    return RUN_ID_PATTERN.test(String(run?.id ?? '')) ? run : undefined
  } catch {
    return undefined
  }
}

/** @param {string} runsDir */
async function listRuns(runsDir) {
  let names
  try {
    names = await readdir(runsDir)
  } catch {
    return []
  }
  const runs = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    try {
      const run = JSON.parse(await readFile(join(runsDir, name), 'utf8'))
      if (RUN_ID_PATTERN.test(String(run?.id ?? ''))) runs.push(run)
    } catch {
      /* an unreadable run must not hide the others */
    }
  }
  return runs
}

/** @param {unknown} value */
function numberOr(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** @param {unknown} error */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

const entry = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href
if (entry === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2))
}
