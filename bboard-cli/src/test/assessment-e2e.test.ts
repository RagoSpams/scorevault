// SPDX-License-Identifier: Apache-2.0

/*
 * Real end-to-end coverage for the assessment demo path: deploys the compiled
 * `submitAssessment` circuit to a local standalone network (real node, real
 * indexer, real proof server), submits candidates, and reads back the public
 * `passed` result - the same two flows the assessment CLI exposes.
 *
 * This is the fallback demo path if the UI isn't ready, so it must exercise
 * genuine proof generation, not the in-process circuit simulator used by the
 * contract package's unit tests.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { firstValueFrom } from 'rxjs';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type EnvironmentConfiguration, type TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { AssessmentStandaloneConfig } from '../config.js';
import { createLogger } from '../logger-utils.js';
import { MidnightWalletProvider } from '../midnight-wallet-provider.js';
import { waitForUnshieldedFunds } from '../wallet-utils.js';
import { AssessmentAPI, type AssessmentProviders, type AssessmentPrivateStateId } from '../../../api/src/assessment-api';
import { type AssessmentPrivateState, PASSING_CANDIDATE_ANSWERS, FAILING_CANDIDATE_ANSWERS } from '../../../contract/src/assessment-witnesses.js';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

let testEnv: TestEnvironment;
let envConfiguration: EnvironmentConfiguration;
let walletProvider: MidnightWalletProvider;

const buildProviders = (storeSuffix: string, config: AssessmentStandaloneConfig): AssessmentProviders => {
  const zkConfigProvider = new NodeZkConfigProvider<'submitAssessment'>(config.zkConfigPath);
  const storeName = `${config.privateStateStoreName}-${storeSuffix}`;
  return {
    privateStateProvider: levelPrivateStateProvider<AssessmentPrivateStateId, AssessmentPrivateState>({
      privateStateStoreName: storeName,
      signingKeyStoreName: `${storeName}-signing-keys`,
      privateStoragePasswordProvider: () => 'Assessment-Test-2026!',
      accountId: GENESIS_MINT_WALLET_SEED,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
};

describe('Assessment contract e2e (real proof server)', () => {
  beforeAll(async () => {
    const config = new AssessmentStandaloneConfig();
    const logger = await createLogger(config.logDir);
    testEnv = config.getEnvironment(logger);
    envConfiguration = await testEnv.start();

    walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, GENESIS_MINT_WALLET_SEED);
    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletProvider.wallet, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    expect(nightBalance).toBeGreaterThan(0n);
  }, 1000 * 60 * 20);

  afterAll(async () => {
    await walletProvider?.stop();
    await testEnv?.shutdown();
  }, 1000 * 60 * 5);

  it('submits a genuinely passing candidate and records only a public PASS', async () => {
    const config = new AssessmentStandaloneConfig();
    const providers = buildProviders('pass', config);

    const submitter = await AssessmentAPI.deploy(providers, PASSING_CANDIDATE_ANSWERS);
    await submitter.submitAssessment();

    const state = await firstValueFrom(submitter.state$);
    expect(state.passed).toBe(true);
    expect(Object.keys(state)).toEqual(['passed']);

    // Verify as an independent observer: fresh providers/private-state store,
    // no access to the candidate's answers - only the contract address.
    const verifierProviders = buildProviders('pass-verifier', config);
    const verifier = await AssessmentAPI.join(verifierProviders, submitter.deployedContractAddress);
    const verifiedState = await firstValueFrom(verifier.state$);
    expect(verifiedState.passed).toBe(true);
    expect(Object.keys(verifiedState)).toEqual(['passed']);
  }, 1000 * 60 * 15);

  it('submits a genuinely failing candidate and records only a public FAIL', async () => {
    const config = new AssessmentStandaloneConfig();
    const providers = buildProviders('fail', config);

    const submitter = await AssessmentAPI.deploy(providers, FAILING_CANDIDATE_ANSWERS);
    await submitter.submitAssessment();

    const state = await firstValueFrom(submitter.state$);
    expect(state.passed).toBe(false);
    expect(Object.keys(state)).toEqual(['passed']);
  }, 1000 * 60 * 15);
});
