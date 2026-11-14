import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PlanReviewTimeoutController } from '../lib/types/client/controller.js'
import { parsePlanReviewTimeoutDraft, isTimerDelay } from '../lib/types/timeout.js'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function remoteFixture(value = 120000) {
  const calls = { get: [], set: [] }
  const snapshot = timeoutMs => ({
    ok: true,
    value: { timeoutMs, defaultTimeoutMs: 120000, minTimeoutMs: 10000, maxTimeoutMs: 2147483647, confirmation: 'confirmed' },
  })
  const remote = {
    get: async signal => { calls.get.push(signal); return snapshot(value) },
    set: async (request, signal) => { calls.set.push([request, signal]); return snapshot(request.timeoutMs) },
  }
  return { remote, calls }
}

describe('Client staged controller', () => {
  it('publishes loading before adopting the authoritative value and disclosed bounds', async () => {
    const b = remoteFixture(300000)
    const controller = new PlanReviewTimeoutController(b.remote)
    const face = controller.inject()
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().read.kind, 'loading')
    await controller.load()
    const state = face.hooks.planReviewTimeout.getSnapshot()
    assert.deepEqual(state.read, { kind: 'ready', timeoutMs: 300000 })
    assert.equal(state.defaultTimeoutMs, 120000)
    assert.equal(state.minTimeoutMs, 10000)
    assert.equal(state.maxTimeoutMs, 2147483647)
    assert.equal(state.draft, '300000')
    assert.equal(b.calls.get.length, 1)
    await controller.dispose()
  })

  it('stages Reset to the default without writing and saves only on explicit Save', async () => {
    const b = remoteFixture(300000)
    const controller = new PlanReviewTimeoutController(b.remote)
    const face = controller.inject()
    await controller.load()
    face.reset()
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().draft, '120000')
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().resetStaged, true)
    assert.equal(b.calls.set.length, 0)
    await face.save()
    assert.deepEqual(b.calls.set.map(call => call[0]), [{ timeoutMs: 120000 }])
    const state = face.hooks.planReviewTimeout.getSnapshot()
    assert.equal(state.saved, true)
    assert.equal(state.saving, false)
    assert.equal(state.read.timeoutMs, 120000)
    await controller.dispose()
  })

  it('does not claim a reset needs saving when the value is already the default', async () => {
    const b = remoteFixture(120000)
    const controller = new PlanReviewTimeoutController(b.remote)
    const face = controller.inject()
    await controller.load()
    face.edit('600000')
    face.reset()
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().resetStaged, false)
    await face.save()
    assert.equal(b.calls.set.length, 0)
    await controller.dispose()
  })

  it('shows saving while the write is pending and publishes success only after acceptance', async () => {
    const b = remoteFixture(120000), pending = deferred()
    b.remote.set = () => pending.promise
    const controller = new PlanReviewTimeoutController(b.remote)
    const face = controller.inject()
    await controller.load()
    face.edit('600000')
    const saving = face.save()
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().saving, true)
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().saved, false)
    pending.resolve({
      ok: true,
      value: { timeoutMs: 600000, defaultTimeoutMs: 120000, minTimeoutMs: 10000, maxTimeoutMs: 2147483647, confirmation: 'confirmed' },
    })
    await saving
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().saving, false)
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().saved, true)
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().draft, '600000')
    await controller.dispose()
  })

  it('keeps the draft and permits retry after a known business save failure', async () => {
    const b = remoteFixture(120000)
    let writes = 0
    b.remote.set = async () => {
      writes++
      return { ok: false, error: { code: 'planReviewTimeout/save-failed', message: 'profile is read-only' } }
    }
    const controller = new PlanReviewTimeoutController(b.remote)
    const face = controller.inject()
    await controller.load()
    face.edit('600000')
    await face.save()
    const state = face.hooks.planReviewTimeout.getSnapshot()
    assert.equal(state.draft, '600000')
    assert.equal(state.saved, false)
    assert.equal(state.saving, false)
    assert.equal(state.saveError, 'profile is read-only')
    assert.equal(state.confirmationIssue, undefined)
    await face.save()
    assert.equal(writes, 2)
    await controller.dispose()
  })

  for (const code of ['planReviewTimeout/invalid', 'planReviewTimeout/unavailable', 'gateway/internal']) {
    it(`routes ${code} through ${code.startsWith('planReviewTimeout') ? 'business failure' : 'unknown outcome'} handling`, async () => {
      const b = remoteFixture(120000)
      b.remote.set = async () => ({ ok: false, error: { code, message: `${code} outcome` } })
      const controller = new PlanReviewTimeoutController(b.remote)
      const face = controller.inject()
      await controller.load()
      face.edit('600000')
      await face.save()
      const state = face.hooks.planReviewTimeout.getSnapshot()
      assert.equal(state.saveError, `${code} outcome`)
      assert.equal(state.confirmationIssue === undefined, code.startsWith('planReviewTimeout'))
      await controller.dispose()
    })
  }

  it('preserves a committed-unconfirmed write, blocks repeat save, and confirms on explicit refresh', async () => {
    const b = remoteFixture(120000)
    let writes = 0
    b.remote.set = async (request) => {
      writes++
      return {
        ok: true,
        value: {
          timeoutMs: request.timeoutMs,
          defaultTimeoutMs: 120000,
          minTimeoutMs: 10000,
          maxTimeoutMs: 2147483647,
          confirmation: 'unconfirmed',
          confirmationError: 'confirmation read failed',
        },
      }
    }
    const controller = new PlanReviewTimeoutController(b.remote)
    const face = controller.inject()
    await controller.load()
    face.edit('600000')
    await face.save()
    let state = face.hooks.planReviewTimeout.getSnapshot()
    assert.equal(state.saved, false)
    assert.deepEqual(state.confirmationIssue, { kind: 'unconfirmed', timeoutMs: 600000 })
    assert.equal(state.saveError, 'confirmation read failed')
    await face.save()
    assert.equal(writes, 1)
    b.remote.get = async () => ({
      ok: true,
      value: { timeoutMs: 600000, defaultTimeoutMs: 120000, minTimeoutMs: 10000, maxTimeoutMs: 2147483647, confirmation: 'confirmed' },
    })
    await face.retry()
    state = face.hooks.planReviewTimeout.getSnapshot()
    assert.equal(state.confirmationIssue, undefined)
    assert.deepEqual(state.read, { kind: 'ready', timeoutMs: 600000 })
    await controller.dispose()
  })

  it('exposes transport failures for both reading and saving', async () => {
    const b = remoteFixture()
    b.remote.get = async () => { throw new Error('disconnected') }
    const controller = new PlanReviewTimeoutController(b.remote)
    await controller.load()
    assert.deepEqual(controller.inject().hooks.planReviewTimeout.getSnapshot().read, { kind: 'error', message: 'disconnected' })
    b.remote.get = async signal => { void signal; return { ok: true, value: { timeoutMs: 120000, defaultTimeoutMs: 120000, minTimeoutMs: 10000, maxTimeoutMs: 2147483647, confirmation: 'confirmed' } } }
    await controller.load()
    b.remote.set = async () => { throw new Error('write disconnected') }
    const face = controller.inject()
    face.edit('600000')
    await face.save()
    assert.equal(face.hooks.planReviewTimeout.getSnapshot().saveError, 'write disconnected')
    assert.deepEqual(face.hooks.planReviewTimeout.getSnapshot().confirmationIssue, { kind: 'unknown', timeoutMs: 600000 })
    await controller.dispose()
  })

  it('ignores an older read success that settles after a newer success', async () => {
    const older = deferred(), newer = deferred(), reads = [older, newer]
    const controller = new PlanReviewTimeoutController({ get: () => reads.shift().promise, set: async () => { throw new Error('unexpected set') } })
    const face = controller.inject()
    const oldLoad = controller.load(), newLoad = controller.load()
    newer.resolve({ ok: true, value: { timeoutMs: 300000, defaultTimeoutMs: 120000, minTimeoutMs: 10000, maxTimeoutMs: 2147483647, confirmation: 'confirmed' } })
    await newLoad
    older.resolve({ ok: true, value: { timeoutMs: 60000, defaultTimeoutMs: 120000, minTimeoutMs: 10000, maxTimeoutMs: 2147483647, confirmation: 'confirmed' } })
    await oldLoad
    assert.deepEqual(face.hooks.planReviewTimeout.getSnapshot().read, { kind: 'ready', timeoutMs: 300000 })
    await controller.dispose()
  })

  for (const draft of ['', '0', '-1', '1.5', '1e2', ' 120000', '120000 ', '0120000', '9999', '2147483648']) {
    it(`does not save invalid draft ${JSON.stringify(draft)}`, async () => {
      const b = remoteFixture(120000)
      const controller = new PlanReviewTimeoutController(b.remote)
      const face = controller.inject()
      await controller.load()
      face.edit(draft)
      await face.save()
      assert.equal(b.calls.set.length, 0)
      assert.equal(face.hooks.planReviewTimeout.getSnapshot().saving, false)
      await controller.dispose()
    })
  }

  it('parses the disclosed bounds and rejects values outside them', () => {
    assert.equal(parsePlanReviewTimeoutDraft('10000'), 10000)
    assert.equal(parsePlanReviewTimeoutDraft('120000'), 120000)
    assert.equal(parsePlanReviewTimeoutDraft('2147483647'), 2147483647)
    assert.equal(parsePlanReviewTimeoutDraft('9999'), undefined)
    assert.equal(parsePlanReviewTimeoutDraft('2147483648'), undefined)
  })

  it('keeps the timer view looser than the settings-card bounds', () => {
    assert.equal(isTimerDelay(25), true)
    assert.equal(isTimerDelay(2147483647), true)
    assert.equal(isTimerDelay(0), false)
    assert.equal(isTimerDelay(1.5), false)
    assert.equal(isTimerDelay(2147483648), false)
    assert.equal(isTimerDelay('25'), false)
  })

  it('cancels and joins pending work without adopting a late result', async () => {
    const pending = deferred()
    let querySignal
    const controller = new PlanReviewTimeoutController({
      get: signal => { querySignal = signal; return pending.promise },
      set: async () => { throw new Error('unexpected set') },
    })
    const loading = controller.load()
    const disposing = controller.dispose()
    assert.equal(querySignal.aborted, true)
    pending.resolve({ ok: true, value: { timeoutMs: 300000, defaultTimeoutMs: 120000, minTimeoutMs: 10000, maxTimeoutMs: 2147483647, confirmation: 'confirmed' } })
    await Promise.all([loading, disposing])
    assert.equal(controller.inject().hooks.planReviewTimeout.getSnapshot().read.kind, 'loading')
  })
})
