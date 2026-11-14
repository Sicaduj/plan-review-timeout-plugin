/** Client lifecycle for the generated Remote namespace and Plugins card. */
import type { Context } from '@deepseek-ai/cordis';
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
/** Services required before the generated namespace can mount. */
export declare const inject: string[];
/**
 * Mount the generated Remote contribution before injecting its namespace.
 * @param ctx - Client plugin lifetime.
 * @param contribution - generated Remote descriptors for this package.
 * @returns disposer that withdraws UI before the Remote namespace.
 */
export declare function mountPlanReviewTimeout(ctx: Context, contribution: TypertRemoteContribution): Promise<() => Promise<void>>;
//# sourceMappingURL=mount.d.ts.map