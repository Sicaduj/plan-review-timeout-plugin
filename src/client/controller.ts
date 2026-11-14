/** Staged browser state over the shared Host get/set operations. */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { RemoteResult, TypertClientRemote } from '@deepseek-ai/dsh-typert-protocol'
import {
  DEFAULT_PLAN_REVIEW_TIMEOUT_MS, MAX_PLAN_REVIEW_TIMEOUT_MS, MIN_PLAN_REVIEW_TIMEOUT_MS,
  parsePlanReviewTimeoutDraft,
} from '../timeout.ts'
import type { PlanReviewTimeoutSnapshot } from '../types.ts'

/** Generated Client methods for this plugin's own Remote namespace. */
export type PlanReviewTimeoutRemote = TypertClientRemote['planReviewTimeout']

/** Current read state; loading, unavailable, and a readable value stay distinct. */
export type PlanReviewTimeoutRead =
  | { kind: 'loading' }
  | { kind: 'ready'; timeoutMs: number }
  | { kind: 'error'; message: string }

/** A write that needs a fresh read before another write may be attempted. */
export interface PlanReviewTimeoutConfirmationIssue {
  kind: 'unconfirmed' | 'unknown'
  timeoutMs: number
}

/** Complete card snapshot published to the slot renderer. */
export interface PlanReviewTimeoutState {
  read: PlanReviewTimeoutRead
  defaultTimeoutMs: number
  minTimeoutMs: number
  maxTimeoutMs: number
  draft: string
  saving: boolean
  saved: boolean
  resetStaged: boolean
  saveError: string | undefined
  confirmationIssue: PlanReviewTimeoutConfirmationIssue | undefined
}

/** Actions and observable state bound by the slot renderer. */
export interface PlanReviewTimeoutFace {
  readonly hooks: { readonly planReviewTimeout: SnapshotStore<PlanReviewTimeoutState> }
  edit(text: string): void
  reset(): void
  save(): Promise<void>
  retry(): Promise<void>
}

/** Own pending calls and staged state for one Client plugin lifetime. */
export class PlanReviewTimeoutController {
  private readonly store = createSnapshotStore<PlanReviewTimeoutState>({
    read: { kind: 'loading' },
    defaultTimeoutMs: DEFAULT_PLAN_REVIEW_TIMEOUT_MS,
    minTimeoutMs: MIN_PLAN_REVIEW_TIMEOUT_MS,
    maxTimeoutMs: MAX_PLAN_REVIEW_TIMEOUT_MS,
    draft: String(DEFAULT_PLAN_REVIEW_TIMEOUT_MS),
    saving: false,
    saved: false,
    resetStaged: false,
    saveError: undefined,
    confirmationIssue: undefined,
  })
  private readonly lifetime = new AbortController()
  private readonly pending = new Set<Promise<unknown>>()
  private readGeneration = 0
  private disposed = false

  constructor(private readonly remote: PlanReviewTimeoutRemote) {}

  /** Bind state and actions without exposing the Remote service to the component. */
  inject(): PlanReviewTimeoutFace {
    return {
      hooks: { planReviewTimeout: this.store },
      edit: text => { this.edit(text) },
      reset: () => { this.reset() },
      save: () => this.save(),
      retry: () => this.load(),
    }
  }

