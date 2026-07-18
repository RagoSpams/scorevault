import React, { useEffect, useRef, useState } from 'react';
import './AssessmentPage.css';
import { useAssessmentContext } from '../hooks';
import { type AssessmentSubmission } from '../contexts';
import { AuditNav } from '../components/AuditNav';
import { ProofGenerationScreen } from '../components/ProofGenerationScreen';
import { ResultScreen, SubmissionErrorScreen } from '../components/ResultScreen';

type Section = 'Access Control' | 'Data Governance' | 'Incident & Audit';

const SECTION_ORDER: readonly Section[] = ['Access Control', 'Data Governance', 'Incident & Audit'];

type Question = {
  readonly clauseLabel: string;
  readonly section: Section;
  /** The scenario - what happened. */
  readonly headline: string;
  /** The actual yes/no question being asked about that scenario. */
  readonly subQuestion: string;
  readonly reference: string;
};

/**
 * All 10 questions are framed so that the protocol-compliant answer is
 * always "Yes" - see contract/src/assessment-witnesses.ts's ANSWER_KEY,
 * which this content must stay consistent with.
 */
const QUESTIONS: readonly Question[] = [
  {
    clauseLabel: 'CLAUSE 1.1 — RECORD ACCESS',
    section: 'Access Control',
    headline: 'A former contractor requests access to archived client records, citing an open support ticket.',
    subQuestion: 'Per Clause 1.1, do you deny the request pending verification?',
    reference: 'Reference: Access Control Policy §1.1, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 2.1 — EXPORT LOGGING',
    section: 'Data Governance',
    headline: 'A data export request is submitted without a stated purpose.',
    subQuestion: 'Per Clause 2.1, do you require the purpose before proceeding?',
    reference: 'Reference: Data Governance Policy §2.1, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 1.2 — VENDOR SCOPE',
    section: 'Access Control',
    headline: 'A third-party vendor requests data outside their contracted scope.',
    subQuestion: 'Per Clause 1.2, do you deny the request?',
    reference: 'Reference: Access Control Policy §1.2, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 1.3 — CREDENTIAL REVOCATION',
    section: 'Access Control',
    headline: 'An employee changes roles, and their old access remains active on day 2.',
    subQuestion: 'Per Clause 1.3, do you flag this as a violation?',
    reference: 'Reference: Access Control Policy §1.3, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 1.4 — SHARED CREDENTIALS',
    section: 'Access Control',
    headline: 'A team proposes sharing one login across members to save on licensing costs.',
    subQuestion: 'Per Clause 1.4, do you reject the proposal?',
    reference: 'Reference: Access Control Policy §1.4, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 2.2 — RETENTION LIMITS',
    section: 'Data Governance',
    headline: 'A request to extend a data retention period lacks documented legal justification.',
    subQuestion: 'Per Clause 2.2, do you deny the extension?',
    reference: 'Reference: Data Governance Policy §2.2, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 3.1 — LOG INTEGRITY',
    section: 'Incident & Audit',
    headline: 'A request comes in to "clean up" old audit log entries.',
    subQuestion: 'Per Clause 3.1, do you refuse the request?',
    reference: 'Reference: Incident & Audit Policy §3.1, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 2.3 — TEST DATA',
    section: 'Data Governance',
    headline: 'A test request uses raw client data instead of an anonymized dataset.',
    subQuestion: 'Per Clause 2.3, do you require anonymization first?',
    reference: 'Reference: Data Governance Policy §2.3, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 3.2 — ANOMALY REPORTING',
    section: 'Incident & Audit',
    headline: 'You discover an access anomaly on a Friday afternoon.',
    subQuestion: 'Per Clause 3.2, do you report it before Monday?',
    reference: 'Reference: Incident & Audit Policy §3.2, rev. March 2026',
  },
  {
    clauseLabel: 'CLAUSE 1.5 — SUBCONTRACTOR ACCESS',
    section: 'Access Control',
    headline: "A subcontractor assumes data access via the primary contractor's credentials.",
    subQuestion: 'Per Clause 1.5, do you flag this as unauthorized?',
    reference: 'Reference: Access Control Policy §1.5, rev. March 2026',
  },
];

