/** Plugins settings card for staging and saving the plan-review timeout. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { PlanReviewTimeoutFace } from './controller.ts'
import { PlanReviewTimeoutPanel } from './PlanReviewTimeoutPanel.tsx'
import css from './PlanReviewTimeoutCard.module.css'

/** Framework-derived props for the Plugins card. */
export type PlanReviewTimeoutCardProps = PropsRuntime<'plugins.item'>
  & PropsLocale<'planReviewTimeout'> & InjectFace<PlanReviewTimeoutFace>

/** Render a summary or the shared staged editor inside one Plugins row. */
export function PlanReviewTimeoutCard(props: PlanReviewTimeoutCardProps) {
  const { t } = props
  const state = props.usePlanReviewTimeout(snapshot => snapshot)
  if (props.view === 'summary') return t('description')
  return (
    <section className={css.card} aria-label={t('title')}>
      <PlanReviewTimeoutPanel
        t={t}
        state={state}
        edit={props.edit}
        reset={props.reset}
        save={() => { void props.save() }}
        retry={() => { void props.retry() }}
      />
    </section>
  )
}
