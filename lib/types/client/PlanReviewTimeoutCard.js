import { jsx as _jsx } from "react/jsx-runtime";
import { PlanReviewTimeoutPanel } from "./PlanReviewTimeoutPanel.js";
import css from './PlanReviewTimeoutCard.module.css';
/** Render a summary or the shared staged editor inside one Plugins row. */
export function PlanReviewTimeoutCard(props) {
    const { t } = props;
    const state = props.usePlanReviewTimeout(snapshot => snapshot);
    if (props.view === 'summary')
        return t('description');
    return (_jsx("section", { className: css.card, "aria-label": t('title'), children: _jsx(PlanReviewTimeoutPanel, { t: t, state: state, edit: props.edit, reset: props.reset, save: () => { void props.save(); }, retry: () => { void props.retry(); } }) }));
}
//# sourceMappingURL=PlanReviewTimeoutCard.js.map