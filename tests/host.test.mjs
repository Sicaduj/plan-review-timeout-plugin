import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import PlanReviewTimeoutController from '../lib/index.js'

const contexts = []
afterEach(async () => { await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose())) })

function fixture(options = {}) {
  const ctx = new Context()
  contexts.push(ctx)
  const entry = {
    options: { id: 'plan-review-timeout', name: '@deepseek-ai/dsh-experimental-plan-review-timeout' },
    fiber: { effectiveConfig: options.effective ?? {} },
  }
  let override = options.override ? { ...options.override } : {}
  const inherited = options.inherited ? { ...options.inherited } : {}
  const edits = []
  const editor = {
    entries: () => options.missing ? [] : [entry],
    configuration: () => {
      if (options.readError !== undefined) throw options.readError
      return options.missing ? [] : [{ entry, inherited: structuredClone(inherited), override: structuredClone(override) }]
    },
    edit: async (candidate, change) => {
      assert.equal(candidate, entry)
      if (options.editError !== undefined) throw options.editError
      const before = structuredClone(override)
      override = change(structuredClone(override), structuredClone(inherited))
      edits.push({ before, after: structuredClone(override) })
      entry.fiber.effectiveConfig = { ...entry.fiber.effectiveConfig, ...structuredClone(override) }
    },
  }
  ctx.provide('configEditor', editor)
  const tools = []
  ctx.provide('tools', { register: tool => { tools.push(tool); return () => {} } })
  const controller = new PlanReviewTimeoutController(ctx, { timeoutMs: options.timeoutMs ?? 120000 })
  return { controller, ctx, editor, entry, edits, tools, readOverride: () => override }
}

const signal = () => new AbortController().signal

function exitExec(upstream) {
  const calls = { concludeTurn: 0, swapped: [] }
  const exec = {
    name: 'exit_plan_mode',
    arguments: {},
    signal: upstream,
    concludeTurn() { calls.concludeTurn++ },
  }
  return { exec, calls }
}

const ABORT_RESULT = {
  isError: true,
  content: [{ type: 'text', text: 'Error: ask_user_question was cancelled' }],
  error: { message: 'ask_user_question was cancelled', info: { name: 'UserQuestionError', code: 'ASK_ABORTED' } },
}

describe('Host configuration operation', () => {
  it('reads the effective value and discloses the default and bounds', () => {
    const b = fixture({ effective: { timeoutMs: 300000 } })
    assert.deepEqual(b.controller.get(signal()), {
      timeoutMs: 300000,
      defaultTimeoutMs: 120000,
      minTimeoutMs: 10000,
      maxTimeoutMs: 2147483647,
      confirmation: 'confirmed',
    })
  })

  it('uses explicit and inherited layers when runtime effectiveConfig is absent', () => {
    assert.equal(fixture({ override: { timeoutMs: 60000 } }).controller.get(signal()).timeoutMs, 60000)
    assert.equal(fixture({ inherited: { timeoutMs: 90000 } }).controller.get(signal()).timeoutMs, 90000)
    assert.equal(fixture().controller.get(signal()).timeoutMs, 120000)
  })

  for (const value of [null, undefined]) {
    it(`rejects an explicit nullish effective value ${String(value)} instead of substituting a layer`, () => {
      const b = fixture({ effective: { timeoutMs: value }, override: { timeoutMs: 60000 } })
      assert.throws(() => b.controller.get(signal()), error => error.code === 'planReviewTimeout/unavailable')
    })
  }

  it('sets a value, preserves every other explicit field, and returns a fresh effective read', async () => {
    const b = fixture({ effective: { timeoutMs: 120000 }, override: { timeoutMs: 120000, unrelated: 'retain' } })
    assert.deepEqual(await b.controller.set({ timeoutMs: 600000 }, signal()), {
      timeoutMs: 600000,
      defaultTimeoutMs: 120000,
      minTimeoutMs: 10000,
      maxTimeoutMs: 2147483647,
      confirmation: 'confirmed',
    })
    assert.deepEqual(b.readOverride(), { timeoutMs: 600000, unrelated: 'retain' })
    assert.equal(b.edits.length, 1)
  })

  it('reports committed-but-unconfirmed when the edit succeeds and only the fresh read fails', async () => {
    const b = fixture({ effective: { timeoutMs: 120000 }, readError: new Error('confirmation unavailable') })
    const result = await b.controller.set({ timeoutMs: 600000 }, signal())
    assert.deepEqual(result, {
      timeoutMs: 600000,
      defaultTimeoutMs: 120000,
      minTimeoutMs: 10000,
      maxTimeoutMs: 2147483647,
      confirmation: 'unconfirmed',
      confirmationError: 'confirmation unavailable',
    })
    assert.equal(b.edits.length, 1)
    assert.equal(b.readOverride().timeoutMs, 600000)
  })

  it('accepts both disclosed bounds exactly', async () => {
    const b = fixture()
    assert.equal((await b.controller.set({ timeoutMs: 10000 }, signal())).timeoutMs, 10000)
    assert.equal((await b.controller.set({ timeoutMs: 2147483647 }, signal())).timeoutMs, 2147483647)
    assert.equal(b.edits.length, 2)
  })

  for (const value of [0, 9999, 2147483648, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, '120000', null, undefined]) {
    it(`rejects invalid value ${String(value)} without editing`, async () => {
      const b = fixture()
      await assert.rejects(b.controller.set({ timeoutMs: value }, signal()), error =>
        error.code === 'planReviewTimeout/invalid' && error.message.includes('10000') && error.message.includes('2147483647'))
      assert.equal(b.edits.length, 0)
    })
  }

  it('reports missing plugin configuration for both operations', () => {
    const b = fixture({ missing: true })
    assert.throws(() => b.controller.get(signal()), error => error.code === 'planReviewTimeout/unavailable')
    assert.rejects(b.controller.set({ timeoutMs: 120000 }, signal()), error => error.code === 'planReviewTimeout/unavailable')
  })

  it('surfaces editor failure and never reports success', async () => {
    const b = fixture({ editError: new Error('read-only profile') })
    await assert.rejects(b.controller.set({ timeoutMs: 60000 }, signal()), error =>
      error.code === 'planReviewTimeout/save-failed' && error.message.includes('read-only profile'))
    assert.equal(b.edits.length, 0)
  })

  it('honors cancellation before a write', async () => {
    const b = fixture()
    await assert.rejects(b.controller.set({ timeoutMs: 60000 }, AbortSignal.abort(new Error('cancelled'))), /cancelled/)
    assert.equal(b.edits.length, 0)
  })
})

