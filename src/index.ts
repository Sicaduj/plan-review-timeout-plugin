/**
 * Configurable lifetime for the `exit_plan_mode` plan review. A
 * `tools/execute` wrapper arms a cooperative deadline for the plan-review
 * tool call; when the user has not decided by the configured duration, the
 * review closes exactly like a dismissed review (no approval, plan mode stays
 * active, the turn ends) instead of blocking the turn indefinitely. The
 * duration is deployment configuration, read and written through the Plugins
 * settings card and this plugin's own Loader entry.
 *
 * The plugin exports the namespace form (`name` / `inject` / `Config` /
 * `apply`) so `apply` can install the Cordis root compatibility property
 * before the Remote service constructs; a default export would collapse that
 * namespace and drop the declared injections.
 *
 * @module @deepseek-ai/dsh-experimental-plan-review-timeout
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-config-editor'
import { deadline, timeoutOf } from '@deepseek-ai/dsh-timeout'
import type { ToolDispatchExecution, ToolExecutionResult, ToolRunContext } from '@deepseek-ai/dsh-tools'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_PLAN_REVIEW_TIMEOUT_MS, MAX_PLAN_REVIEW_TIMEOUT_MS, MIN_PLAN_REVIEW_TIMEOUT_MS,
  isPlanReviewTimeout, isTimerDelay,
} from './timeout.ts'
import type { SetPlanReviewTimeoutRequest, PlanReviewTimeoutSnapshot } from './types.ts'

export type * from './types.ts'
export {
  DEFAULT_PLAN_REVIEW_TIMEOUT_MS,
  MAX_PLAN_REVIEW_TIMEOUT_MS,
  MIN_PLAN_REVIEW_TIMEOUT_MS,
} from './timeout.ts'

/** Loader entry id of this plugin's own configuration row. */
const ENTRY_ID = 'plan-review-timeout'

/** Loader entry name of this plugin's own configuration row. */
const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-plan-review-timeout'

/** The plan-review tool whose review wait this plugin bounds. */
const EXIT_PLAN_MODE = 'exit_plan_mode'

/** Cordis root-context symbol, shared across module copies by the global symbol registry. */
const CORDIS_ROOT = Symbol.for('cordis.root')

/**
 * Deadline classification code owned by this plugin. Scoping {@link timeoutOf}
 * to it keeps a nested outer deadline from being misread as this plugin's own
 * expiry.
 */
export const PLAN_REVIEW_TIMEOUT = 'PLAN_REVIEW_TIMEOUT'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'plan-review-timeout'

/** The Cordis services this plugin reads. */
export const inject = ['configEditor', 'tools', 'typert']

/** Validated Loader configuration of this plugin. */
export interface Config {
  /** Plan-review wait in milliseconds before an unanswered review is dismissed. */
  timeoutMs: number
}

export const Config: z<Config> = z.object({
  timeoutMs: z.number().step(1).min(MIN_PLAN_REVIEW_TIMEOUT_MS).max(MAX_PLAN_REVIEW_TIMEOUT_MS)
    .default(DEFAULT_PLAN_REVIEW_TIMEOUT_MS),
})

/** Model-facing text replacing the plan-review call when its wait expires. */
function timedOutContent(timeoutMs: number): { type: 'text'; text: string }[] {
  return [{
    type: 'text',
    text: 'The user dismissed the plan review to reply in their own words; plan mode remains active. '
      + `The review wait expired after ${timeoutMs}ms without a decision, so the plan was not approved. `
      + 'Do not present the plan again until the user asks; end your response.',
  }]
}

/**
 * Expose the root context as a `root` property before any Remote service
 * constructs. Published `@deepseek-ai/dsh-typert-protocol` reads the string
 * property `ctx.root` while binding a service; Cordis versions that replaced
 * it with the {@link CORDIS_ROOT} symbol would otherwise throw
 * `cannot get property "root" without inject`. Versions that still expose the
 * string property already have it, so nothing is defined there.
 *
 * @param ctx - the plugin's own Cordis context.
 */
function installRootCompatibility(ctx: Context): void {
  if (Object.hasOwn(ctx, 'root')) return
  const root = Reflect.get(ctx, CORDIS_ROOT) as Context | undefined
  Object.defineProperty(ctx, 'root', { value: root ?? ctx, configurable: true })
}

/** Register the settings service and the plan-review deadline wrapper. */
export function apply(ctx: Context, config: Config): void {
  installRootCompatibility(ctx)
  new PlanReviewTimeoutController(ctx, config)
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Configurable `exit_plan_mode` plan-review timeout, shared by the settings card and the enforcement wrapper. */
    planReviewTimeout: PlanReviewTimeoutController
  }
}

/**
 * Bound the plan-review wait and serve the settings card's read and write
 * operations on this plugin's own configuration row.
 */
