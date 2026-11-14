/** Bounds and parsing for the configurable plan-review timeout. */
/**
 * Default plan-review wait before an unanswered review is dismissed, in
 * milliseconds. Two minutes, matching the duration users have observed for the
 * plan-review popup.
 */
export declare const DEFAULT_PLAN_REVIEW_TIMEOUT_MS = 120000;
/**
 * Smallest allowed plan-review timeout in milliseconds: ten seconds, below
 * which a review could close before a reader sees the plan.
 */
export declare const MIN_PLAN_REVIEW_TIMEOUT_MS = 10000;
/**
 * Largest allowed plan-review timeout in milliseconds: 2^31 - 1, the longest
 * delay a platform timer schedules exactly (about 24.8 days). The same bound
 * the user-question timed waits enforce.
 */
export declare const MAX_PLAN_REVIEW_TIMEOUT_MS = 2147483647;
/**
 * Whether a value is an integer timeout the configuration can represent.
 * @param value - candidate from configuration, wire input, or a draft.
 * @returns whether the value is an integer within the allowed duration range.
 */
export declare function isPlanReviewTimeout(value: unknown): value is number;
/**
 * Whether a value schedules a platform timer as written. Configuration
 * values reach enforcement already validated at their own boundary, so the
 * timer view accepts every positive safe integer the platform timer delay
 * covers, looser than the settings-card bounds.
 * @param value - candidate duration in milliseconds.
 * @returns whether the value is a usable timer delay.
 */
export declare function isTimerDelay(value: unknown): value is number;
/**
 * Parse a decimal millisecond draft without accepting exponent notation,
 * signs, whitespace, or rounded values.
 * @param text - draft text from the settings input.
 * @returns the exact duration in milliseconds, or `undefined` when the draft
 *   is not an in-range decimal integer.
 */
export declare function parsePlanReviewTimeoutDraft(text: string): number | undefined;
//# sourceMappingURL=timeout.d.ts.map