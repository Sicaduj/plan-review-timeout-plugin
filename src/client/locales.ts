/** Locale-owned copy for the plan-review timeout card. */

/** Dictionary namespace for this plugin. */
export const NS = 'planReviewTimeout'

/** English copy and key source. */
export const en = {
  title: 'Plan review timeout',
  description: 'Choose how long the plan review from exit_plan_mode stays open waiting for your decision. Default: 120,000 ms (2 minutes).',
  fieldLabel: 'Plan review timeout (milliseconds)',
  defaultLabel: 'Default: 120,000 ms (2 minutes)',
  rangeHelpLabel: 'Allowed timeout range',
  rangeHelp: 'Allowed range: {min} ms (10 seconds) to {max} ms (about 24.8 days, the longest delay a platform timer schedules exactly). The default is {default} ms (2 minutes). Values must be whole numbers of milliseconds.',
  behaviorHelpLabel: 'What happens when the timeout expires',
  behaviorHelp: 'If the plan has not been approved or dismissed before the timeout expires, the review is dismissed without approval and the turn ends; plan mode stays active. A review already under way keeps the duration it started with.',
  invalid: 'Enter a whole number of milliseconds between {min} and {max}.',
  loading: 'Loading the current plan review timeout…',
  loadFailed: 'The plan review timeout could not be loaded.',
  retry: 'Retry',
  refresh: 'Refresh',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved plan review timeout: {value} ms.',
  saveFailed: 'The plan review timeout was not saved. Your draft is unchanged.',
  saveUnconfirmed: 'The write was committed, but the effective value could not be confirmed. Accepted value: {value} ms. Refresh before another write.',
  saveUnknown: 'The write outcome is unknown. Requested value: {value} ms. Refresh before trying another write.',
  reset: 'Reset to 120,000 ms',
  resetStaged: 'Reset to 120,000 ms is staged. Select Save to apply it.',
}

/** Locale dictionary key union. */
export type PlanReviewTimeoutLocaleKey = keyof typeof en

/** Simplified Chinese copy. */
export const zh: Record<PlanReviewTimeoutLocaleKey, string> = {
  title: '计划审查超时',
  description: '设置 exit_plan_mode 的计划审查等待用户决定的时长。默认值：120,000 毫秒（2 分钟）。',
  fieldLabel: '计划审查超时（毫秒）',
  defaultLabel: '默认值：120,000 毫秒（2 分钟）',
  rangeHelpLabel: '允许的超时范围',
  rangeHelp: '允许范围：{min} 毫秒（10 秒）到 {max} 毫秒（约 24.8 天，平台定时器可精确调度的最长延迟）。默认值为 {default} 毫秒（2 分钟）。值必须是整毫秒数。',
  behaviorHelpLabel: '超时到期后会发生什么',
  behaviorHelp: '如果超时到期前计划尚未被批准或关闭，审查将不获批准地关闭，本轮回复结束；计划模式保持启用。已在进行的审查保留其开始时的时长。',
  invalid: '请输入 {min} 到 {max} 之间的整毫秒数。',
  loading: '正在加载当前计划审查超时…',
  loadFailed: '无法加载计划审查超时。',
  retry: '重试',
  refresh: '刷新',
  save: '保存',
  saving: '保存中…',
  saved: '已保存计划审查超时：{value} 毫秒。',
  saveFailed: '计划审查超时未保存，你的修改仍保留。',
  saveUnconfirmed: '写入已提交，但无法确认当前生效值。已接受的值：{value} 毫秒。再次写入前请先刷新。',
  saveUnknown: '写入结果未知。请求值：{value} 毫秒。重试写入前请先刷新。',
  reset: '重置为 120,000 毫秒',
  resetStaged: '重置为 120,000 毫秒尚未保存，请选择“保存”应用。',
}
