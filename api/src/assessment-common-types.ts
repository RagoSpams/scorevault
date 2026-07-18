/**
 * Assessment common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { AssessmentPrivateState, Contract, Witnesses } from '../../contract/src/assessment-index';

export const assessmentPrivateStateKey = 'assessmentPrivateState';
export type AssessmentPrivateStateId = typeof assessmentPrivateStateKey;

/**
 * The private states consumed throughout the assessment application.
 *
 * @public
 */
export type AssessmentPrivateStates = {
  readonly assessmentPrivateState: AssessmentPrivateState;
};

/**
 * Represents an assessment contract and its private state.
 *
 * @public
 */
export type AssessmentContract = Contract<AssessmentPrivateState, Witnesses<AssessmentPrivateState>>;

/**
 * The keys of the circuits exported from {@link AssessmentContract}.
 *
 * @public
 */
export type AssessmentCircuitKeys = Exclude<keyof AssessmentContract['impureCircuits'], number | symbol>;

/**
 * The providers required by {@link AssessmentContract}.
 *
 * @public
 */
export type AssessmentProviders = MidnightProviders<AssessmentCircuitKeys, AssessmentPrivateStateId, AssessmentPrivateState>;

/**
 * An {@link AssessmentContract} that has been deployed to the network.
 *
 * @public
 */
export type DeployedAssessmentContract = FoundContract<AssessmentContract>;

/**
 * The derived state exposed to callers of {@link AssessmentAPI}.
 *
 * @remarks
 * This is deliberately the *only* piece of ledger state we ever surface: the
 * `passed` boolean written by the `submitAssessment` circuit. The candidate's
 * answers, the hardcoded answer key, and the computed score never leave the
 * witness/circuit boundary, so there is nothing else to (or that should) show
 * up here.
 */
export type AssessmentDerivedState = {
  readonly passed: boolean;
};

/**
 * The real, on-chain data produced by submitting an assessment - a subset of
 * the SDK's `FinalizedTxData`, containing only its non-privacy-sensitive
 * public fields (never the transaction's private/witness data).
 *
 * @public
 */
export type AssessmentSubmissionReceipt = {
  readonly txHash: string;
  readonly blockHeight: number;
  /** Unix timestamp (seconds) of the block the transaction was included in. */
  readonly blockTimestamp: number;
};
