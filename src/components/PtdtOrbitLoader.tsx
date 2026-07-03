import React from 'react';
import './PtdtOrbitLoader.css';

export interface PtdtOrbitLoaderProps {
  size?: number;
  label?: string;
  className?: string;
}

export const PtdtOrbitLoader: React.FC<PtdtOrbitLoaderProps> = ({
  size = 64,
  label = 'Loading',
  className = '',
}) => {
  const dotDelays = [0, 0.13, 0.27, 0.4, 0.53, 0.67, 0.8, 0.93];
  const dotColors = [
    '#FB0B8C',
    '#FB0B8C',
    '#A855F7',
    '#A855F7',
    '#00A747',
    '#00A747',
    '#888780',
    '#888780',
  ];
  const dotPositions = [
    { top: '0%', left: '50%', marginLeft: '-4px' },
    { top: '14%', right: '14%' },
    { top: '50%', right: '0%', marginTop: '-4px' },
    { bottom: '14%', right: '14%' },
    { bottom: '0%', left: '50%', marginLeft: '-4px' },
    { bottom: '14%', left: '14%' },
    { top: '50%', left: '0%', marginTop: '-4px' },
    { top: '14%', left: '14%' },
  ];

  return (
    <div
      className={`ptdt-orbit-loader ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    >
      <div className="ptdt-orbit-loader__rotator">
        {dotPositions.map((pos, i) => (
          <span
            key={i}
            className="ptdt-orbit-loader__dot"
            style={{
              ...pos,
              backgroundColor: dotColors[i],
              animationDelay: `${dotDelays[i]}s`,
            }}
          />
        ))}
      </div>
      <div className="ptdt-orbit-loader__icon">
        <svg
          width={Math.round(size * 0.31)}
          height={Math.round(size * 0.31)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
          <path d="M18 15a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1Z" />
          <path d="M4 15a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4Z" />
          <path d="M16 19v1a2 2 0 0 1-2 2h-1" />
        </svg>
      </div>
      <span className="ptdt-orbit-loader__sr-only">{label}</span>
    </div>
  );
};

export default PtdtOrbitLoader;