describe('Plan-review deadline wrapper', () => {
  it('delegates every other tool unchanged without swapping its signal', async () => {
    const b = fixture({ timeoutMs: 25 })
    const upstream = signal()
    const expected = { isError: false, value: { approved: true }, content: [] }
    const result = await ctx_dispatch(b, { name: 'read', signal: upstream }, async () => expected)
    assert.equal(result, expected)
  })

  it('returns the delegated result unchanged and restores the caller signal when answered before the deadline', async () => {
    const b = fixture({ timeoutMs: 60000 })
    const upstream = signal()
    const { exec, calls } = exitExec(upstream)
    const approved = { isError: false, value: { approved: true }, content: [{ type: 'text', text: 'Plan approved' }] }
    const result = await ctx_dispatch(b, exec, async () => approved)
    assert.equal(result, approved)
    assert.equal(exec.signal, upstream)
    assert.equal(calls.concludeTurn, 0)
  })

  it('settles an expired review like a dismissal and concludes the turn', async () => {
    const b = fixture({ timeoutMs: 25 })
    const upstream = signal()
    const { exec, calls } = exitExec(upstream)
    const result = await ctx_dispatch(b, exec, () => new Promise((resolve) => {
      exec.signal.addEventListener('abort', () => { resolve(ABORT_RESULT) }, { once: true })
    }))
    assert.equal(result.isError, false)
    assert.deepEqual(result.value, { approved: false })
    assert.equal(result.content.length, 1)
    assert.ok(result.content[0].text.includes('The review wait expired after 25ms'))
    assert.ok(result.content[0].text.includes('plan mode remains active'))
    assert.equal(calls.concludeTurn, 1)
    assert.equal(exec.signal, upstream)
  })

  it('prefers the live configured duration over the loaded configuration', async () => {
    const b = fixture({ timeoutMs: 600000, override: { timeoutMs: 25 } })
    const upstream = signal()
    const { exec } = exitExec(upstream)
    const result = await ctx_dispatch(b, exec, () => new Promise((resolve) => {
      exec.signal.addEventListener('abort', () => { resolve(ABORT_RESULT) }, { once: true })
    }))
    assert.ok(result.content[0].text.includes('expired after 25ms'))
  })

  it('falls back to the loaded duration when the configuration row is unreadable', async () => {
    const b = fixture({ timeoutMs: 25, readError: new Error('profile unavailable') })
    const upstream = signal()
    const { exec } = exitExec(upstream)
    const result = await ctx_dispatch(b, exec, () => new Promise((resolve) => {
      exec.signal.addEventListener('abort', () => { resolve(ABORT_RESULT) }, { once: true })
    }))
    assert.ok(result.content[0].text.includes('expired after 25ms'))
  })
})

function ctx_dispatch(b, exec, next) {
  return b.ctx.waterfall('tools/execute', exec, next)
}
