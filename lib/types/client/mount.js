import { PlanReviewTimeoutCard } from "./PlanReviewTimeoutCard.js";
import { PlanReviewTimeoutController } from "./controller.js";
import { en, NS, zh } from "./locales.js";
/** Services required before the generated namespace can mount. */
export const inject = ['remote', 'slots', 'locale'];
function registerUi(ctx) {
    const controller = new PlanReviewTimeoutController(ctx.remote.planReviewTimeout);
    ctx.effect(() => () => controller.dispose(), 'plan-review-timeout: pending Remote calls');
    ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'plan-review-timeout: dictionaries');
    const t = ctx.locale.bind(NS);
    ctx.slots.inject('plugins.item', () => ctx.slots.register({
        name: 'plugins.item',
        id: 'plan-review-timeout',
        order: 12,
        label: () => t('title'),
        locale: NS,
        inject: () => controller.inject(),
    }, PlanReviewTimeoutCard));
    void controller.load();
}
/**
 * Mount the generated Remote contribution before injecting its namespace.
 * @param ctx - Client plugin lifetime.
 * @param contribution - generated Remote descriptors for this package.
 * @returns disposer that withdraws UI before the Remote namespace.
 */
export async function mountPlanReviewTimeout(ctx, contribution) {
    const unmountRemote = await ctx.remote.$mount(contribution);
    const ui = ctx.inject(['remote.planReviewTimeout', 'slots', 'locale'], registerUi);
    try {
        await ui;
    }
    catch (error) {
        await ui.dispose();
        await unmountRemote();
        throw error;
    }
    return async () => {
        await ui.dispose();
        await unmountRemote();
    };
}
//# sourceMappingURL=mount.js.map