/** Plugins settings card for staging and saving the plan-review timeout. */
import { useId, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { parsePlanReviewTimeoutDraft } from '../timeout.ts'
import type { PlanReviewTimeoutFace } from './controller.ts'
import css from './PlanReviewTimeoutCard.module.css'

/** Framework-derived props for the settings card. */
export type PlanReviewTimeoutCardProps = PropsRuntime<'plugins.item'>
  & PropsLocale<'planReviewTimeout'> & InjectFace<PlanReviewTimeoutFace>

interface TooltipProps {
  label: string
  content: string
}

/** Hover, focus, click, and Escape-accessible explanation. */
function InfoTooltip(props: TooltipProps) {
  const id = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || focused || pinned
  return (
    <span className={css.tooltip}>
      <button
        type="button"
        className={css.infoButton}
        aria-label={props.label}
        aria-describedby={id}
        aria-controls={id}
        aria-expanded={open}
        onClick={() => { setPinned(value => !value) }}
        onMouseEnter={() => { setHovered(true) }}
        onMouseLeave={() => { setHovered(false) }}
        onFocus={() => { setFocused(true) }}
        onBlur={() => {
          setFocused(false)
          setPinned(false)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          setHovered(false)
          setFocused(false)
          setPinned(false)
        }}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span id={id} role="tooltip" className={css.tooltipBubble} hidden={!open}>{props.content}</span>
    </span>
  )
}

/** Render a summary, loading/error status, or the staged editor. */
export function PlanReviewTimeoutCard(props: PlanReviewTimeoutCardProps) {
  const { t } = props
  const state = props.usePlanReviewTimeout(snapshot => snapshot)
  const fieldId = useId()
  const invalidId = `${fieldId}-invalid`
  const issue = state.confirmationIssue
  const confirmationMessage = issue === undefined
    ? undefined
    : issue.kind === 'unconfirmed'
      ? t('saveUnconfirmed', { value: issue.timeoutMs })
      : t('saveUnknown', { value: issue.timeoutMs })
  const bounds = { min: state.minTimeoutMs, max: state.maxTimeoutMs, default: state.defaultTimeoutMs }
  if (props.view === 'summary') return t('description')
  if (state.read.kind === 'loading') {
    return (
      <div className={css.card}>
        {confirmationMessage === undefined ? null : <p className={css.status} role="alert">{confirmationMessage}</p>}
        <p className={css.status} role="status">{t('loading')}</p>
      </div>
    )
  }
  if (state.read.kind === 'error') {
    return (
      <div className={css.loadError}>
        {confirmationMessage === undefined ? null : <p role="alert">{confirmationMessage}</p>}
        <p role="alert">{t('loadFailed')} {state.read.message}</p>
        <button type="button" className={css.secondaryButton} onClick={props.retry}>
          {issue === undefined ? t('retry') : t('refresh')}
        </button>
      </div>
    )
  }
  const parsed = parsePlanReviewTimeoutDraft(state.draft)
  const invalid = parsed === undefined
  const dirty = state.draft !== String(state.read.timeoutMs)
  return (
    <section className={css.card} aria-label={t('title')}>
      <div className={css.fieldHeader}>
        <label htmlFor={fieldId}>{t('fieldLabel')}</label>
        <InfoTooltip label={t('rangeHelpLabel')} content={t('rangeHelp', bounds)} />
        <InfoTooltip label={t('behaviorHelpLabel')} content={t('behaviorHelp')} />
      </div>
      <input
        id={fieldId}
        className={css.input}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={state.draft}
        disabled={state.saving}
        aria-invalid={invalid}
        aria-describedby={invalid ? invalidId : undefined}
        onChange={(event) => { props.edit(event.currentTarget.value) }}
      />
      <div className={css.defaultRow}>
        <span>{t('defaultLabel')}</span>
        <button type="button" className={css.secondaryButton} disabled={state.saving} onClick={props.reset}>{t('reset')}</button>
      </div>
      {invalid ? <p id={invalidId} className={css.error} role="alert">{t('invalid', bounds)}</p> : null}
      {state.resetStaged ? <p className={css.status} role="status">{t('resetStaged')}</p> : null}
      {confirmationMessage === undefined ? null : (
        <div className={css.defaultRow}>
          <p className={css.status} role="alert">{confirmationMessage}</p>
          <button type="button" className={css.secondaryButton} onClick={props.retry}>{t('refresh')}</button>
        </div>
      )}
      {state.saveError === undefined ? null : (
        <p className={css.error} role="alert">{issue === undefined ? t('saveFailed') : null} {state.saveError}</p>
      )}
      {state.saved ? <p className={css.success} role="status">{t('saved', { value: state.read.timeoutMs })}</p> : null}
      <div className={css.footer}>
        <button type="button" className={css.saveButton} disabled={invalid || !dirty || state.saving || issue !== undefined} onClick={props.save}>
          {state.saving ? t('saving') : t('save')}
        </button>
      </div>
    </section>
  )
}
