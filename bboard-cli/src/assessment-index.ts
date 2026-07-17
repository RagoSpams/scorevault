// SPDX-License-Identifier: Apache-2.0

/*
 * This file is the driver for the assessment demo CLI. It offers exactly two
 * options: submit a hardcoded test candidate's answers and see the pass/fail
 * result, or verify an already-submitted assessment shows a genuine pass -
 * without ever displaying a score or the candidate's answers, because those
 * never leave the witness/circuit boundary in the first place.
 */

import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import { AssessmentAPI, type AssessmentProviders, type AssessmentPrivateStateId } from '../../api/src/assessment-api';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, AssessmentStandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { waitForUnshieldedFunds } from './wallet-utils';
import { AssessmentPrivateState } from '../../contract/src/assessment-witnesses.js';
import { PASSING_CANDIDATE_ANSWERS } from '../../contract/src/assessment-witnesses.js';
import { firstValueFrom } from 'rxjs';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

/* ***********************************************************************
 * This seed gives access to tokens minted in the genesis block of a local
 * development node - only used in standalone networks to build a wallet
 * with initial funds.
 */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Submit assessment answers (hardcoded test candidate) and get a pass/fail result
  2. Verify a submitted assessment shows a genuine pass (no score or answers shown)
  3. Exit
Which would you like to do? `;

const submitTestCandidate = async (providers: AssessmentProviders, logger: Logger): Promise<void> => {
  logger.info('Deploying a fresh assessment contract for the hardcoded test candidate...');
  const api = await AssessmentAPI.deploy(providers, PASSING_CANDIDATE_ANSWERS, logger);
  logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);

  await api.submitAssessment();

  const state = await firstValueFrom(api.state$);
  logger.info(`Result: ${state.passed ? 'PASS' : 'FAIL'}`);
  logger.info(`Contract address (save this to verify later): ${api.deployedContractAddress}`);
};

const verifySubmittedAssessment = async (providers: AssessmentProviders, rli: Interface, logger: Logger): Promise<void> => {
  const contractAddress = await rli.question('What is the contract address (in hex)? ');
  const api = await AssessmentAPI.join(providers, contractAddress, logger);
  const state = await firstValueFrom(api.state$);
  // Deliberately: only `passed` is ever read here. There is no score or
  // answer data anywhere in AssessmentDerivedState to display.
  logger.info(`Verification result: ${state.passed ? 'PASS' : 'FAIL'}`);
};

const mainLoop = async (providers: AssessmentProviders, rli: Interface, logger: Logger): Promise<void> => {
  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    try {
      switch (choice) {
        case '1':
          await submitTestCandidate(providers, logger);
          break;
        case '2':
          await verifySubmittedAssessment(providers, rli, logger);
          break;
        case '3':
          logger.info('Exiting...');
          return;
        default:
          logger.error(`Invalid choice: ${choice}`);
      }
    } catch (e) {
      logError(logger, e);
      logger.info('Returning to main menu...');
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);

    const seed = config instanceof AssessmentStandaloneConfig ? GENESIS_MINT_WALLET_SEED : await rli.question('Enter your wallet seed: ');

    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    const zkConfigProvider = new NodeZkConfigProvider<'submitAssessment'>(config.zkConfigPath);
    const providers: AssessmentProviders = {
      privateStateProvider: levelPrivateStateProvider<AssessmentPrivateStateId, AssessmentPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'Assessment-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