  /** Start the initial authoritative read; the card shows loading until it settles. */
  async load(): Promise<void> {
    if (this.disposed) return
    const generation = ++this.readGeneration
    this.store.update(state => {
      state.read = { kind: 'loading' }
      state.saved = false
      state.saveError = undefined
    })
    const task = this.remote.get(this.lifetime.signal)
    this.track(task)
    let result: RemoteResult<PlanReviewTimeoutSnapshot>
    try { result = await task } catch (error: unknown) {
      if (!this.disposed && generation === this.readGeneration) {
        const message = error instanceof Error ? error.message : String(error)
        this.store.update(state => { state.read = { kind: 'error', message } })
      }
      return
    }
    if (this.disposed || generation !== this.readGeneration) return
    if (!result.ok) {
      this.store.update(state => { state.read = { kind: 'error', message: result.error.message } })
      return
    }
    this.store.update(state => {
      state.read = { kind: 'ready', timeoutMs: result.value.timeoutMs }
      state.defaultTimeoutMs = result.value.defaultTimeoutMs
      state.minTimeoutMs = result.value.minTimeoutMs
      state.maxTimeoutMs = result.value.maxTimeoutMs
      state.draft = String(result.value.timeoutMs)
      state.saving = false
      state.saved = false
      state.resetStaged = false
      state.saveError = undefined
      state.confirmationIssue = undefined
    })
  }

  /** Cancel pending Remote calls and wait for their settlement before unmounting the namespace. */
  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    this.lifetime.abort()
    await Promise.allSettled([...this.pending])
  }

  private edit(text: string): void {
    if (this.disposed || this.store.getSnapshot().saving) return
    this.store.update(state => {
      state.draft = text
      state.saved = false
      state.resetStaged = false
      state.saveError = undefined
    })
  }

  private reset(): void {
    if (this.disposed || this.store.getSnapshot().saving) return
    this.store.update(state => {
      state.draft = String(state.defaultTimeoutMs)
      state.saved = false
      state.resetStaged = state.read.kind === 'ready' && state.read.timeoutMs !== state.defaultTimeoutMs
      state.saveError = undefined
    })
  }

  private async save(): Promise<void> {
    const snapshot = this.store.getSnapshot()
    if (this.disposed || snapshot.saving || snapshot.confirmationIssue !== undefined || snapshot.read.kind !== 'ready') return
    const timeoutMs = parsePlanReviewTimeoutDraft(snapshot.draft)
    if (timeoutMs === undefined || snapshot.draft === String(snapshot.read.timeoutMs)) return
    this.store.update(state => {
      state.saving = true
      state.saved = false
      state.resetStaged = false
      state.saveError = undefined
    })
    const task = this.remote.set({ timeoutMs }, this.lifetime.signal)
    this.track(task)
    let result: RemoteResult<PlanReviewTimeoutSnapshot>
    try { result = await task } catch (error: unknown) {
      if (!this.disposed) {
        this.store.update(state => {
          state.saving = false
          state.saveError = error instanceof Error ? error.message : String(error)
          state.confirmationIssue = { kind: 'unknown', timeoutMs }
        })
      }
      return
    }
    if (this.disposed) return
    if (!result.ok) {
      const businessFailure = result.error.code === 'planReviewTimeout/invalid'
        || result.error.code === 'planReviewTimeout/unavailable'
        || result.error.code === 'planReviewTimeout/save-failed'
      this.store.update(state => {
        state.saving = false
        state.saveError = result.error.message
        state.confirmationIssue = businessFailure ? undefined : { kind: 'unknown', timeoutMs }
      })
      return
    }
    this.store.update(state => {
      state.read = { kind: 'ready', timeoutMs: result.value.timeoutMs }
      state.defaultTimeoutMs = result.value.defaultTimeoutMs
      state.minTimeoutMs = result.value.minTimeoutMs
      state.maxTimeoutMs = result.value.maxTimeoutMs
      state.draft = String(result.value.timeoutMs)
      state.saving = false
      state.saved = result.value.confirmation === 'confirmed'
      state.resetStaged = false
      state.saveError = result.value.confirmationError
      state.confirmationIssue = result.value.confirmation === 'unconfirmed'
        ? { kind: 'unconfirmed', timeoutMs: result.value.timeoutMs }
        : undefined
    })
  }

  private track(task: Promise<RemoteResult<PlanReviewTimeoutSnapshot>>): void {
    this.pending.add(task)
    void Promise.allSettled([task]).then(() => { this.pending.delete(task) })
  }
}
