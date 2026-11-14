import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { PlanReviewTimeoutFace } from './controller.ts';
/** Framework-derived props for the settings card. */
export type PlanReviewTimeoutCardProps = PropsRuntime<'plugins.item'> & PropsLocale<'planReviewTimeout'> & InjectFace<PlanReviewTimeoutFace>;
/** Render a summary, loading/error status, or the staged editor. */
export declare function PlanReviewTimeoutCard(props: PlanReviewTimeoutCardProps): string | import("react").JSX.Element;
//# sourceMappingURL=PlanReviewTimeoutCard.d.ts.map