import {
  AssessmentAPI,
  type AssessmentCircuitKeys,
  type AssessmentProviders,
  type AssessmentPrivateStateId,
} from '../../../api/src/assessment-api';
import { BehaviorSubject, firstValueFrom, type Observable } from 'rxjs';
import { type Logger } from 'pino';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { AssessmentPrivateState } from '../../../contract/src/assessment-witnesses';
import { inMemoryPrivateStateProvider } from '../in-memory-private-state-provider';
import { buildSharedWalletProvider, type SharedWalletEnvironment } from './shared-wallet';

/**
 * The phases a single assessment submission passes through, from wallet setup
 * through to the disclosed pass/fail result. Each phase corresponds to a real
 * async boundary in the submission pipeline (see {@link BrowserAssessmentManager.run})
 * - there are no synthetic/timed phases here for the UI to interpolate.
 */
export type AssessmentSubmission =
  | { readonly status: 'preparing' }
  | { readonly status: 'deploying' }
  | { readonly status: 'submitting' }
  | { readonly status: 'confirming' }
  | {
      readonly status: 'result';
      readonly passed: boolean;
      readonly contractAddress: string;
      readonly txHash: string;
      readonly blockHeight: number;
      readonly blockTimestamp: number;
    }
  | { readonly status: 'failed'; readonly error: Error };

/**
 * Network endpoints for the shared wallet. Defaults to preprod (mirrors
 * bboard-cli's PreprodRemoteConfig) - every field can be overridden via env
 * so a .env.<mode> file can point the app at a different network (e.g. a
 * local standalone network) without touching this default.
 */
const NETWORK_ENV: SharedWalletEnvironment = {
  walletNetworkId: (import.meta.env.VITE_NETWORK_ID as string) || 'preprod',
  indexer: (import.meta.env.VITE_INDEXER_URI as string) || 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS:
    (import.meta.env.VITE_INDEXER_WS_URI as string) || 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  nodeWS: (import.meta.env.VITE_NODE_WS_URI as string) || 'wss://rpc.preprod.midnight.network',
  proofServer: (import.meta.env.VITE_PROOF_SERVER_URI as string) || 'http://127.0.0.1:6300',
};

/**
 * Provides access to assessment submissions in a browser setting.
 *
 * @remarks
 * ScoreVault has no login: there is no Lace wallet connection here. Every
 * submission pays its testnet transaction fee from one shared, pre-funded
 * wallet (see {@link buildSharedWalletProvider}), deploys a fresh assessment
 * contract per submission, then invokes `submitAssessment` on it. The
 * candidate's answers only ever leave this process as the private state of
 * that freshly deployed contract - they are never read back out here.
 */
export class BrowserAssessmentManager {
  #initializedProviders: Promise<AssessmentProviders> | undefined;

  constructor(private readonly logger: Logger) {}

  /**
   * Submits a candidate's answers for grading.
   *
   * @param answers One byte per question, in question order.
   * @returns An observable stream of {@link AssessmentSubmission} phases.
   */
  submit(answers: Uint8Array): Observable<AssessmentSubmission> {
    const subject = new BehaviorSubject<AssessmentSubmission>({ status: 'preparing' });
    void this.run(answers, subject);
    return subject;
  }

  private getProviders(): Promise<AssessmentProviders> {
    return this.#initializedProviders ?? (this.#initializedProviders = initializeAssessmentProviders(this.logger));
  }

  private async run(answers: Uint8Array, subject: BehaviorSubject<AssessmentSubmission>): Promise<void> {
    try {
      const providers = await this.getProviders();

      subject.next({ status: 'deploying' });
      const api = await AssessmentAPI.deploy(providers, answers, this.logger);

      subject.next({ status: 'submitting' });
      const receipt = await api.submitAssessment();

      subject.next({ status: 'confirming' });
      const state = await firstValueFrom(api.state$);

      subject.next({
        status: 'result',
        passed: state.passed,
        contractAddress: api.deployedContractAddress,
        txHash: receipt.txHash,
        blockHeight: receipt.blockHeight,
        blockTimestamp: receipt.blockTimestamp,
      });
    } catch (error: unknown) {
      subject.next({ status: 'failed', error: error instanceof Error ? error : new Error(String(error)) });
    }
  }
}

/** @internal */
const initializeAssessmentProviders = async (logger: Logger): Promise<AssessmentProviders> => {
  const seed = import.meta.env.VITE_SHARED_WALLET_SEED as string | undefined;
  if (!seed) {
    throw new Error(
      'No shared wallet configured (VITE_SHARED_WALLET_SEED is unset). Generate and fund a wallet via the bboard-cli, then set its seed in bboard-ui/.env.preprod.',
    );
  }

  const zkConfigPath = window.location.origin;
  const keyMaterialProvider = new FetchZkConfigProvider<AssessmentCircuitKeys>(zkConfigPath, fetch.bind(window));
  const inMemoryAssessmentPrivateStateProvider = inMemoryPrivateStateProvider<
    AssessmentPrivateStateId,
    AssessmentPrivateState
  >();
  const sharedWallet = await buildSharedWalletProvider(NETWORK_ENV, seed, logger);

  return {
    privateStateProvider: inMemoryAssessmentPrivateStateProvider,
    zkConfigProvider: keyMaterialProvider,
    proofProvider: httpClientProofProvider(NETWORK_ENV.proofServer, keyMaterialProvider),
    publicDataProvider: indexerPublicDataProvider(NETWORK_ENV.indexer, NETWORK_ENV.indexerWS),
    walletProvider: sharedWallet,
    midnightProvider: sharedWallet,
  };
};
