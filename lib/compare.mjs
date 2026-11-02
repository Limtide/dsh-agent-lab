/**
 * Align two run traces and describe their behavioral delta.
 *
 * Comparison is deliberately about invariants, not about text: which tools were
 * chosen, in which order, with which arguments, and whether they succeeded.
 * Tool calls are paired with a Needleman–Wunsch style alignment so inserted or
 * dropped calls do not shift every following pair.
 */

const GAP = -0.92

/**
 * @param {any} runA baseline run
 * @param {any} runB candidate run
 */
export function compareRuns(runA, runB) {
  const left = prepare(runA)
  const right = prepare(runB)
  const ops = align(left.calls, right.calls)

  const counts = { same: 0, args: 0, result: 0, flip: 0, onlyA: 0, onlyB: 0 }
  const aligned = ops.map((op) => {
    const status = classify(op)
    counts[status] += 1
    return {
      status,
      similarity: op.a !== undefined && op.b !== undefined ? round(pairScore(op.a, op.b)) : 0,
      a: op.a === undefined ? null : publicCall(op.a),
      b: op.b === undefined ? null : publicCall(op.b),
      changedKeys: op.a !== undefined && op.b !== undefined ? argumentDiff(op.a, op.b) : [],
    }
  })

  const sequence = sequenceScore(aligned)
  const tokens = tokenScore(left.stats, right.stats)
  const failures = failureScore(left.stats, right.stats)
  const score = Math.round(100 * (0.6 * sequence + 0.25 * tokens + 0.15 * failures))

  return {
    a: summarize(runA),
    b: summarize(runB),
    score,
    counts,
    total: Math.max(left.calls.length, right.calls.length),
    aligned,
    metrics: metrics(left.stats, right.stats),
    config: configDiff(runA, runB),
    prompt: {
      same: normalizeText(runA.prompt ?? '', left.cwd) === normalizeText(runB.prompt ?? '', right.cwd),
      a: runA.prompt ?? '',
      b: runB.prompt ?? '',
    },
    scoreParts: {
      sequence: round(sequence),
      tokens: round(tokens),
      failures: round(failures),
    },
  }
}

/**
 * @param {any} run
 */
function prepare(run) {
  const cwd = typeof run?.session?.cwd === 'string' ? run.session.cwd : ''
  const calls = (Array.isArray(run?.trace) ? run.trace : []).map((call, index) => {
    const normalized = normalizeArgs(call.args, cwd)
    return {
      index,
      callId: call.callId,
      name: String(call.name ?? ''),
      turn: call.turn,
      step: call.step,
      args: call.args ?? null,
      argsRaw: call.argsRaw ?? '',
      normalized,
      argsKey: stable(normalized),
      resultKey: stable(normalizeText(call.resultText ?? '', cwd)),
      resultText: call.resultText ?? '',
      isError: call.isError === true,
      errorCode: call.errorCode,
      durationMs: call.durationMs,
      tokens: tokensOf(normalized),
      signature: signatureOf(normalized),
    }
  })
  return { cwd, calls, stats: run?.stats ?? {} }
}

/**
 * @param {any[]} a
 * @param {any[]} b
 */
function align(a, b) {
  const n = a.length
  const m = b.length
  const width = m + 1
  const score = new Float64Array((n + 1) * width)
  const direction = new Uint8Array((n + 1) * width) // 0 match, 1 drop A, 2 drop B

  for (let i = 1; i <= n; i += 1) {
    score[i * width] = i * GAP
    direction[i * width] = 1
  }
  for (let j = 1; j <= m; j += 1) {
    score[j] = j * GAP
    direction[j] = 2
  }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const pair = score[(i - 1) * width + (j - 1)] + pairScore(a[i - 1], b[j - 1])
      const dropA = score[(i - 1) * width + j] + GAP
      const dropB = score[i * width + (j - 1)] + GAP
      let best = pair
      let move = 0
      if (dropA > best + 1e-9) {
        best = dropA
        move = 1
      }
      if (dropB > best + 1e-9) {
        best = dropB
        move = 2
      }
      score[i * width + j] = best
      direction[i * width + j] = move
    }
  }

  const ops = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i === 0) {
      ops.push({ a: undefined, b: b[j - 1] })
      j -= 1
      continue
    }
    if (j === 0) {
      ops.push({ a: a[i - 1], b: undefined })
      i -= 1
      continue
    }
    const move = direction[i * width + j]
    if (move === 0) {
      ops.push({ a: a[i - 1], b: b[j - 1] })
      i -= 1
      j -= 1
    } else if (move === 1) {
      ops.push({ a: a[i - 1], b: undefined })
      i -= 1
    } else {
      ops.push({ a: undefined, b: b[j - 1] })
      j -= 1
    }
  }
  return ops.reverse()
}

