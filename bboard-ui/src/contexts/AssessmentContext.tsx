import React, { type PropsWithChildren, createContext } from 'react';
import { BrowserAssessmentManager } from './BrowserAssessmentManager';
import { type Logger } from 'pino';

/**
 * Encapsulates an assessment submissions manager as a context object.
 */
export const AssessmentContext = createContext<BrowserAssessmentManager | undefined>(undefined);

/**
 * The props required by the {@link AssessmentProvider} component.
 */
export type AssessmentProviderProps = PropsWithChildren<{
  /** The `pino` logger to use. */
  logger: Logger;
}>;

/**
 * A React component that sets a new {@link BrowserAssessmentManager} object as the currently
 * in-scope assessment submissions manager.
 */
export const AssessmentProvider: React.FC<Readonly<AssessmentProviderProps>> = ({ logger, children }) => (
  <AssessmentContext.Provider value={new BrowserAssessmentManager(logger)}>{children}</AssessmentContext.Provider>
);
