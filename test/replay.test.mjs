import assert from 'node:assert/strict'
import test from 'node:test'

import { firstTurnEndAfter, planReplay, replayProgress } from '../lib/replay.mjs'

const BASE = {
  prompt: 'fix the failing test',
  config: { provider: 'deepseek-account', model: 'deepseek-flash', reasoningEffort: 'high' },
}

/** @param {string} type @param {number} seq @param {any} [data] */
function event(type, seq, data = {}) {
  return { type, seq, time: 1_000 + seq, data }
}

test('a replay without overrides reuses the baseline task and model', () => {
  const spec = planReplay(BASE, { baseRunId: 'run-x' })
  assert.equal(spec.prompt, BASE.prompt)
  assert.equal(spec.provider, 'deepseek-account')
  assert.equal(spec.model, 'deepseek-flash')
  assert.equal(spec.reasoningEffort, 'high')
  assert.equal(spec.promptEdited, false)
})

test('an edited prompt and a different model are both recorded', () => {
  const spec = planReplay(BASE, {
    prompt: 'fix the failing test, but keep the API stable',
    provider: 'deepseek-account',
    model: 'deepseek-pro',
    reasoningEffort: '',
  })
  assert.equal(spec.promptEdited, true)
  assert.equal(spec.model, 'deepseek-pro')
  assert.equal(spec.reasoningEffort, 'high')
})

test('a replay needs a prompt and a model route', () => {
  assert.throws(() => planReplay(BASE, { prompt: '   ' }), /prompt/u)
  assert.throws(() => planReplay({ prompt: 'x', config: {} }, {}), /provider and model/u)
})

test('only a turn end after the prompt seq completes the replay', () => {
  const events = [
    event('turn/end', 3),
    event('turn/start', 10),
    event('tool/call', 11),
    event('turn/end', 20),
    event('turn/end', 30),
  ]
  assert.equal(firstTurnEndAfter(events, 10)?.seq, 20)
  assert.equal(firstTurnEndAfter(events, 3)?.seq, 20)
  assert.equal(firstTurnEndAfter(events, 30), undefined)
})

test('progress counts only what the replay itself produced', () => {
  const events = [
    event('turn/start', 1, { turn: 1 }),
    event('tool/call', 2),
    event('turn/start', 10, { turn: 2 }),
    event('step/start', 11, { turn: 2, step: 1 }),
    event('assistant/message', 12, { turn: 2, step: 1 }),
    event('tool/call', 13),
    event('tool/call', 14),
  ]
  assert.deepEqual(replayProgress(events, 9), { toolCalls: 2, steps: 1, turn: 2, step: 1 })
})