/**
 * How strongly two calls want to be paired. A name mismatch scores below two
 * gaps on purpose: a different tool is a behavioral difference, not a pairing.
 *
 * @param {any} x
 * @param {any} y
 */
function pairScore(x, y) {
  if (x.name !== y.name) return -3
  let score = 1
  if (x.signature === y.signature) score += 0.3
  if (x.argsKey === y.argsKey) score += 1.8
  else score += 0.7 * overlap(x.tokens, y.tokens)
  if (x.isError === y.isError) score += 0.2
  return score
}

/**
 * @param {{a?: any, b?: any}} op
 */
function classify(op) {
  if (op.a === undefined) return 'onlyB'
  if (op.b === undefined) return 'onlyA'
  if (op.a.argsKey !== op.b.argsKey) return 'args'
  if (op.a.isError !== op.b.isError) return 'flip'
  if (op.a.resultKey !== op.b.resultKey) return 'result'
  return 'same'
}

/**
 * @param {any[]} aligned
 */
function sequenceScore(aligned) {
  if (aligned.length === 0) return 1
  let total = 0
  for (const row of aligned) {
    if (row.status === 'same') total += 1
    else if (row.status === 'result') total += 0.9
    else if (row.status === 'args') total += 0.5
    else if (row.status === 'flip') total += 0.3
  }
  return total / aligned.length
}

/**
 * @param {any} a
 * @param {any} b
 */
function tokenScore(a, b) {
  const left = numberOr(a.inputTokens) + numberOr(a.outputTokens)
  const right = numberOr(b.inputTokens) + numberOr(b.outputTokens)
  const max = Math.max(left, right, 1)
  return 1 - Math.min(1, Math.abs(left - right) / max)
}

/**
 * @param {any} a
 * @param {any} b
 */
function failureScore(a, b) {
  const left = numberOr(a.failures)
  const right = numberOr(b.failures)
  const max = Math.max(left, right, 1)
  return 1 - Math.min(1, Math.abs(left - right) / max)
}

/**
 * @param {any} a
 * @param {any} b
 */
function metrics(a, b) {
  const definitions = [
    ['toolCalls', 'lower'],
    ['failures', 'lower'],
    ['inputTokens', 'lower'],
    ['outputTokens', 'lower'],
    ['durationMs', 'lower'],
    ['avgToolMs', 'lower'],
    ['steps', 'neutral'],
    ['resultChars', 'neutral'],
  ]
  return definitions.map(([key, better]) => ({
    key,
    a: numberOr(a[key]),
    b: numberOr(b[key]),
    better,
  }))
}

/**
 * @param {any} runA
 * @param {any} runB
 */
function configDiff(runA, runB) {
  const left = runA?.config ?? {}
  const right = runB?.config ?? {}
  const keys = [
    'model',
    'provider',
    'reasoningEffort',
    'toolCount',
    'toolsHash',
    'systemPromptHash',
    'permissionPreset',
    'sandboxMode',
    'approvalPolicy',
    'agentPreset',
  ]
  return keys.map((key) => ({
    key,
    a: left[key] ?? null,
    b: right[key] ?? null,
    same: stable(left[key] ?? null) === stable(right[key] ?? null),
  }))
}