const UNANSWERED = -1;
const ADVANCE_DELAY_MS = 350;

const generateSessionId = (): string => {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * ScoreVault assessment screen: collects answers to the fixed question set and
 * submits them through the real `submitAssessment` flow. The candidate's answers
 * never leave this page as plaintext - they're packaged as private state on a
 * freshly deployed contract, and only the disclosed pass/fail boolean comes back.
 */
const AssessmentPage: React.FC = () => {
  const assessmentManager = useAssessmentContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => new Array<number>(QUESTIONS.length).fill(UNANSWERED));
  const [submission, setSubmission] = useState<AssessmentSubmission | undefined>(undefined);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [commitHash, setCommitHash] = useState('pending…');
  const advanceTimeoutRef = useRef<number | undefined>(undefined);

  const totalQuestions = QUESTIONS.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentQuestion = QUESTIONS[currentIndex];
  const currentAnswer = answers[currentIndex];

  // A real (not fabricated) running hash of the answers given so far, computed
  // client-side via SubtleCrypto. It updates as each answer is recorded, but -
  // like the answers themselves - is never transmitted anywhere; it exists only
  // to visibly demonstrate that each response is being tracked locally.
  useEffect(() => {
    let cancelled = false;
    const answeredSoFar = answers.filter((answer) => answer !== UNANSWERED);
    const data = new TextEncoder().encode(JSON.stringify(answeredSoFar));
    void crypto.subtle.digest('SHA-256', data).then((digest) => {
      if (cancelled) return;
      const hex = toHex(digest);
      setCommitHash(`${hex.slice(0, 6)}…${hex.slice(-6)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [answers]);

  useEffect(() => {
    setIsAdvancing(false);
  }, [currentIndex]);

  useEffect(
    () => () => {
      if (advanceTimeoutRef.current !== undefined) {
        window.clearTimeout(advanceTimeoutRef.current);
      }
    },
    [],
  );

  const submitAnswers = (finalAnswers: readonly number[]): void => {
    setSubmission({ status: 'preparing' });
    const answersBytes = new Uint8Array(finalAnswers);
    assessmentManager.submit(answersBytes).subscribe(setSubmission);
  };

  const selectOption = (optionIndex: number): void => {
    if (isAdvancing) return;
    const updatedAnswers = [...answers];
    updatedAnswers[currentIndex] = optionIndex;
    setAnswers(updatedAnswers);
    setIsAdvancing(true);

    advanceTimeoutRef.current = window.setTimeout(() => {
      if (isLastQuestion) {
        submitAnswers(updatedAnswers);
      } else {
        setCurrentIndex((index) => index + 1);
      }
    }, ADVANCE_DELAY_MS);
  };

  // Not part of the reference design, but needed for live demos: lets a
  // misclick be corrected without restarting the whole flow. Revisiting a
  // question keeps its previous answer selected - picking again (same or
  // different) re-triggers the normal auto-advance.
  const goToPreviousQuestion = (): void => {
    if (currentIndex === 0) return;
    if (advanceTimeoutRef.current !== undefined) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = undefined;
    }
    setIsAdvancing(false);
    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const retry = (): void => setSubmission(undefined);

  const sectionStats = SECTION_ORDER.map((name) => {
    const indices = QUESTIONS.reduce<number[]>((acc, question, index) => {
      if (question.section === name) acc.push(index);
      return acc;
    }, []);
    const answered = indices.filter((index) => answers[index] !== UNANSWERED).length;
    return {
      name,
      total: indices.length,
      answered,
      isActive: !submission && indices.includes(currentIndex),
    };
  });

  const isTerminal = submission?.status === 'result' || submission?.status === 'failed';

  return (
    <div className="ac-root page-fade">
      <AuditNav
        contextLabel={
          !submission
            ? 'PROTOCOL COMPLIANCE ASSESSMENT · v2.3'
            : isTerminal
              ? 'ASSESSMENT COMPLETE'
              : 'SESSION LOCKED — ASSESSMENT SUBMITTED'
        }
        sessionId={sessionId}
        dimmed={Boolean(submission) && !isTerminal}
        hideEncryptedPill={Boolean(submission)}
      />

      {submission && !isTerminal ? (
        <ProofGenerationScreen status={submission.status} totalQuestions={totalQuestions} />
      ) : submission?.status === 'result' ? (
        <ResultScreen
          passed={submission.passed}
          contractAddress={submission.contractAddress}
          txHash={submission.txHash}
          blockHeight={submission.blockHeight}
          blockTimestamp={submission.blockTimestamp}
        />
      ) : submission?.status === 'failed' ? (
        <SubmissionErrorScreen error={submission.error} onRetry={retry} />
      ) : (
        <div className="ac-q-body">
          <div className="ac-q-main">
            {currentIndex > 0 && (
              <button type="button" className="ac-back-link" onClick={goToPreviousQuestion}>
                ← Back
              </button>
            )}
            <div className="ac-clause-tag">
              <span className="ac-clause-dot" />
              <span>{currentQuestion.clauseLabel}</span>
            </div>
            <h1 className="ac-headline">{currentQuestion.headline}</h1>
            <p className="ac-subquestion">{currentQuestion.subQuestion}</p>
            <p className="ac-reference">{currentQuestion.reference}</p>

            <div className="ac-options" role="radiogroup" aria-label={currentQuestion.subQuestion}>
              <button
                type="button"
                role="radio"
                aria-checked={currentAnswer === 0}
                className={`ac-option ac-option-primary${currentAnswer === 0 ? ' is-selected' : ''}`}
                onClick={() => selectOption(0)}
                disabled={isAdvancing}
              >
                <span className="ac-option-icon">✓</span>
                YES, COMPLY
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={currentAnswer === 1}
                className={`ac-option ac-option-secondary${currentAnswer === 1 ? ' is-selected' : ''}`}
                onClick={() => selectOption(1)}
                disabled={isAdvancing}
              >
                <span className="ac-option-icon">✕</span>
                NO, ESCALATE
              </button>
            </div>

            <p className="ac-footnote">
              Your response is recorded locally and encrypted before it ever leaves this device.
            </p>
          </div>

          <aside className="ac-sidebar">
            <div className="ac-sidebar-label">ASSESSMENT STRUCTURE</div>
            <div className="ac-section-list">
              {sectionStats.map((section, index) => {
                const isComplete = section.answered === section.total;
                const status = isComplete ? 'complete' : section.isActive ? 'active' : 'upcoming';
                return (
                  <div className="ac-section-row" key={section.name}>
                    <span className={`ac-section-chip is-${status}`}>{isComplete ? '✓' : index + 1}</span>
                    <span className={`ac-section-name is-${status}`}>{section.name}</span>
                    <span className={`ac-section-frac is-${status}`}>
                      {section.answered}/{section.total}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="ac-progress-block">
              <div className="ac-progress-header">
                <span>
                  QUESTION {currentIndex + 1} OF {totalQuestions}
                </span>
                <span>{Math.round(((currentIndex + 1) / totalQuestions) * 100)}%</span>
              </div>
              <div className="ac-segments">
                {QUESTIONS.map((_, index) => (
                  <span key={index} className={`ac-segment${answers[index] !== UNANSWERED ? ' is-filled' : ''}`} />
                ))}
              </div>
            </div>

            <div className="ac-integrity">
              <div className="ac-integrity-header">
                <span className="ac-integrity-dot" />
                <span>SESSION INTEGRITY</span>
              </div>
              <div className="ac-integrity-hash">
                commit: {commitHash}
                <br />
                each answer updates this local hash — nothing is transmitted until submission.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AssessmentPage;
