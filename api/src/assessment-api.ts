/**
 * Provides types and utilities for working with assessment contracts.
 *
 * @packageDocumentation
 */

import * as Assessment from '../../contract/src/managed/assessment/contract/index.js';

import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type AssessmentDerivedState,
  type AssessmentContract,
  type AssessmentProviders,
  type DeployedAssessmentContract,
  assessmentPrivateStateKey,
} from './assessment-common-types.js';
import { CompiledAssessmentContractContract } from '../../contract/src/assessment-index';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, tap, type Observable } from 'rxjs';
import { AssessmentPrivateState, createAssessmentPrivateState } from '../../contract/src/assessment-witnesses.js';

/**
 * An API for a deployed assessment contract.
 */
export interface DeployedAssessmentAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<AssessmentDerivedState>;

  submitAssessment: () => Promise<void>;
}

/**
 * Provides an implementation of {@link DeployedAssessmentAPI} by adapting a deployed
 * assessment contract.
 *
 * @remarks
 * Only the `passed` field of the ledger is ever surfaced through {@link state$}. The
 * candidate's answers live solely in {@link AssessmentPrivateState}, and the hardcoded
 * answer key lives solely in the witness implementation - neither is read here, and
 * neither ever reaches the ledger.
 */
export class AssessmentAPI implements DeployedAssessmentAPI {
  /** @internal */
  private constructor(
    public readonly deployedContract: DeployedAssessmentContract,
    providers: AssessmentProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => Assessment.ledger(contractState.data)),
        tap((ledgerState) =>
          logger?.trace({
            ledgerStateChanged: {
              ledgerState: {
                passed: ledgerState.passed,
              },
            },
          }),
        ),
        map((ledgerState) => ({ passed: ledgerState.passed })),
      );
  }

  /**
   * Gets the address of the current deployed contract.
   */
  readonly deployedContractAddress: ContractAddress;

  /**
   * Gets an observable stream of state changes, exposing only the public pass/fail result.
   */
  readonly state$: Observable<AssessmentDerivedState>;

  /**
   * Submits the assessment for the candidate identified by the current private state.
   *
   * @remarks
   * The candidate's answers never leave local execution: the `computeScore` witness reads
   * them out of private state, scores them against the hardcoded answer key, and only the
   * resulting pass/fail boolean is disclosed to the ledger.
   */
  async submitAssessment(): Promise<void> {
    this.logger?.info('submittingAssessment');

    const txData = await this.deployedContract.callTx.submitAssessment();

    this.logger?.trace({
      transactionAdded: {
        circuit: 'submitAssessment',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Deploys a new assessment contract to the network for the given candidate's answers.
   *
   * @param providers The assessment providers.
   * @param answers The candidate's private answers (one byte per question).
   * @param logger An optional 'pino' logger to use for logging.
   */
  static async deploy(providers: AssessmentProviders, answers: Uint8Array, logger?: Logger): Promise<AssessmentAPI> {
    logger?.info('deployContract');

    const deployedAssessmentContract = await deployContract(providers, {
      compiledContract: CompiledAssessmentContractContract,
      privateStateId: assessmentPrivateStateKey,
      initialPrivateState: createAssessmentPrivateState(answers),
    });

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedAssessmentContract.deployTxData.public,
      },
    });

    return new AssessmentAPI(deployedAssessmentContract, providers, logger);
  }

  /**
   * Finds an already deployed assessment contract on the network, and joins it purely as a
   * verifier: no private state (answers) is required to read the public `passed` result.
   *
   * @param providers The assessment providers.
   * @param contractAddress The contract address of the deployed assessment contract to join.
   * @param logger An optional 'pino' logger to use for logging.
   */
  static async join(providers: AssessmentProviders, contractAddress: ContractAddress, logger?: Logger): Promise<AssessmentAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedAssessmentContract = await findDeployedContract<AssessmentContract>(providers, {
      contractAddress,
      compiledContract: CompiledAssessmentContractContract,
      privateStateId: assessmentPrivateStateKey,
      initialPrivateState: await AssessmentAPI.getPrivateState(providers, contractAddress),
    });

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedAssessmentContract.deployTxData.public,
      },
    });

    return new AssessmentAPI(deployedAssessmentContract, providers, logger);
  }

  private static async getPrivateState(
    providers: AssessmentProviders,
    contractAddress: ContractAddress,
  ): Promise<AssessmentPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(assessmentPrivateStateKey);
    // A pure verifier never has (or needs) the candidate's answers - an empty
    // placeholder is fine since verification only ever reads `passed` off the ledger.
    return existingPrivateState ?? createAssessmentPrivateState(new Uint8Array(0));
  }
}

export * from './assessment-common-types.js';
