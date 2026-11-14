/** Navigation glyph for the settings-options entry. */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the settings domain's SlotMap merge (the 'settings.section.icon' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

/** A clock face, sized by the settings navigation row. */
export function PlanReviewTimeoutSectionIcon(props: PropsRuntime<'settings.section.icon'>) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
