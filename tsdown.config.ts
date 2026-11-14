import type { UserConfig } from 'tsdown'
import { clientBundle } from '../deepseek-harness/packages/client/tsdown.client.ts'

/** The slice of a tsdown plugin the workaround rewrites. */
interface HookedPlugin {
  name?: string
  renderChunk?: (...args: never[]) => unknown
}

/**
 * Convert the shared preset's style-factory renderChunk result to the plain
 * `{ code, map }` form. The preset returns its native MagicString instance,
 * which the rolldown binding refuses to serialize (it reports only
 * "Missing field code"); the plain form is equally valid plugin-protocol
 * output. The factory only edits the trailing style marker, so no source map
 * from that rewrite is needed.
 */
function plainStyleFactoryResults(configs: UserConfig[]): UserConfig[] {
  return configs.map(config => ({
    ...config,
    plugins: (config.plugins as HookedPlugin[] | undefined)?.map((plugin) => {
      if (plugin.name !== 'dsh-client-style-factory' || typeof plugin.renderChunk !== 'function') return plugin
      const original = plugin.renderChunk
      return {
        ...plugin,
        async renderChunk(...args: never[]) {
          const result = await (original as (...inner: never[]) => unknown).call(this, ...args)
          if (result !== null && typeof result === 'object' && 'isRolldownMagicString' in result) {
            return { code: String(result), map: undefined }
          }
          return result
        },
      }
    }),
  }))
}

const bundle = clientBundle(import.meta.dirname, ['lib/types/index.js'], { hostPhase: true })

export default (inlineConfig: Pick<UserConfig, 'env'>): UserConfig[] => plainStyleFactoryResults(bundle(inlineConfig))
