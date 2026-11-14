import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PlanReviewTimeoutPanel } from "./PlanReviewTimeoutPanel.js";
import css from './PlanReviewTimeoutCard.module.css';
/** Render the settings page: title, purpose, and the shared staged editor. */
export function PlanReviewTimeoutSection(props) {
    const { t } = props;
    const state = props.usePlanReviewTimeout(snapshot => snapshot);
    return (_jsxs("div", { className: css.section, children: [_jsx("h2", { className: css.sectionTitle, children: t('title') }), _jsx("p", { className: css.sectionDescription, children: t('description') }), _jsx(PlanReviewTimeoutPanel, { t: t, state: state, edit: props.edit, reset: props.reset, save: () => { void props.save(); }, retry: () => { void props.retry(); } })] }));
}
//# sourceMappingURL=PlanReviewTimeoutSection.js.map