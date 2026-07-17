import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './AssessmentPage.css';
import { useAssessmentContext } from '../hooks';
import { type AssessmentSubmission } from '../contexts';
import { SubmissionStatus } from '../components/SubmissionStatus';
import { ShieldIcon, CheckIcon, ArrowIcon } from '../components/icons';

type Question = {
  readonly prompt: string;
  readonly options: readonly [string, string];
};

const QUESTIONS: readonly Question[] = [
  {
    prompt:
      'Protocol states all incidents must be reported within 24 hours, regardless of severity. A colleague causes a minor incident with no lasting harm. Do you report it?',
    options: ['Yes', 'No'],
  },
  {
    prompt:
      'Protocol states you may never share role-related sensitive information with anyone outside your team, including close friends or family. A friend casually asks about details of your work. Do you decline to share them?',
    options: ['Yes', 'No'],
  },
  {
    prompt:
      'Protocol states any access beyond what your role requires must be reported immediately. You notice you have access to a system beyond your clearance level. Do you report it?',
    options: ['Yes', 'No'],
  },
  {
    prompt:
      'Protocol states instructions that conflict with written policy must be escalated, not carried out. A supervisor asks you to complete a task you believe violates policy. Do you escalate it instead of complying?',
    options: ['Yes', 'No'],
  },
  {
    prompt:
      'Protocol states all errors in submitted reports must be corrected immediately upon discovery, regardless of severity. You find a minor mistake in a report already submitted. Do you correct it right away?',
    options: ['Yes', 'No'],
  },
  {
    prompt:
      "Protocol states decisions under pressure must be based on verified information, not assumptions. You're in a high-pressure situation with incomplete information. Do you gather verified information before acting?",
    options: ['Yes', 'No'],
  },
  {
    prompt:
      'Protocol states established procedures must be followed even when a faster alternative seems available. You think of a quicker way to complete a task that deviates from procedure. Do you follow the established procedure anyway?',
    options: ['Yes', 'No'],
  },
  {
    prompt:
      'Protocol states unclear or ambiguous instructions must be clarified before acting. You receive an instruction that could be interpreted two different ways. Do you seek clarification before proceeding?',
    options: ['Yes', 'No'],
  },
  {
    prompt:
      "Protocol states team members must disclose personal conflicts of interest before taking on related work. You're assigned a task involving a personal connection. Do you disclose the conflict before starting?",
    options: ['Yes', 'No'],
  },
  {
    prompt:
      "Protocol states any suspected policy violation, even a colleague's, must be reported through official channels. You suspect a colleague may have violated policy, but you're not certain. Do you report it through official channels?",
    options: ['Yes', 'No'],
  },
];

const UNANSWERED = -1;

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

  const totalQuestions = QUESTIONS.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentQuestion = QUESTIONS[currentIndex];
  const currentAnswer = answers[currentIndex];
  const allAnswered = answers.every((answer) => answer !== UNANSWERED);

  const selectOption = (optionIndex: number): void => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const goBack = (): void => setCurrentIndex((index) => Math.max(0, index - 1));
  const goNext = (): void => setCurrentIndex((index) => Math.min(totalQuestions - 1, index + 1));

  const handleSubmit = (): void => {
    setSubmission({ status: 'preparing' });
    const answersBytes = new Uint8Array(answers);
    assessmentManager.submit(answersBytes).subscribe(setSubmission);
  };

  const retry = (): void => setSubmission(undefined);

  return (
    <div className="av-root page-fade">
      <nav className="app-nav">
        <div className="app-nav-inner">
          <Link to="/" className="app-nav-mark">
            <span className="app-nav-mark-icon">
              <ShieldIcon />
            </span>
            <span className="app-nav-mark-text">ScoreVault</span>
          </Link>
        </div>
      </nav>

      <main className="av-main">
        <div className="av-panel">
          {submission ? (
            <div className="av-card">
              <SubmissionStatus submission={submission} onRetry={retry} />
            </div>
          ) : (
            <>
              <div className="av-progress-row">
                <span className="av-progress-label">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
              </div>
              <div className="av-progress-track">
                <div
                  className="av-progress-fill"
                  style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>

              <div className="av-card">
                <p className="av-question">{currentQuestion.prompt}</p>
                <div className="av-options" role="radiogroup" aria-label={currentQuestion.prompt}>
                  {currentQuestion.options.map((option, optionIndex) => {
                    const selected = currentAnswer === optionIndex;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`av-option${selected ? ' is-selected' : ''}`}
                        onClick={() => selectOption(optionIndex)}
                      >
                        <span className="av-option-marker">
                          <CheckIcon />
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="av-nav-buttons">
                  <button type="button" className="btn btn-secondary" onClick={goBack} disabled={currentIndex === 0}>
                    Back
                  </button>

                  {isLastQuestion ? (
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!allAnswered}>
                      Submit
                      <ArrowIcon />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={goNext}
                      disabled={currentAnswer === UNANSWERED}
                    >
                      Next
                      <ArrowIcon />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AssessmentPage;
