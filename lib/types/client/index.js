import remote from '@deepseek-ai/dsh-experimental-plan-review-timeout/remote';
import { mountPlanReviewTimeout } from "./mount.js";
export { inject } from "./mount.js";
/** Mount the configuration operation and its settings UI. */
export async function apply(ctx) {
    return await mountPlanReviewTimeout(ctx, remote);
}
//# sourceMappingURL=index.js.map