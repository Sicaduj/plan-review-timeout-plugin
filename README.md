# Plan review timeout plugin

A private, standalone Host + Client bundle for DeepSeek Harness. It adds a **Plan review timeout** card to the Plugins settings page that controls how long the `exit_plan_mode` plan review stays open waiting for the user's decision.

## Behavior

`exit_plan_mode` presents the completed plan and blocks for the user's approve/keep-planning decision. This plugin bounds that review wait with a configurable duration. When the wait expires before a decision, the review settles exactly like a dismissed review: the plan is **not** approved, the review closes, the turn ends, and plan mode stays active. The model receives plan-mode's standard dismissal sentence, so it does not re-present the plan in a loop. A review already under way keeps the duration that was configured when it started; saved changes apply to the next review.

The duration is deployment configuration on this plugin's own Loader entry (`plan-review-timeout`), read and written through the Plugins settings card with `configEditor.edit`. Saving changes only `timeoutMs` and preserves the entry's other configuration fields. The card reports loading, saving, validation, success, and failure states. If the edit commits but the fresh confirmation read fails, the result preserves the accepted value as **committed but unconfirmed** and requires an explicit refresh before another write. Gateway, cancellation, and unknown transport outcomes are also held for refresh rather than reported as definite save failures; only known business failures may be retried immediately. Overlapping reads are generation-gated so stale success or failure cannot replace a newer result.

### Duration bounds

- **Default (and Reset):** 120,000 ms (2 minutes).
- **Minimum:** 10,000 ms (10 seconds) — below this a review could close before a reader sees the plan.
- **Maximum:** 2,147,483,647 ms (2^31 − 1, about 24.8 days) — the longest delay a platform timer schedules exactly, the same bound timed user-question waits enforce.

The settings input accepts whole millisecond values within those bounds only. Two tooltips sit beside the field and are hover-, focus-, click-, and Escape-accessible: the first states the allowed range — minimum, maximum, and default, with human-readable equivalents — and the second explains what happens when the timeout expires. The validation message repeats the minimum and maximum.

## Package contents

- `src/index.ts`: Typert Remote Host service, `tools/execute` deadline wrapper for `exit_plan_mode`, and configuration read/write.
- `src/timeout.ts`: shared duration bounds and draft parsing.
- `src/types.ts`: wire values shared by the Host Remote methods and the browser client.
- `src/client/`: generated-Remote mount, staged controller, accessible card with range/behavior tooltips, styles, and English/Chinese dictionaries.
- `lib/`: built Host and browser artifacts plus generated `/typert` and `/remote` contributions.
- `cordis.patch.yml`: Loader insertion for the bundle, with the 120,000 ms default.
- `locale/en.json`, `locale/zh.json`, and `icon.svg`: Plugin Manager display metadata and original artwork.
- `tests/`: focused behavior and artifact checks.

## Build and test

The package uses the sibling DeepSeek Harness checkout at `../deepseek-harness` for its compiler references and the `clientBundle` preset. Install development dependencies only with lifecycle scripts disabled:

```sh
pnpm install --ignore-scripts
pnpm run generate:typert
pnpm run compile
pnpm run bundle
pnpm test
```

No installation, profile edit, or runtime configuration change is performed by these commands. Installation and live browser verification are separate integration steps performed by the integrator.

## Install through Discover (plugin market)

The package declares `dsh.bundle`, is not private, and accepts every DSH version through `engines.dsh: "*"`, so the DSH plugin market generator (`@deepseek-ai/dsh-plugin-market-generator`) lists its Git source in a market index:

1. Tag releases as `vX.Y.Z` (a `v1.0.0` tag lists version 1.0.0); the default-branch commit lists the manifest's current version too.
2. Generate an index from a source list containing this repository URL with `@deepseek-ai/dsh-plugin-market-generator`, and publish the `index.json` over https.
3. Add that index URL as an index source in DSH's Discover page; the entry installs the bundle from the pinned Git commit through guided plugin installation.

The index and detail reads use the reader's Git credential configuration for this private repository, so installation and long-description pages need a machine that can already clone it.

The published market index for this bundle is a secret GitHub gist (unlisted, fetched without credentials):

```text
https://gist.githubusercontent.com/Sicaduj/ab306b08059ad421d74270f7dece403d/raw/index.json
```

To publish a new version: tag `vX.Y.Z`, push the tag, re-run the market generator over `plugins.txt` containing this repository URL, and replace the gist's `index.json` with `gh gist edit ab306b08059ad421d74270f7dece403d index.json`. The Discover index source URL stays the same.

Two build-environment notes:

- `pnpm-workspace.yaml` pins `rolldown` to `1.1.1`, the version the checkout's own toolchain resolves for tsdown.
- `tsdown.config.ts` wraps the shared `clientBundle` preset's style-factory hook to return the plain `{ code, map }` plugin-protocol form instead of its native MagicString instance, which the installed rolldown binding refuses to serialize (it reports only `Missing field code`). The factory only edits the trailing style marker, so that rewrite needs no source map.

## Model Experience

No model-visible surface is added: no tool, no prompt section. The only model-visible effect is the tool result of a timed-out `exit_plan_mode` call, which reuses plan-mode's existing dismissal sentence ("The user dismissed the plan review to reply in their own words; plan mode remains active.") plus the expired-wait note. The turn ends exactly as a user dismissal would.

## Known limitations and deferred work

- The plugin targets a profile whose Loader entries are reachable through `configEditor` and that runs plan mode (`@deepseek-ai/dsh-plan-mode`); without plan mode there is no `exit_plan_mode` call to bound.
- The configured duration bounds each review from the moment the tool call blocks; it cannot extend a review that another deadline in the deployment already cancelled earlier.
- A timeout concludes the turn as a dismissal; a future revision could instead surface a "plan review expired" transcript row so the user can resume with one click.
- Published `@deepseek-ai/dsh-typert-protocol` (through 0.2.2-rc.3) resolves the Cordis root as the string property `ctx.root` while binding a Remote service. Checkout-based DSH builds expose that root only through the `Symbol.for('cordis.root')` key, so the service constructor threw `cannot get property "root" without inject` there. The plugin's `apply` now defines the `root` property from the symbol before constructing the service (a no-op on hosts that still expose the string property), so the published dependency works unchanged in both pairings. The shim is removable once a published `dsh-typert-protocol` reads the symbol key.
