/** Settings-options entry that edits the plan-review timeout directly. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the settings domain's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { PlanReviewTimeoutFace } from './controller.ts'
import { PlanReviewTimeoutPanel } from './PlanReviewTimeoutPanel.tsx'
import css from './PlanReviewTimeoutCard.module.css'

/** Framework-derived props for the settings section page. */
export type PlanReviewTimeoutSectionProps = PropsRuntime<'settings.section'>
  & PropsLocale<'planReviewTimeout'> & InjectFace<PlanReviewTimeoutFace>

/** Render the settings page: title, purpose, and the shared staged editor. */
export function PlanReviewTimeoutSection(props: PlanReviewTimeoutSectionProps) {
  const { t } = props
  const state = props.usePlanReviewTimeout(snapshot => snapshot)
  return (
    <div className={css.section}>
      <h2 className={css.sectionTitle}>{t('title')}</h2>
      <p className={css.sectionDescription}>{t('description')}</p>
      <PlanReviewTimeoutPanel
        t={t}
        state={state}
        edit={props.edit}
        reset={props.reset}
        save={() => { void props.save() }}
        retry={() => { void props.retry() }}
      />
    </div>
  )
}
