import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const root = join(import.meta.dirname, '..')
const read = path => readFileSync(join(root, path), 'utf8')
const manifest = JSON.parse(read('package.json'))
const client = read('lib/client.js')
const host = read('lib/index.js')
const hostRemote = read('lib/typert.host.js')

describe('standalone bundle artifacts', () => {
  it('declares the market-eligible package, real bundle patch, display resources, and built exports', () => {
    assert.equal(manifest.name, '@deepseek-ai/dsh-experimental-plan-review-timeout')
    assert.notEqual(manifest.private, true)
    assert.equal(manifest.engines.dsh, '*')
    assert.equal(manifest.repository.url, 'git+https://github.com/Sicaduj/plan-review-timeout-plugin.git')
    assert.ok(manifest.homepage.startsWith('https://'))
    assert.ok(manifest.keywords.includes('exit-plan-mode'))
    assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
    assert.equal(manifest.dsh.client.platform, 'web')
    assert.equal(manifest.exports['./icon'], './icon.svg')
    for (const subpath of ['.', './client', './remote', './typert', './types']) {
      assert.ok(manifest.exports[subpath], `missing export ${subpath}`)
      const target = manifest.exports[subpath].default
      if (target !== undefined) assert.ok(statSync(join(root, target)).isFile(), target)
    }
    for (const locale of ['en', 'zh']) {
      const metadata = JSON.parse(read(`locale/${locale}.json`))
      assert.ok(metadata.meta.title.length > 0)
      assert.ok(metadata.meta.description.length > 0)
    }
  })

  it('inserts only the intended Host+Client package row with its default timeout', () => {
    assert.equal(read('cordis.patch.yml'),
      "- insert:\n    - id: plan-review-timeout\n      name: '@deepseek-ai/dsh-experimental-plan-review-timeout'\n      config:\n        timeoutMs: 120000\n")
  })

  it('ships a small original SVG without external resources or script', () => {
    const icon = read('icon.svg')
    assert.ok(icon.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'))
    assert.ok(icon.includes('viewBox="0 0 64 64"'))
    assert.ok(!/(?:<script|href=|xlink:href=)/.test(icon))
    assert.ok(statSync(join(root, 'icon.svg')).size <= 256 * 1024)
  })

  it('emits the expected module-loader id and only allowed browser module requests', () => {
    assert.ok(client.includes('window.__ModuleLoader__.load('))
    assert.ok(client.includes('@deepseek-ai/dsh-experimental-plan-review-timeout'))
    const requests = [...client.matchAll(/\brequire\("([^"]+)"\)/g)].map(match => match[1]).sort()
    assert.deepEqual(requests, ['@deepseek-ai/dsh-client-store', 'react', 'react/jsx-runtime', 'zod'])
    assert.ok(client.includes('ctx.remote.$mount'))
    assert.ok(client.includes('remote.planReviewTimeout'))
    assert.ok(client.includes('plugins.item'))
  })

  it('generates matching get/set Remote descriptors and strict request codecs', () => {
    assert.ok(hostRemote.includes("'planReviewTimeout/get'"))
    assert.ok(hostRemote.includes("'planReviewTimeout/set'"))
    assert.ok(hostRemote.includes("service: 'planReviewTimeout'"))
    assert.ok(hostRemote.includes('strictObject'))
    assert.ok(hostRemote.includes("'confirmation'"))
    assert.ok(hostRemote.includes("'unconfirmed'"))
    const declarations = read('lib/typert.remote-client.d.ts')
    assert.ok(declarations.includes("'planReviewTimeout': TypertRemoteNamespace$"))
    assert.ok(declarations.includes('get: (signal?: AbortSignal)'))
    assert.ok(declarations.includes('set: (request: SetPlanReviewTimeoutRequest'))
    assert.ok(declarations.includes("import type { PlanReviewTimeoutSnapshot, SetPlanReviewTimeoutRequest } from '@deepseek-ai/dsh-experimental-plan-review-timeout/types'"))
  })

  it('ships both accessible tooltips, including the disclosed duration bounds', () => {
    for (const text of [
      'aria-describedby',
      'onMouseEnter',
      'onFocus',
      'onBlur',
      'Escape',
      'Allowed timeout range',
      'Allowed range: {min} ms (10 seconds) to {max} ms (about 24.8 days, the longest delay a platform timer schedules exactly). The default is {default} ms (2 minutes). Values must be whole numbers of milliseconds.',
      'What happens when the timeout expires',
      'If the plan has not been approved or dismissed before the timeout expires, the review is dismissed without approval and the turn ends; plan mode stays active. A review already under way keeps the duration it started with.',
      'Enter a whole number of milliseconds between {min} and {max}.',
      'Reset to 120,000 ms',
      'Saved plan review timeout: {value} ms.',
      '允许范围：{min} 毫秒（10 秒）到 {max} 毫秒',
    ]) assert.ok(client.includes(text), `missing built UI behavior/copy: ${text}`)
  })

  it('ships read ordering and committed-unconfirmed guards in the rebuilt browser output', () => {
    assert.ok(client.includes('readGeneration'))
    assert.ok(client.includes('generation!==this.readGeneration'))
    assert.ok(client.includes('confirmationIssue'))
    assert.ok(client.includes('result.value.confirmation'))
    assert.ok(client.includes('unconfirmed'))
    assert.ok(client.includes('planReviewTimeout/save-failed'))
    assert.ok(client.includes('The write outcome is unknown.'))
    assert.ok(client.includes('The write was committed, but the effective value could not be confirmed.'))
    assert.ok(client.includes('Refresh before another write.'))
    assert.ok(client.includes('minTimeoutMs'))
    assert.ok(client.includes('maxTimeoutMs'))
  })

  it('ships the plan-review deadline wrapper and its dismissal outcome', () => {
    assert.ok(host.includes('"exit_plan_mode"'))
    assert.ok(host.includes('"PLAN_REVIEW_TIMEOUT"'))
    assert.ok(host.includes('deadline(exec.signal, timeoutMs, PLAN_REVIEW_TIMEOUT)'))
    assert.ok(host.includes('timeoutOf(d.signal, "PLAN_REVIEW_TIMEOUT")'))
    assert.ok(host.includes('exec.concludeTurn()'))
    assert.ok(host.includes('approved: false'))
    assert.ok(host.includes('The review wait expired after'))
    assert.ok(host.includes('Do not present the plan again until the user asks'))
    assert.ok(host.includes('planReviewTimeout/invalid'))
    assert.ok(host.includes('planReviewTimeout/unavailable'))
    assert.ok(host.includes('planReviewTimeout/save-failed'))
    assert.ok(host.includes('2147483647'))
  })

  it('enforces the disclosed bounds in the shared Host and Client logic', () => {
    const timeout = read('lib/types/timeout.js')
    assert.ok(timeout.includes('DEFAULT_PLAN_REVIEW_TIMEOUT_MS'))
    assert.ok(timeout.includes('MIN_PLAN_REVIEW_TIMEOUT_MS'))
    assert.ok(timeout.includes('MAX_PLAN_REVIEW_TIMEOUT_MS'))
    assert.ok(read('src/timeout.ts').includes('10_000'))
    assert.ok(read('src/timeout.ts').includes('2_147_483_647'))
  })

  it('uses theme tokens rather than literal colors in component styles', () => {
    const css = read('src/client/PlanReviewTimeoutCard.module.css')
    assert.ok(!/(?:#[\da-f]{3,8}\b|\brgba?\(|:\s*(?:white|black)\b)/i.test(css))
    for (const token of ['--dsw-alias-bg-base', '--dsw-alias-bg-overlay', '--dsw-alias-border-l2', '--dsw-alias-label-primary', '--dsw-alias-state-error-primary']) {
      assert.ok(css.includes(`var(${token})`), token)
    }
  })
})
