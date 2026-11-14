import { PlanReviewTimeoutCard } from "./PlanReviewTimeoutCard.js";
import { PlanReviewTimeoutSection } from "./PlanReviewTimeoutSection.js";
import { PlanReviewTimeoutSectionIcon } from "./PlanReviewTimeoutSectionIcon.js";
import { PlanReviewTimeoutController } from "./controller.js";
import { en, NS, zh } from "./locales.js";
/** Services required before the generated namespace can mount. */
export const inject = ['remote', 'slots', 'locale'];
/** Settings navigation position: after Models and Agent presets. */
const SETTINGS_ORDER = 25;
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
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'plan-review-timeout',
        order: SETTINGS_ORDER,
        label: () => t('nav'),
        locale: NS,
        inject: () => controller.inject(),
    }, PlanReviewTimeoutSection));
    ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
        name: 'settings.section.icon',
        id: 'plan-review-timeout',
        label: () => t('title'),
    }, PlanReviewTimeoutSectionIcon));
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