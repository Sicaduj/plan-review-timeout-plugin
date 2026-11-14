/** Staged browser state over the shared Host get/set operations. */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { TypertClientRemote } from '@deepseek-ai/dsh-typert-protocol';
/** Generated Client methods for this plugin's own Remote namespace. */
export type PlanReviewTimeoutRemote = TypertClientRemote['planReviewTimeout'];
/** Current read state; loading, unavailable, and a readable value stay distinct. */
export type PlanReviewTimeoutRead = {
    kind: 'loading';
} | {
    kind: 'ready';
    timeoutMs: number;
} | {
    kind: 'error';
    message: string;
};
/** A write that needs a fresh read before another write may be attempted. */
export interface PlanReviewTimeoutConfirmationIssue {
    kind: 'unconfirmed' | 'unknown';
    timeoutMs: number;
}
/** Complete card snapshot published to the slot renderer. */
export interface PlanReviewTimeoutState {
    read: PlanReviewTimeoutRead;
    defaultTimeoutMs: number;
    minTimeoutMs: number;
    maxTimeoutMs: number;
    draft: string;
    saving: boolean;
    saved: boolean;
    resetStaged: boolean;
    saveError: string | undefined;
    confirmationIssue: PlanReviewTimeoutConfirmationIssue | undefined;
}
/** Actions and observable state bound by the slot renderer. */
export interface PlanReviewTimeoutFace {
    readonly hooks: {
        readonly planReviewTimeout: SnapshotStore<PlanReviewTimeoutState>;
    };
    edit(text: string): void;
    reset(): void;
    save(): Promise<void>;
    retry(): Promise<void>;
}
/** Own pending calls and staged state for one Client plugin lifetime. */
export declare class PlanReviewTimeoutController {
    private readonly remote;
    private readonly store;
    private readonly lifetime;
    private readonly pending;
    private readGeneration;
    private disposed;
    constructor(remote: PlanReviewTimeoutRemote);
    /** Bind state and actions without exposing the Remote service to the component. */
    inject(): PlanReviewTimeoutFace;
    /** Start the initial authoritative read; the card shows loading until it settles. */
    load(): Promise<void>;
    /** Cancel pending Remote calls and wait for their settlement before unmounting the namespace. */
    dispose(): Promise<void>;
    private edit;
    private reset;
    private save;
    private track;
}
//# sourceMappingURL=controller.d.ts.map