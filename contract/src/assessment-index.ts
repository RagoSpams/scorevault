import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/assessment/contract/index.js";
export * from "./assessment-witnesses";

import * as CompiledAssessmentContract from "./managed/assessment/contract/index.js";
import * as Witnesses from "./assessment-witnesses";

export const CompiledAssessmentContractContract = CompiledContract.make<
  CompiledAssessmentContract.Contract<Witnesses.AssessmentPrivateState>
>(
  "Assessment",
  CompiledAssessmentContract.Contract<Witnesses.AssessmentPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.assessmentWitnesses),
  CompiledContract.withCompiledFileAssets("./managed/assessment"),
);
