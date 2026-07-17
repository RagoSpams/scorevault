import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import { ShieldIcon, LockIcon, CheckIcon, ArrowIcon, EyeOffIcon, BoltIcon } from '../components/icons';

/**
 * ScoreVault marketing landing screen.
 */
const LandingPage: React.FC = () => {
  return (
    <div className="sv-root page-fade">
      <div className="sv-glow" />

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

      <main className="sv-hero">
        <div className="sv-hero-inner">
          <div className="sv-badge">
            <span className="sv-badge-icon">
              <LockIcon />
            </span>
            <span className="sv-badge-text">Verified with zero-knowledge proofs</span>
          </div>

          <h1 className="sv-wordmark">ScoreVault</h1>
          <p className="sv-tagline">Prove you passed. Not how.</p>
          <p className="sv-description">
            ScoreVault issues cryptographic proof that you cleared an assessment threshold, without ever revealing your
            answers, score, or attempt history to the verifier.
          </p>

          <div className="sv-cta-row">
            <Link className="btn btn-primary btn-lg" to="/assessment">
              Start Assessment
              <ArrowIcon />
            </Link>
          </div>

          <div className="sv-feature-row">
            <div className="sv-feature-card">
              <span className="sv-feature-icon sv-feature-icon--muted">
                <EyeOffIcon />
              </span>
              <span className="sv-feature-label">Nothing revealed</span>
              <span className="sv-feature-desc">Answers and raw scores never leave your device.</span>
            </div>
            <div className="sv-feature-card">
              <span className="sv-feature-icon">
                <CheckIcon />
              </span>
              <span className="sv-feature-label">Cryptographically verifiable</span>
              <span className="sv-feature-desc">Proofs can be checked by anyone, instantly.</span>
            </div>
            <div className="sv-feature-card">
              <span className="sv-feature-icon">
                <BoltIcon />
              </span>
              <span className="sv-feature-label">Instant results</span>
              <span className="sv-feature-desc">No waiting on a third party to confirm your pass.</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="sv-footer">
        <span className="sv-footer-text">Built on zero-knowledge proofs · Midnight Network</span>
      </footer>
    </div>
  );
};

export default LandingPage;
