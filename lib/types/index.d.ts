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
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import type { SetPlanReviewTimeoutRequest, PlanReviewTimeoutSnapshot } from './types.ts';
export type * from './types.ts';
export { DEFAULT_PLAN_REVIEW_TIMEOUT_MS, MAX_PLAN_REVIEW_TIMEOUT_MS, MIN_PLAN_REVIEW_TIMEOUT_MS, } from './timeout.ts';
/**
 * Deadline classification code owned by this plugin. Scoping {@link timeoutOf}
 * to it keeps a nested outer deadline from being misread as this plugin's own
 * expiry.
 */
export declare const PLAN_REVIEW_TIMEOUT = "PLAN_REVIEW_TIMEOUT";
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "plan-review-timeout";
/** The Cordis services this plugin reads. */
export declare const inject: string[];
/** Validated Loader configuration of this plugin. */
export interface Config {
    /** Plan-review wait in milliseconds before an unanswered review is dismissed. */
    timeoutMs: number;
}
export declare const Config: z<Config>;
/** Register the settings service and the plan-review deadline wrapper. */
export declare function apply(ctx: Context, config: Config): void;
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Configurable `exit_plan_mode` plan-review timeout, shared by the settings card and the enforcement wrapper. */
        planReviewTimeout: PlanReviewTimeoutController;
    }
}
/**
 * Bound the plan-review wait and serve the settings card's read and write
 * operations on this plugin's own configuration row.
 */
export declare class PlanReviewTimeoutController extends TypertRemoteService {
    private readonly config;
    constructor(ctx: Context, config: Config);
    /**
     * Read the effective plan-review timeout.
     * @param signal - browser or tool cancellation before the read.
     * @returns the effective duration and the disclosed bounds and default.
     */
    get(signal: AbortSignal): PlanReviewTimeoutSnapshot;
    /**
     * Persist one plan-review timeout through ordinary Loader reconciliation.
     * The saved duration applies to plan reviews that start after the write;
     * a review already under way keeps the duration read when it started.
     * @param request - whole-millisecond replacement within the disclosed bounds.
     * @param signal - cancellation checked before the non-cancellable configuration write starts.
     * @returns a confirmed fresh effective read, or the accepted request value marked unconfirmed when only that read fails.
     */
    set(request: SetPlanReviewTimeoutRequest, signal: AbortSignal): Promise<PlanReviewTimeoutSnapshot>;
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
    private boundReview;
    /**
     * The duration enforced for new reviews: the live row when readable, else
     * the loaded configuration. A resolved duration only needs to schedule a
     * platform timer; the tighter settings-card bounds govern user input, while
     * configuration itself is validated where it is written or loaded.
     */
    private enforcedTimeoutMs;
    /** The entry's effective value first, then the explicit and inherited layers, else the loaded configuration. */
    private resolveTimeoutMs;
    private tryConfiguration;
    private configuration;
}
//# sourceMappingURL=index.d.ts.map