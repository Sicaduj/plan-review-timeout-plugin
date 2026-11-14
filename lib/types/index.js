/**
 * Configurable lifetime for the `exit_plan_mode` plan review. A
 * `tools/execute` wrapper arms a cooperative deadline for the plan-review
 * tool call; when the user has not decided by the configured duration, the
 * review closes exactly like a dismissed review (no approval, plan mode stays
 * active, the turn ends) instead of blocking the turn indefinitely. The
 * duration is deployment configuration, read and written through the Plugins
 * settings card and this plugin's own Loader entry.
 *
 * @module @deepseek-ai/dsh-experimental-plan-review-timeout
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { deadline, timeoutOf } from '@deepseek-ai/dsh-timeout';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import { DEFAULT_PLAN_REVIEW_TIMEOUT_MS, MAX_PLAN_REVIEW_TIMEOUT_MS, MIN_PLAN_REVIEW_TIMEOUT_MS, isPlanReviewTimeout, isTimerDelay, } from "./timeout.js";
export { DEFAULT_PLAN_REVIEW_TIMEOUT_MS, MAX_PLAN_REVIEW_TIMEOUT_MS, MIN_PLAN_REVIEW_TIMEOUT_MS, } from "./timeout.js";
/** Loader entry id of this plugin's own configuration row. */
const ENTRY_ID = 'plan-review-timeout';
/** Loader entry name of this plugin's own configuration row. */
const PACKAGE_NAME = '@deepseek-ai/dsh-experimental-plan-review-timeout';
/** The plan-review tool whose review wait this plugin bounds. */
const EXIT_PLAN_MODE = 'exit_plan_mode';
/**
 * Deadline classification code owned by this plugin, used both as the
 * internal {@link deadline} code and on nothing model-facing. Scoping
 * {@link timeoutOf} to it keeps a nested outer deadline from being misread as
 * this plugin's own expiry.
 */
