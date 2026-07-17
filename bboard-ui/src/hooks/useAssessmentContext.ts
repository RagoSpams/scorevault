import { useContext } from 'react';
import { AssessmentContext } from '../contexts/AssessmentContext';
import { type BrowserAssessmentManager } from '../contexts/BrowserAssessmentManager';

/**
 * Retrieves the currently in-scope assessment submissions manager.
 *
 * @returns The currently in-scope {@link BrowserAssessmentManager} instance.
 *
 * @internal
 */
export const useAssessmentContext = (): BrowserAssessmentManager => {
  const context = useContext(AssessmentContext);

  if (!context) {
    throw new Error('An <AssessmentProvider /> is required.');
  }

  return context;
};
