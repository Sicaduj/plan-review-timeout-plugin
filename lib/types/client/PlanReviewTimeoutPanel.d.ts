import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { PlanReviewTimeoutState } from './controller.ts';
/** Copy seat and staged state one panel render reads. */
export interface PlanReviewTimeoutPanelProps {
    t: PropsLocale<'planReviewTimeout'>['t'];
    state: PlanReviewTimeoutState;
    edit(text: string): void;
    reset(): void;
    save(): void;
    retry(): void;
}
/** Render loading, failure, confirmation, or the staged editor. */
export declare function PlanReviewTimeoutPanel(props: PlanReviewTimeoutPanelProps): import("react").JSX.Element;
//# sourceMappingURL=PlanReviewTimeoutPanel.d.ts.map