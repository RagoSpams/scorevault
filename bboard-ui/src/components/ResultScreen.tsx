import React from 'react';
import { Link } from 'react-router-dom';
import './ResultScreen.css';

const PROOF_SYSTEM = 'HALO2 / BLS12-381';

export type ResultScreenProps = {
  readonly passed: boolean;
  readonly contractAddress: string;
  readonly txHash: string;
  readonly blockHeight: number;
  /** Unix timestamp (seconds) of the block the transaction was included in. */
  readonly blockTimestamp: number;
};

const formatTimestamp = (blockTimestamp: number): string => {
  // Defensive: treat as milliseconds if it's already too large to be a
  // plausible seconds value (real blockTimestamp is documented as seconds).
  const ms = blockTimestamp > 1e12 ? blockTimestamp : blockTimestamp * 1000;
  const date = new Date(ms);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
};

const downloadReceipt = (props: ResultScreenProps): void => {
  const receipt = {
    result: props.passed ? 'PASS' : 'FAIL',
    contractAddress: props.contractAddress,
    transactionHash: props.txHash,
    proofSystem: PROOF_SYSTEM,
    blockHeight: props.blockHeight,
    timestampUtc: formatTimestamp(props.blockTimestamp),
    timestampUnix: props.blockTimestamp,
    network: 'Midnight Network',
    note: 'Only this pass/fail result was ever disclosed on-chain. No individual answers or score were recorded or transmitted.',
  };
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `scorevault-proof-receipt-${props.contractAddress.slice(0, 12)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Result screen - "Audit Console" visual direction. Every field in the
 * verification receipt (contract address, block height, timestamp) comes
 * from the real on-chain transaction data returned by AssessmentAPI.submitAssessment
 * (see BrowserAssessmentManager.run) - none of it is hardcoded. "Download
 * proof receipt" is a real, working export (JSON) of that same data.
 *
 * Deliberately does not implement "View on explorer" - there is no public
 * block explorer for the local standalone network this app targets.
 */
export const ResultScreen: React.FC<ResultScreenProps> = (props) => {
  const { passed, contractAddress, blockHeight, blockTimestamp } = props;

  return (
    <div className="ac-result-wrapper">
      <div className="ac-cert-card">
        <span className="ac-cert-corner ac-cert-corner-tl" />
        <span className="ac-cert-corner ac-cert-corner-tr" />
        <span className="ac-cert-corner ac-cert-corner-bl" />
        <span className="ac-cert-corner ac-cert-corner-br" />

        <div className="ac-cert-left">
          <div className={`ac-cert-badge ${passed ? 'is-pass' : 'is-fail'}`}>{passed ? '✓' : '✕'}</div>
          <div className="ac-cert-verdict">ASSESSMENT: {passed ? 'PASS' : 'FAIL'}</div>
          <div className="ac-cert-verified">VERIFIED VIA ZERO-KNOWLEDGE PROOF</div>
          <p className="ac-cert-copy">
            Your individual score and answers were never disclosed to ScoreVault or the reviewing organization. Only
            this pass/fail outcome - and the proof that it is genuine - was recorded on-chain.
          </p>
          <div className="ac-cert-actions">
            <button type="button" className="ac-cert-btn-primary" onClick={() => downloadReceipt(props)}>
              Download proof receipt
            </button>
            <Link to="/" className="ac-cert-btn-secondary">
              Return to dashboard
            </Link>
          </div>
        </div>

        <div className="ac-cert-divider" />

        <div className="ac-cert-right">
          <div className="ac-cert-section-label">ON-CHAIN VERIFICATION RECEIPT</div>
          <div>
            <div className="ac-cert-field-label">CONTRACT ADDRESS · MIDNIGHT NETWORK</div>
            <div className="ac-cert-address">{contractAddress}</div>
          </div>
          <div className="ac-cert-two-up">
            <div>
              <div className="ac-cert-field-label">PROOF SYSTEM</div>
              <div className="ac-cert-field-value">{PROOF_SYSTEM}</div>
            </div>
            <div>
              <div className="ac-cert-field-label">BLOCK HEIGHT</div>
              <div className="ac-cert-field-value">{blockHeight.toLocaleString('en-US')}</div>
            </div>
          </div>
          <div>
            <div className="ac-cert-field-label">TIMESTAMP</div>
            <div className="ac-cert-field-value">{formatTimestamp(blockTimestamp)}</div>
          </div>
          <div className="ac-cert-footer">
            <div className="ac-cert-confirmed">
              <span className="ac-cert-confirmed-dot" />
              CONFIRMED ON-CHAIN
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export type SubmissionErrorScreenProps = {
  readonly error: Error;
  readonly onRetry: () => void;
};

/**
 * Shown when the submission pipeline itself fails (e.g. a wallet/network
 * error) - distinct from a completed assessment that failed the compliance
 * check, which is a normal ResultScreen(passed=false) outcome.
 */
export const SubmissionErrorScreen: React.FC<SubmissionErrorScreenProps> = ({ error, onRetry }) => (
  <div className="ac-result-wrapper">
    <div className="ac-error-card">
      <div className="ac-cert-badge is-fail">✕</div>
      <div className="ac-error-title">Couldn&apos;t submit your assessment</div>
      <p className="ac-error-message">{error.message}</p>
      <button type="button" className="ac-cert-btn-primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  </div>
);