/**
 * @param {any} call
 */
function publicCall(call) {
  return {
    index: call.index,
    callId: call.callId,
    name: call.name,
    turn: call.turn,
    step: call.step,
    args: call.args,
    argsRaw: call.argsRaw,
    resultText: truncate(call.resultText, 1200),
    isError: call.isError,
    errorCode: call.errorCode,
    durationMs: call.durationMs,
  }
}

/**
 * @param {any} call
 * @param {any} other
 */
function argumentDiff(call, other) {
  const left = call.normalized ?? {}
  const right = other.normalized ?? {}
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  const rows = []
  for (const key of [...keys].sort()) {
    if (stable(left[key]) === stable(right[key])) continue
    rows.push({ key, a: preview(left[key]), b: preview(right[key]) })
  }
  if (rows.length === 0 && call.argsKey !== other.argsKey) {
    rows.push({ key: '(arguments)', a: preview(call.args), b: preview(other.args) })
  }
  return rows
}

/** @param {unknown} value */
function preview(value) {
  const text = typeof value === 'string' ? value : stable(value)
  return truncate(text, 800)
}

/**
 * @param {any} run
 */
function summarize(run) {
  return {
    id: run.id,
    title: run.title,
    model: run.config?.model ?? '',
    provider: run.config?.provider ?? '',
    capturedAt: run.capturedAt,
    sessionId: run.session?.sessionId,
    cwd: run.session?.cwd,
    stats: run.stats ?? {},
  }
}

/**
 * @param {unknown} value
 */
function normalizeArgs(value, cwd) {
  if (value === null || value === undefined) return null
  return normalizeValue(value, cwd)
}

/**
 * @param {unknown} value
 */
function normalizeValue(value, cwd) {
  if (typeof value === 'string') return normalizeText(value, cwd)
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item, cwd))
  if (typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = normalizeValue(value[key], cwd)
    return out
  }
  return String(value)
}

/**
 * @param {string} text
 */
function normalizeText(text, cwd) {
  let out = String(text).replace(/\r\n/gu, '\n').replace(/\r/gu, '\n')
  if (typeof cwd === 'string' && cwd.length > 0) {
    out = out.split(cwd).join('<cwd>')
    const forward = cwd.replaceAll('\\', '/')
    if (forward !== cwd) out = out.split(forward).join('<cwd>')
  }
  return out.replace(/[ \t]+$/gmu, '')
}

/**
 * @param {unknown} value
 */
function signatureOf(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return ''
  return Object.keys(value).sort().join('|')
}

/**
 * @param {unknown} value
 */
function tokensOf(value) {
  const tokens = new Set()
  const visit = (node) => {
    if (tokens.size > 400) return
    if (typeof node === 'string') {
      for (const token of node.split(/[\s"'`=,;:()[\]{}<>]+/u)) {
        if (token.length >= 2) tokens.add(token)
      }
      return
    }
    if (typeof node === 'number') {
      tokens.add(`#${node}`)
      return
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    if (node !== null && typeof node === 'object') {
      for (const key of Object.keys(node)) {
        tokens.add(key)
        visit(node[key])
      }
    }
  }
  visit(value)
  return tokens
}

/**
 * @param {Set<string>} left
 * @param {Set<string>} right
 */
function overlap(left, right) {
  if (left.size === 0 && right.size === 0) return 1
  let shared = 0
  const [small, large] = left.size <= right.size ? [left, right] : [right, left]
  for (const token of small) if (large.has(token)) shared += 1
  return shared / Math.max(1, Math.min(left.size, right.size))
}

/** Stable JSON for deep equality on normalized values. */
function stable(value) {
  if (value === undefined) return 'undefined'
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? String(value)
  if (Array.isArray(value)) return `[${value.map((item) => stable(item)).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
}

/** @param {string} text */
function truncate(text, limit) {
  if (typeof text !== 'string') return ''
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}…`
}

/** @param {unknown} value */
function numberOr(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** @param {number} value */
function round(value) {
  return Math.round(value * 100) / 100
}