export const PLAN_REVIEW_TIMEOUT = 'PLAN_REVIEW_TIMEOUT';
/** Cordis plugin name used by loader diagnostics. */
export const name = 'plan-review-timeout';
/** Model-facing text replacing the plan-review call when its wait expires. */
function timedOutContent(timeoutMs) {
    return [{
            type: 'text',
            text: 'The user dismissed the plan review to reply in their own words; plan mode remains active. '
                + `The review wait expired after ${timeoutMs}ms without a decision, so the plan was not approved. `
                + 'Do not present the plan again until the user asks; end your response.',
        }];
}
export const Config = z.object({
    timeoutMs: z.number().step(1).min(MIN_PLAN_REVIEW_TIMEOUT_MS).max(MAX_PLAN_REVIEW_TIMEOUT_MS)
        .default(DEFAULT_PLAN_REVIEW_TIMEOUT_MS),
});
let PlanReviewTimeoutController = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _get_decorators;
    let _set_decorators;
    return class PlanReviewTimeoutController extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _get_decorators = [Remote];
            _set_decorators = [Remote];
            __esDecorate(this, null, _get_decorators, { kind: "method", name: "get", static: false, private: false, access: { has: obj => "get" in obj, get: obj => obj.get }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _set_decorators, { kind: "method", name: "set", static: false, private: false, access: { has: obj => "set" in obj, get: obj => obj.set }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        config = __runInitializers(this, _instanceExtraInitializers);
        static inject = ['configEditor', 'tools', 'typert'];
        static Config = Config;
        constructor(ctx, config) {
            super(ctx, 'planReviewTimeout', { namespace: 'planReviewTimeout' });
            this.config = config;
            ctx.effect(() => ctx.on('tools/execute', (exec, next) => this.boundReview(exec, next)), 'plan-review-timeout: plan-review deadline');
        }
        /**
         * Read the effective plan-review timeout.
         * @param signal - browser or tool cancellation before the read.
         * @returns the effective duration and the disclosed bounds and default.
         */
        get(signal) {
            signal.throwIfAborted();
            const row = this.configuration();
            const configured = this.resolveTimeoutMs(row);
            if (!isPlanReviewTimeout(configured)) {
                throw new RemoteError('planReviewTimeout/unavailable', 'The plan review timeout is not a readable whole-millisecond value within bounds', {});
            }
            return {
                timeoutMs: configured,
                defaultTimeoutMs: DEFAULT_PLAN_REVIEW_TIMEOUT_MS,
                minTimeoutMs: MIN_PLAN_REVIEW_TIMEOUT_MS,
                maxTimeoutMs: MAX_PLAN_REVIEW_TIMEOUT_MS,
                confirmation: 'confirmed',
            };
        }
        /**
         * Persist one plan-review timeout through ordinary Loader reconciliation.
         * The saved duration applies to plan reviews that start after the write;
         * a review already under way keeps the duration read when it started.
         * @param request - whole-millisecond replacement within the disclosed bounds.
         * @param signal - cancellation checked before the non-cancellable configuration write starts.
         * @returns a confirmed fresh effective read, or the accepted request value marked unconfirmed when only that read fails.
         */
        async set(request, signal) {
            signal.throwIfAborted();
            if (!isPlanReviewTimeout(request.timeoutMs)) {
                throw new RemoteError('planReviewTimeout/invalid', `timeoutMs must be a whole number of milliseconds between ${MIN_PLAN_REVIEW_TIMEOUT_MS} and ${MAX_PLAN_REVIEW_TIMEOUT_MS}`, {});
            }
            const entry = this.ctx.configEditor.entries().find(candidate => candidate.options.id === ENTRY_ID && candidate.options.name === PACKAGE_NAME);
            if (entry === undefined) {
                throw new RemoteError('planReviewTimeout/unavailable', 'The plan review timeout configuration is not available in this profile', {});
            }
            try {
                await this.ctx.configEditor.edit(entry, current => ({ ...current, timeoutMs: request.timeoutMs }));
            }
            catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                throw new RemoteError('planReviewTimeout/save-failed', `The plan review timeout could not be saved: ${reason}`, {});
            }
            try {
                return this.get(new AbortController().signal);
            }
            catch (error) {
                return {
                    timeoutMs: request.timeoutMs,
                    defaultTimeoutMs: DEFAULT_PLAN_REVIEW_TIMEOUT_MS,
                    minTimeoutMs: MIN_PLAN_REVIEW_TIMEOUT_MS,
                    maxTimeoutMs: MAX_PLAN_REVIEW_TIMEOUT_MS,
                    confirmation: 'unconfirmed',
                    confirmationError: error instanceof Error ? error.message : String(error),
                };
            }
        }
        /**
         * Arm the configured review deadline around the plan-review call. The
         * wrapper swaps a deadline-derived signal onto the execution so the
         * blocking review reaches quiescence when the wait expires, then restores
         * the caller's own signal so post-execute listeners never see the deadline
         * signal. Expiry settles the call exactly like a dismissed review: the
         * unapproved outcome, the dismissal turn marker, and the plan mode state
         * that remains active.
         *
         * @param exec - around-dispatch view of the executing call.
         * @param next - the rest of the dispatch chain, including the tool body.
         * @returns the delegated result unchanged, or the dismissal outcome when
         *   this plugin's deadline expired first.
         */
        async boundReview(exec, next) {
            const env_1 = { stack: [], error: void 0, hasError: false };
            try {
                if (exec.name !== EXIT_PLAN_MODE)
                    return await next();
                const timeoutMs = this.enforcedTimeoutMs();
                const d = __addDisposableResource(env_1, deadline(exec.signal, timeoutMs, PLAN_REVIEW_TIMEOUT), false);
                const upstream = exec.signal;
                exec.signal = d.signal;
                try {
                    const result = await next();
                    if (timeoutOf(d.signal, PLAN_REVIEW_TIMEOUT) === undefined) {
                        return result;
                    }
                    // The same turn marker the tool sets when the user dismisses the review,
                    // so an expired wait ends the turn instead of leaving the model looping
                    // on a re-presented plan.
                    exec.concludeTurn();
                    return {
                        isError: false,
                        value: { approved: false },
                        content: timedOutContent(timeoutMs),
                    };
                }
                finally {
                    exec.signal = upstream;
                }
            }
            catch (e_1) {
                env_1.error = e_1;
                env_1.hasError = true;
            }
            finally {
                __disposeResources(env_1);
            }
        }
        /**
         * The duration enforced for new reviews: the live row when readable, else
         * the loaded configuration. A resolved duration only needs to schedule a
         * platform timer; the tighter settings-card bounds govern user input, while
         * configuration itself is validated where it is written or loaded.
         */
        enforcedTimeoutMs() {
            const row = this.tryConfiguration();
            const resolved = row === undefined ? undefined : this.resolveTimeoutMs(row);
            return isTimerDelay(resolved) ? resolved : this.config.timeoutMs;
        }
        /** The entry's effective value first, then the explicit and inherited layers, else the loaded configuration. */
        resolveTimeoutMs(row) {
            const effective = row.entry.fiber?.effectiveConfig;
            const hasEffectiveTimeoutMs = typeof effective === 'object' && effective !== null && 'timeoutMs' in effective;
            return hasEffectiveTimeoutMs
                ? effective.timeoutMs
                : row.override.timeoutMs ?? row.inherited.timeoutMs ?? this.config.timeoutMs;
        }
        tryConfiguration() {
            try {
                return this.configuration();
            }
            catch {
                // The row is absent during raw loads that skip this plugin's patch; the
                // loaded configuration value stays authoritative for enforcement.
                return undefined;
            }
        }
        configuration() {
            const row = this.ctx.configEditor.configuration().find(candidate => candidate.entry.options.id === ENTRY_ID && candidate.entry.options.name === PACKAGE_NAME);
            if (row === undefined) {
                throw new RemoteError('planReviewTimeout/unavailable', 'The plan review timeout configuration is not available in this profile', {});
            }
            return row;
        }
    };
})();
/**
 * Bound the plan-review wait and serve the settings card's read and write
 * operations on this plugin's own configuration row.
 */
export default PlanReviewTimeoutController;
//# sourceMappingURL=index.js.map