export class PlanReviewTimeoutController extends TypertRemoteService {
  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'planReviewTimeout', { namespace: 'planReviewTimeout' })
    ctx.effect(
      () => ctx.on('tools/execute', (exec, next) => this.boundReview(exec, next)),
      'plan-review-timeout: plan-review deadline',
    )
  }

  /**
   * Read the effective plan-review timeout.
   * @param signal - browser or tool cancellation before the read.
   * @returns the effective duration and the disclosed bounds and default.
   */
  @Remote
  get(signal: AbortSignal): PlanReviewTimeoutSnapshot {
    signal.throwIfAborted()
    const row = this.configuration()
    const configured: unknown = this.resolveTimeoutMs(row)
    if (!isPlanReviewTimeout(configured)) {
      throw new RemoteError('planReviewTimeout/unavailable', 'The plan review timeout is not a readable whole-millisecond value within bounds', {})
    }
    return {
      timeoutMs: configured,
      defaultTimeoutMs: DEFAULT_PLAN_REVIEW_TIMEOUT_MS,
      minTimeoutMs: MIN_PLAN_REVIEW_TIMEOUT_MS,
      maxTimeoutMs: MAX_PLAN_REVIEW_TIMEOUT_MS,
      confirmation: 'confirmed',
    }
  }

  /**
   * Persist one plan-review timeout through ordinary Loader reconciliation.
   * The saved duration applies to plan reviews that start after the write;
   * a review already under way keeps the duration read when it started.
   * @param request - whole-millisecond replacement within the disclosed bounds.
   * @param signal - cancellation checked before the non-cancellable configuration write starts.
   * @returns a confirmed fresh effective read, or the accepted request value marked unconfirmed when only that read fails.
   */
  @Remote
  async set(request: SetPlanReviewTimeoutRequest, signal: AbortSignal): Promise<PlanReviewTimeoutSnapshot> {
    signal.throwIfAborted()
    if (!isPlanReviewTimeout(request.timeoutMs)) {
      throw new RemoteError('planReviewTimeout/invalid', `timeoutMs must be a whole number of milliseconds between ${MIN_PLAN_REVIEW_TIMEOUT_MS} and ${MAX_PLAN_REVIEW_TIMEOUT_MS}`, {})
    }
    const entry = this.ctx.configEditor.entries().find(candidate =>
      candidate.options.id === ENTRY_ID && candidate.options.name === PACKAGE_NAME)
    if (entry === undefined) {
      throw new RemoteError('planReviewTimeout/unavailable', 'The plan review timeout configuration is not available in this profile', {})
    }
    try {
      await this.ctx.configEditor.edit(entry, current => ({ ...current, timeoutMs: request.timeoutMs }))
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new RemoteError('planReviewTimeout/save-failed', `The plan review timeout could not be saved: ${reason}`, {})
    }
    try {
      return this.get(new AbortController().signal)
    } catch (error: unknown) {
      return {
        timeoutMs: request.timeoutMs,
        defaultTimeoutMs: DEFAULT_PLAN_REVIEW_TIMEOUT_MS,
        minTimeoutMs: MIN_PLAN_REVIEW_TIMEOUT_MS,
        maxTimeoutMs: MAX_PLAN_REVIEW_TIMEOUT_MS,
        confirmation: 'unconfirmed',
        confirmationError: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Arm the configured review deadline around the plan-review call. The
   * wrapper swaps a deadline-derived signal onto the execution so the
   * blocking review reaches quiescence when the wait expires, then restores
   * the caller's own signal so post-execute listeners never see the deadline
   * signal. Expiry settles the call exactly like a dismissed review: the
   * unapproved outcome, the dismissal turn marker, and the plan mode state
   * that remains active.
   *
   * @param exec - around-dispatch view of the executing call.
   * @param next - the rest of the dispatch chain, including the tool body.
   * @returns the delegated result unchanged, or the dismissal outcome when
   *   this plugin's deadline expired first.
   */
  private async boundReview(exec: ToolDispatchExecution, next: () => Promise<ToolExecutionResult>): Promise<ToolExecutionResult> {
    if (exec.name !== EXIT_PLAN_MODE) return await next()
    const timeoutMs = this.enforcedTimeoutMs()
    using d = deadline(exec.signal, timeoutMs, PLAN_REVIEW_TIMEOUT)
    const upstream = exec.signal
    exec.signal = d.signal
    try {
      const result = await next()
      if (timeoutOf(d.signal, PLAN_REVIEW_TIMEOUT) === undefined) {
        return result
      }
      // The same turn marker the tool sets when the user dismisses the review,
      // so an expired wait ends the turn instead of leaving the model looping
      // on a re-presented plan.
      (exec as ToolRunContext).concludeTurn()
      return {
        isError: false,
        value: { approved: false },
        content: timedOutContent(timeoutMs),
      }
    } finally {
      exec.signal = upstream
    }
  }

  /**
   * The duration enforced for new reviews: the live row when readable, else
   * the loaded configuration. A resolved duration only needs to schedule a
   * platform timer; the tighter settings-card bounds govern user input, while
   * configuration itself is validated where it is written or loaded.
   */
  private enforcedTimeoutMs(): number {
    const row = this.tryConfiguration()
    const resolved = row === undefined ? undefined : this.resolveTimeoutMs(row)
    return isTimerDelay(resolved) ? resolved : this.config.timeoutMs
  }

  /** The entry's effective value first, then the explicit and inherited layers, else the loaded configuration. */
  private resolveTimeoutMs(row: {
    entry: { fiber?: { effectiveConfig?: unknown } }
    inherited: Record<string, unknown>
    override: Record<string, unknown>
  }): unknown {
    const effective = row.entry.fiber?.effectiveConfig
    const hasEffectiveTimeoutMs = typeof effective === 'object' && effective !== null && 'timeoutMs' in effective
    return hasEffectiveTimeoutMs
      ? (effective as { timeoutMs: unknown }).timeoutMs
      : row.override.timeoutMs ?? row.inherited.timeoutMs ?? this.config.timeoutMs
  }

  private tryConfiguration() {
    try {
      return this.configuration()
    } catch {
      // The row is absent during raw loads that skip this plugin's patch; the
      // loaded configuration value stays authoritative for enforcement.
      return undefined
    }
  }

  private configuration() {
    const row = this.ctx.configEditor.configuration().find(candidate =>
      candidate.entry.options.id === ENTRY_ID && candidate.entry.options.name === PACKAGE_NAME)
    if (row === undefined) {
      throw new RemoteError('planReviewTimeout/unavailable', 'The plan review timeout configuration is not available in this profile', {})
    }
    return row
  }
}
