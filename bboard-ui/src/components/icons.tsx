import React from 'react';

const strokeProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2.5',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const ShieldIcon: React.FC = () => (
  <svg {...strokeProps}>
    <path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3z" />
  </svg>
);

export const LockIcon: React.FC = () => (
  <svg {...strokeProps}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

export const CheckIcon: React.FC = () => (
  <svg {...strokeProps} strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ArrowIcon: React.FC = () => (
  <svg {...strokeProps}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

export const EyeOffIcon: React.FC = () => (
  <svg {...strokeProps}>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.24A9.5 9.5 0 0 1 12 4c5 0 9 4 10 8-.3 1.1-.86 2.2-1.6 3.2M6.6 6.6C4.4 8 2.9 10 2 12c1 4 5 8 10 8 1.4 0 2.7-.3 3.9-.8" />
  </svg>
);

export const BoltIcon: React.FC = () => (
  <svg {...strokeProps}>
    <polygon points="13 2 3 14 11 14 10 22 21 10 13 10 13 2" />
  </svg>
);

export const BellIcon: React.FC = () => (
  <svg {...strokeProps}>
    <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
