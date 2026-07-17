/*
 * This file defines the shape of the assessment's private state,
 * as well as the single witness function that accesses it.
 */

import { Ledger } from "./managed/assessment/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

/* **********************************************************************
 * The only hidden state needed by the assessment contract is the
 * user's answers to the assessment questions. Some of the library code
 * and compiler-generated code is parameterized by the type of our
 * private state, so we define a type for it and a function to make
 * an object of that type.
 */

export type AssessmentPrivateState = {
  readonly answers: Uint8Array;
};

export const createAssessmentPrivateState = (answers: Uint8Array) => ({
  answers,
});

/* **********************************************************************
 * The hardcoded answer key never leaves this module: it is not part of
 * the private state, not a circuit parameter, and never touches the
 * ledger. Only the score derived from it crosses into the circuit, and
 * only the pass/fail comparison of that score is ever disclosed on-chain.
 */
// All 10 questions are Yes/No, option index 0 = "Yes", and every question's
// protocol-compliant answer is "Yes".
const ANSWER_KEY: Uint8Array = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

/* **********************************************************************
 * Fixture answer sets for the CLI demo path and e2e tests. These are
 * hardcoded stand-ins for a real candidate's answers - not derived from
 * ANSWER_KEY at runtime, just fixed test data with a known score.
 */

// Matches ANSWER_KEY at every position except indices 2 and 7 -> score 8/10 (pass).
export const PASSING_CANDIDATE_ANSWERS: Uint8Array = new Uint8Array([0, 0, 1, 0, 0, 0, 0, 1, 0, 0]);

// Matches ANSWER_KEY at no position -> score 0/10 (fail).
export const FAILING_CANDIDATE_ANSWERS: Uint8Array = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

/* **********************************************************************
 * The witnesses object for the assessment contract is an object with a
 * field for each witness function, mapping the name of the function to
 * its implementation.
 *
 * The implementation of each function always takes as its first argument
 * a value of type WitnessContext<L, PS>, where L is the ledger object type
 * that corresponds to the ledger declaration in the Compact code, and PS
 * is the private state type, like AssessmentPrivateState defined above.
 *
 * The function's return value is a tuple of the new private state and the
 * declared return value. In this case, that's an AssessmentPrivateState
 * and a bigint (because the contract declares a return value of
 * Uint<0..10>, and that's a bigint in TypeScript).
 *
 * The computeScore witness does not need the ledger or contractAddress
 * from the WitnessContext, so it uses the parameter notation that puts
 * only the binding for the privateState in scope.
 */
export const assessmentWitnesses = {
  computeScore: ({
    privateState,
  }: WitnessContext<Ledger, AssessmentPrivateState>): [
    AssessmentPrivateState,
    bigint,
  ] => {
    const { answers } = privateState;
    let score = 0n;
    for (let i = 0; i < ANSWER_KEY.length; i++) {
      if (answers[i] === ANSWER_KEY[i]) {
        score += 1n;
      }
    }
    return [privateState, score];
  },
};
