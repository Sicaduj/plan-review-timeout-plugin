/** JSON values shared by the Host Remote methods and their browser client. */
import type {} from '@deepseek-ai/dsh-typert-protocol'

/** Authoritative timeout and the bounds the settings UI discloses. */
export interface PlanReviewTimeoutSnapshot {
  /** Current plan-review wait in milliseconds before an unanswered review is dismissed. */
  timeoutMs: number
  /** Reset value in milliseconds. */
  defaultTimeoutMs: number
  /** Smallest accepted value in milliseconds. */
  minTimeoutMs: number
  /** Largest accepted value in milliseconds. */
  maxTimeoutMs: number
  /** Whether the effective value was read after the write, or the write was committed without confirmation. */
  confirmation: 'confirmed' | 'unconfirmed'
  /** Confirmation failure after a committed write; absent for a confirmed effective read. */
  confirmationError?: string
}

/** Request to persist a replacement plan-review timeout. */
export interface SetPlanReviewTimeoutRequest {
  /** Whole-millisecond wait within the disclosed minimum and maximum. */
  timeoutMs: number
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The requested duration is not a whole-millisecond value within bounds. */
    'planReviewTimeout/invalid': Record<string, never>
    /** The active profile has no addressable plan-review-timeout configuration. */
    'planReviewTimeout/unavailable': Record<string, never>
    /** The configuration editor rejected or failed the write. */
    'planReviewTimeout/save-failed': Record<string, never>
  }
}
