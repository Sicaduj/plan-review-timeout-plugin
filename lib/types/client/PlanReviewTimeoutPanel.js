import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Staged editor body shared by the Plugins card and the Settings section. */
import { useId, useState } from 'react';
import { parsePlanReviewTimeoutDraft } from "../timeout.js";
import css from './PlanReviewTimeoutCard.module.css';
/** Hover, focus, click, and Escape-accessible explanation. */
function InfoTooltip(props) {
    const id = useId();
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [pinned, setPinned] = useState(false);
    const open = hovered || focused || pinned;
    return (_jsxs("span", { className: css.tooltip, children: [_jsx("button", { type: "button", className: css.infoButton, "aria-label": props.label, "aria-describedby": id, "aria-controls": id, "aria-expanded": open, onClick: () => { setPinned(value => !value); }, onMouseEnter: () => { setHovered(true); }, onMouseLeave: () => { setHovered(false); }, onFocus: () => { setFocused(true); }, onBlur: () => {
                    setFocused(false);
                    setPinned(false);
                }, onKeyDown: (event) => {
                    if (event.key !== 'Escape')
                        return;
                    event.preventDefault();
                    setHovered(false);
                    setFocused(false);
                    setPinned(false);
                }, children: _jsx("span", { "aria-hidden": "true", children: "i" }) }), _jsx("span", { id: id, role: "tooltip", className: css.tooltipBubble, hidden: !open, children: props.content })] }));
}
/** Render loading, failure, confirmation, or the staged editor. */
export function PlanReviewTimeoutPanel(props) {
    const { t, state } = props;
    const fieldId = useId();
    const invalidId = `${fieldId}-invalid`;
    const issue = state.confirmationIssue;
    const confirmationMessage = issue === undefined
        ? undefined
        : issue.kind === 'unconfirmed'
            ? t('saveUnconfirmed', { value: issue.timeoutMs })
            : t('saveUnknown', { value: issue.timeoutMs });
    const bounds = { min: state.minTimeoutMs, max: state.maxTimeoutMs, default: state.defaultTimeoutMs };
    if (state.read.kind === 'loading') {
        return (_jsxs("div", { className: css.panel, children: [confirmationMessage === undefined ? null : _jsx("p", { className: css.status, role: "alert", children: confirmationMessage }), _jsx("p", { className: css.status, role: "status", children: t('loading') })] }));
    }
    if (state.read.kind === 'error') {
        return (_jsxs("div", { className: css.panel, children: [confirmationMessage === undefined ? null : _jsx("p", { className: css.error, role: "alert", children: confirmationMessage }), _jsxs("p", { className: css.error, role: "alert", children: [t('loadFailed'), " ", state.read.message] }), _jsx("button", { type: "button", className: css.secondaryButton, onClick: props.retry, children: issue === undefined ? t('retry') : t('refresh') })] }));
    }
    const parsed = parsePlanReviewTimeoutDraft(state.draft);
    const invalid = parsed === undefined;
    const dirty = state.draft !== String(state.read.timeoutMs);
    return (_jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.fieldHeader, children: [_jsx("label", { htmlFor: fieldId, children: t('fieldLabel') }), _jsx(InfoTooltip, { label: t('rangeHelpLabel'), content: t('rangeHelp', bounds) }), _jsx(InfoTooltip, { label: t('behaviorHelpLabel'), content: t('behaviorHelp') })] }), _jsx("input", { id: fieldId, className: css.input, type: "text", inputMode: "numeric", autoComplete: "off", value: state.draft, disabled: state.saving, "aria-invalid": invalid, "aria-describedby": invalid ? invalidId : undefined, onChange: (event) => { props.edit(event.currentTarget.value); } }), _jsxs("div", { className: css.defaultRow, children: [_jsx("span", { children: t('defaultLabel') }), _jsx("button", { type: "button", className: css.secondaryButton, disabled: state.saving, onClick: props.reset, children: t('reset') })] }), invalid ? _jsx("p", { id: invalidId, className: css.error, role: "alert", children: t('invalid', bounds) }) : null, state.resetStaged ? _jsx("p", { className: css.status, role: "status", children: t('resetStaged') }) : null, confirmationMessage === undefined ? null : (_jsxs("div", { className: css.defaultRow, children: [_jsx("p", { className: css.status, role: "alert", children: confirmationMessage }), _jsx("button", { type: "button", className: css.secondaryButton, onClick: props.retry, children: t('refresh') })] })), state.saveError === undefined ? null : (_jsxs("p", { className: css.error, role: "alert", children: [issue === undefined ? t('saveFailed') : null, " ", state.saveError] })), state.saved ? _jsx("p", { className: css.success, role: "status", children: t('saved', { value: state.read.timeoutMs }) }) : null, _jsx("div", { className: css.footer, children: _jsx("button", { type: "button", className: css.saveButton, disabled: invalid || !dirty || state.saving || issue !== undefined, onClick: props.save, children: state.saving ? t('saving') : t('save') }) })] }));
}
//# sourceMappingURL=PlanReviewTimeoutPanel.js.map