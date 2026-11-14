/** Browser entry for the plan-review timeout Plugins card. */
import type { Context } from '@deepseek-ai/cordis'
import remote from '@deepseek-ai/dsh-experimental-plan-review-timeout/remote'
import { mountPlanReviewTimeout } from './mount.ts'

export { inject } from './mount.ts'
export type { PlanReviewTimeoutLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    planReviewTimeout: import('./locales.ts').PlanReviewTimeoutLocaleKey
  }
}

/** Mount the configuration operation and its settings UI. */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  return await mountPlanReviewTimeout(ctx, remote)
}
