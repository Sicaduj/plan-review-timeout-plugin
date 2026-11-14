/** Plugins settings card for staging and saving the plan-review timeout. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { PlanReviewTimeoutFace } from './controller.ts';
/** Framework-derived props for the Plugins card. */
export type PlanReviewTimeoutCardProps = PropsRuntime<'plugins.item'> & PropsLocale<'planReviewTimeout'> & InjectFace<PlanReviewTimeoutFace>;
/** Render a summary or the shared staged editor inside one Plugins row. */
export declare function PlanReviewTimeoutCard(props: PlanReviewTimeoutCardProps): string | import("react").JSX.Element;
//# sourceMappingURL=PlanReviewTimeoutCard.d.ts.map