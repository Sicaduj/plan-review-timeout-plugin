/** Settings-options entry that edits the plan-review timeout directly. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { PlanReviewTimeoutFace } from './controller.ts';
/** Framework-derived props for the settings section page. */
export type PlanReviewTimeoutSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'planReviewTimeout'> & InjectFace<PlanReviewTimeoutFace>;
/** Render the settings page: title, purpose, and the shared staged editor. */
export declare function PlanReviewTimeoutSection(props: PlanReviewTimeoutSectionProps): import("react").JSX.Element;
//# sourceMappingURL=PlanReviewTimeoutSection.d.ts.map