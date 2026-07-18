/**
 * Builds a signing wallet from a fixed, pre-funded seed - no browser wallet
 * extension, no login, no per-user funding wait.
 *
 * @remarks
 * ScoreVault's whole premise is "no login": a candidate never connects a wallet
 * or proves who they are. Every submission still needs *something* to pay the
 * testnet transaction fee and sign the balancing transaction, though - Midnight
 * has no free-transaction path. Rather than prompt for a browser wallet
 * extension (Lace), this derives signing/coin keys straight from one shared
 * seed that's funded once, out-of-band, via the CLI (see README), and baked
 * into the build as `VITE_SHARED_WALLET_SEED`.
 *
 * This never touches candidate answers or assessment results - it only pays
 * for and signs the transaction that carries the disclosed pass/fail boolean.
 * The seed is intentionally not a secret in the security sense: it's shipped
 * in the client bundle, so anyone can read it and, in principle, drain the
 * shared wallet's testnet funds. That's a denial-of-service risk against this
 * demo (submissions stop working until it's re-funded), not a privacy one -
 * candidate answers and scores are never derivable from it.
 *
 * The construction below reimplements (rather than imports) the wallet-building
 * logic that `@midnight-ntwrk/testkit-js`'s `FluentWalletBuilder` normally
 * provides to the CLI: that package bundles in `testcontainers` and native
 * Node bindings for Docker orchestration, which cannot load in a browser at
 * all. Everything here comes from `@midnight-ntwrk/wallet-sdk` directly, which
 * has no such dependency.
 */
import {
  ShieldedWallet,
  UnshieldedWallet,
  DustWallet,
  PublicKey,
  WalletFacade,
  InMemoryTransactionHistoryStorage,
  WalletEntrySchema,
  mergeWalletEntries,
  HDWallet,
  Roles,
  createKeystore,
  type Role,
} from '@midnight-ntwrk/wallet-sdk';
import {
  LedgerParameters,
  ZswapSecretKeys,
  DustSecretKey,
  type FinalizedTransaction,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { MidnightProvider, UnboundTransaction, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { type Logger } from 'pino';
import * as Rx from 'rxjs';

export type SharedWalletEnvironment = {
  readonly walletNetworkId: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly nodeWS: string;
  readonly proofServer: string;
};

/** Fee overhead for remote (non-local) networks - mirrors bboard-cli's MidnightWalletProvider. */
const REMOTE_ADDITIONAL_FEE_OVERHEAD = 1_000n;

/**
 * How long to wait for the wallet (shielded + unshielded + dust) to sync
 * before allowing a submission to proceed.
 *
 * @remarks
 * bboard-cli's CLI flow always blocks on this via `waitForUnshieldedFunds`'s
 * `isFacadeStateSynced` check before ever attempting a deploy/submit. This
 * browser path previously had no equivalent wait at all, so it always tried
 * to balance a transaction against a wallet that had had zero time to
 * discover its dust coins - failing with "Insufficient Funds: could not
 * balance dust" within a second or two, regardless of whether the
 * underlying network actually had funds.
 */
const WALLET_SYNC_TIMEOUT_MS = 120_000;

const isProgressStrictlyComplete = (progress: { isStrictlyComplete?: () => boolean } | undefined): boolean => {
  try {
    return Boolean(progress && typeof progress.isStrictlyComplete === 'function' && progress.isStrictlyComplete());
  } catch {
    return false;
  }
};

const deriveKeyForRole = (seedHex: string, role: Role): Uint8Array => {
  const seedBuffer = Buffer.from(seedHex, 'hex');
  const hdWalletResult = HDWallet.fromSeed(seedBuffer);
  if (hdWalletResult.type !== 'seedOk') {
    throw new Error('Invalid shared wallet seed: failed to create HD wallet');
  }
  const derivationResult = hdWalletResult.hdWallet.selectAccount(0).selectRole(role).deriveKeyAt(0);
  if (derivationResult.type === 'keyOutOfBounds') {
    throw new Error(`Shared wallet key derivation out of bounds for role ${role}`);
  }
  return derivationResult.key;
};

/**
 * Builds a `WalletProvider & MidnightProvider` from the shared seed, ready to
 * balance, sign and submit transactions with no user interaction.
 */
export const buildSharedWalletProvider = async (
  env: SharedWalletEnvironment,
  seedHex: string,
  logger: Logger,
): Promise<WalletProvider & MidnightProvider> => {
  const shieldedSeed = deriveKeyForRole(seedHex, Roles.Zswap);
  const unshieldedSeed = deriveKeyForRole(seedHex, Roles.NightExternal);
  const dustSeed = deriveKeyForRole(seedHex, Roles.Dust);

  const config = {
    indexerClientConnection: {
      indexerHttpUrl: env.indexer,
      indexerWsUrl: env.indexerWS,
    },
    provingServerUrl: new URL(env.proofServer),
    networkId: env.walletNetworkId,
    relayURL: new URL(env.nodeWS),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: {
      feeBlocksMargin: 5,
    },
  };

  const unshieldedKeystore = createKeystore(unshieldedSeed, env.walletNetworkId);
  const shieldedWallet = ShieldedWallet(config).startWithSeed(shieldedSeed);
  const unshieldedWallet = UnshieldedWallet({
    ...config,
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
  }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
  const dustWallet = DustWallet({
    ...config,
    costParameters: {
      additionalFeeOverhead: REMOTE_ADDITIONAL_FEE_OVERHEAD,
      feeBlocksMargin: 5,
    },
  }).startWithSeed(dustSeed, LedgerParameters.initialParameters().dust);

  logger.info('Starting shared wallet facade...');
  const wallet = await WalletFacade.init({
    configuration: config,
    shielded: () => shieldedWallet,
    unshielded: () => unshieldedWallet,
    dust: () => dustWallet,
  });

  const zswapSecretKeys = ZswapSecretKeys.fromSeed(shieldedSeed);
  const dustSecretKey = DustSecretKey.fromSeed(dustSeed);
  await wallet.start(zswapSecretKeys, dustSecretKey);
  logger.info('Shared wallet facade started, waiting for it to sync before allowing submissions...');

  try {
    await Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.filter(
          (state) =>
            isProgressStrictlyComplete(state.shielded.state.progress) &&
            isProgressStrictlyComplete(state.unshielded.progress) &&
            isProgressStrictlyComplete(state.dust.state.progress),
        ),
        Rx.timeout(WALLET_SYNC_TIMEOUT_MS),
      ),
    );
    logger.info('Shared wallet fully synced');
  } catch (error) {
    throw new Error(
      `Shared wallet did not finish syncing within ${WALLET_SYNC_TIMEOUT_MS / 1000}s - the network may be slow or unreachable. Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    getCoinPublicKey: () => zswapSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => zswapSecretKeys.encryptionPublicKey,
    balanceTx: async (tx: UnboundTransaction, ttl: Date = ttlOneHour()): Promise<FinalizedTransaction> => {
      const recipe = await wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: zswapSecretKeys, dustSecretKey },
        { ttl },
      );
      const signedRecipe = await wallet.signRecipe(recipe, (payload) => unshieldedKeystore.signData(payload));
      return wallet.finalizeRecipe(signedRecipe);
    },
    submitTx: (tx: FinalizedTransaction): Promise<string> => wallet.submitTransaction(tx),
  };
};
