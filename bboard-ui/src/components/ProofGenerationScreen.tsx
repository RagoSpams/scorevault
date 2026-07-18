import React, { useEffect, useState } from 'react';
import { type AssessmentSubmission } from '../contexts';
import './ProofGenerationScreen.css';

type InProgressStatus = Exclude<AssessmentSubmission['status'], 'result' | 'failed'>;

export type ProofGenerationScreenProps = {
  readonly status: InProgressStatus;
  readonly totalQuestions: number;
};

const PHASE_ORDER: readonly InProgressStatus[] = ['preparing', 'deploying', 'submitting', 'confirming'];

/**
 * Labels reflect what each phase actually does in our pipeline (see
 * BrowserAssessmentManager.run), not the reference design's generic
 * "encrypting / witness / proof / publish" framing - only "submitting" (the
 * submitAssessment circuit call) is genuine ZK proof computation; deploying
 * is unproved contract publication, and confirming is the post-submit
 * ledger read-back.
 */
const PHASE_LABELS: Record<InProgressStatus, string> = {
  preparing: 'Preparing secure session',
  deploying: 'Deploying private contract',
  submitting: 'Computing zero-knowledge proof (HALO2, BLS12-381)',
  confirming: 'Confirming on-chain',
};

const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Proof generation screen - "Audit Console" visual direction. The 4-step log
 * below is driven entirely by real phase transitions from the submission
 * pipeline: each phase's shown duration is real wall-clock time between the
 * actual async boundaries in BrowserAssessmentManager.run, and the active
 * phase shows a live-ticking elapsed timer rather than a fabricated
 * percentage - there is no sub-step progress signal available from the
 * underlying proof provider to interpolate one honestly.
 */
export const ProofGenerationScreen: React.FC<ProofGenerationScreenProps> = ({ status, totalQuestions }) => {
  const [phaseStartedAt, setPhaseStartedAt] = useState<Partial<Record<InProgressStatus, number>>>(() => ({
    [status]: Date.now(),
  }));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setPhaseStartedAt((prev) => (prev[status] !== undefined ? prev : { ...prev, [status]: Date.now() }));
  }, [status]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const currentPhaseIndex = PHASE_ORDER.indexOf(status);

  return (
    <div className="ac-proof-screen">
      <div className="ac-proof-grid-bg" />
      <div className="ac-proof-scanline" />

      <div className="ac-proof-headline">GENERATING ZERO-KNOWLEDGE PROOF</div>

      <div className="ac-proof-pipeline">
        <div className="ac-proof-responses">
          <div className="ac-proof-responses-label">{totalQuestions} ENCRYPTED RESPONSES</div>
          <div className="ac-proof-responses-grid">
            {Array.from({ length: totalQuestions }, (_, index) => (
              <div key={index} className="ac-proof-response-cell" style={{ animationDelay: `${index * 0.1}s` }} />
            ))}
          </div>
          <div className="ac-proof-responses-caption">values never leave this diagram</div>
        </div>

        <div className="ac-proof-arrow">→</div>

        <div className="ac-proof-rings">
          <div className="ac-proof-ring ac-proof-ring-outer" />
          <div className="ac-proof-ring ac-proof-ring-mid" />
          <div className="ac-proof-ring ac-proof-ring-inner" />
          <div className="ac-proof-ring-chip">HALO2</div>
        </div>

        <div className="ac-proof-arrow">→</div>

        <div className="ac-proof-output">
          <div className="ac-proof-output-card">
            <div className="ac-proof-output-check">✓</div>
          </div>
          <div className="ac-proof-output-label">
            PASS / FAIL
            <br />
            only
          </div>
        </div>
      </div>

      <div className="ac-proof-log">
        {PHASE_ORDER.map((phase, index) => {
          const startedAt = phaseStartedAt[phase];
          let state: 'complete' | 'active' | 'pending';
          let timeLabel: string;

          if (index < currentPhaseIndex) {
            state = 'complete';
            const nextPhaseStartedAt = phaseStartedAt[PHASE_ORDER[index + 1]];
            timeLabel =
              startedAt !== undefined && nextPhaseStartedAt !== undefined
                ? formatElapsed(nextPhaseStartedAt - startedAt)
                : '00:00';
          } else if (index === currentPhaseIndex) {
            state = 'active';
            timeLabel = startedAt !== undefined ? formatElapsed(now - startedAt) : '00:00';
          } else {
            state = 'pending';
            timeLabel = '—';
          }

          return (
            <div className={`ac-proof-log-row is-${state}`} key={phase}>
              <span>
                [{state === 'complete' ? '✓' : state === 'active' ? '•' : ' '}] {PHASE_LABELS[phase]}
              </span>
              <span>{timeLabel}</span>
            </div>
          );
        })}
      </div>

      <div className="ac-proof-footnote">
        This process runs entirely on your device. No answer, score, or raw response is ever transmitted.
      </div>
    </div>
  );
};
