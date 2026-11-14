/** Browser entry for the plan-review timeout Plugins card. */
import type { Context } from '@deepseek-ai/cordis';
export { inject } from './mount.ts';
export type { PlanReviewTimeoutLocaleKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        planReviewTimeout: import('./locales.ts').PlanReviewTimeoutLocaleKey;
    }
}
/** Mount the configuration operation and its settings UI. */
export declare function apply(ctx: Context): Promise<() => Promise<void>>;
//# sourceMappingURL=index.d.ts.map