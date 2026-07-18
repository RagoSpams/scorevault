import React from 'react';
import { Link } from 'react-router-dom';
import './AuditNav.css';

export type AuditNavProps = {
  /** Mono label describing the current screen, e.g. "PROTOCOL COMPLIANCE ASSESSMENT · v2.3". */
  readonly contextLabel: string;
  /** A per-session identifier, shown top-right. Generated client-side, never persisted or transmitted. */
  readonly sessionId: string;
  /** Dims the whole bar (used on the proof generation screen, whose session is locked). */
  readonly dimmed?: boolean;
  /** Hides the "ENCRYPTED SESSION" pill (shown only on the question screen in the reference design). */
  readonly hideEncryptedPill?: boolean;
};

/**
 * Top nav bar shared by all three assessment screens (question, proof
 * generation, result) - "Audit Console" visual direction.
 */
export const AuditNav: React.FC<AuditNavProps> = ({ contextLabel, sessionId, dimmed, hideEncryptedPill }) => (
  <nav className="ac-nav" style={dimmed ? { opacity: 0.5 } : undefined}>
    <Link to="/" className="ac-nav-brand">
      <span className="ac-nav-logo" />
      <span className="ac-nav-wordmark">ScoreVault</span>
    </Link>
    <span className="ac-nav-divider" />
    <span className="ac-nav-context">{contextLabel}</span>
    <div className="ac-nav-right">
      <span className="ac-nav-session">SESSION #{sessionId}</span>
      {!hideEncryptedPill && (
        <span className="ac-nav-pill">
          <span className="ac-nav-pill-dot" />
          ENCRYPTED SESSION
        </span>
      )}
    </div>
  </nav>
);
