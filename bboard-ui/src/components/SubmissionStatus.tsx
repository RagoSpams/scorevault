import React from 'react';
import { type AssessmentSubmission } from '../contexts';
import { CheckIcon, EyeOffIcon } from './icons';

export type SubmissionStatusProps = {
  readonly submission: AssessmentSubmission;
  readonly onRetry: () => void;
};

/**
 * Renders the current phase of an assessment submission, from wallet setup
 * through to the disclosed pass/fail result.
 */
export const SubmissionStatus: React.FC<SubmissionStatusProps> = ({ submission, onRetry }) => {
  switch (submission.status) {
    case 'preparing':
      return (
        <div className="av-status">
          <span className="av-spinner" />
          <span className="av-status-title">Setting up your submission</span>
          <span className="av-status-desc">No login or wallet needed - this only takes a moment.</span>
        </div>
      );
    case 'deploying':
      return (
        <div className="av-status">
          <span className="av-spinner" />
          <span className="av-status-title">Preparing your submission</span>
          <span className="av-status-desc">
            Deploying a private contract instance for your answers. This can take a moment.
          </span>
        </div>
      );
    case 'submitting':
      return (
        <div className="av-status">
          <span className="av-spinner" />
          <span className="av-status-title">Generating your proof</span>
          <span className="av-status-desc">Scoring happens locally - only the pass/fail result will be disclosed.</span>
        </div>
      );
    case 'result':
      return (
        <div className="av-status">
          <span className={`av-result-icon ${submission.passed ? 'is-pass' : 'is-fail'}`}>
            {submission.passed ? <CheckIcon /> : <EyeOffIcon />}
          </span>
          <span className="av-status-title">{submission.passed ? 'You passed' : 'You did not pass this time'}</span>
          <span className="av-status-desc">
            Your score was never disclosed - only this result was written to the ledger, verifiable by anyone.
          </span>
          <span className="av-result-address">{submission.contractAddress}</span>
        </div>
      );
    case 'failed':
      return (
        <div className="av-status">
          <span className="av-result-icon is-fail">
            <EyeOffIcon />
          </span>
          <span className="av-status-title">Couldn&apos;t submit your assessment</span>
          <span className="av-status-desc">{submission.error.message}</span>
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      );
  }
};
