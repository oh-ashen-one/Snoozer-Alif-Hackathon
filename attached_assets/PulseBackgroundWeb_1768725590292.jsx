/**
 * PULSE BACKGROUND - WEB/REACT VERSION
 * 
 * Drop this behind any screen for ambient glow effect
 * 
 * Usage:
 * <div style={{ position: 'relative' }}>
 *   <PulseBackground />
 *   {/* Your content here (with position: relative, zIndex: 1) */}
 * </div>
 */

import React from 'react';

export default function PulseBackground() {
  return (
    <div style={styles.container}>
      {/* MAIN CENTER - Orange pulse */}
      <div style={styles.orbCenter} />
      <div style={{...styles.ring, ...styles.ringCenter1}} />
      <div style={{...styles.ring, ...styles.ringCenter2}} />
      <div style={{...styles.ring, ...styles.ringCenter3}} />
      <div style={{...styles.ring, ...styles.ringCenter4}} />

      {/* UPPER RIGHT - Red accent */}
      <div style={styles.orbTopRight} />
      <div style={{...styles.ring, ...styles.ringTopRight1}} />
      <div style={{...styles.ring, ...styles.ringTopRight2}} />

      {/* LOWER LEFT - Green accent */}
      <div style={styles.orbBottomLeft} />
      <div style={{...styles.ring, ...styles.ringBottomLeft1}} />
      <div style={{...styles.ring, ...styles.ringBottomLeft2}} />

      <style>{keyframes}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// KEYFRAMES
// ════════════════════════════════════════════════════════════════

const keyframes = `
  @keyframes pulseCenter {
    0%, 100% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.4; }
    50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.7; }
  }
  
  @keyframes pulseTopRight {
    0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.35; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.65; }
  }
  
  @keyframes pulseBottomLeft {
    0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.4; }
    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.6; }
  }
  
  @keyframes ringCenter {
    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.5; }
    100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
  }
  
  @keyframes ringTopRight {
    0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.4; }
    100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
  }
  
  @keyframes ringBottomLeft {
    0% { transform: translate(-50%, -50%) scale(0.35); opacity: 0.45; }
    100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
  }
`;

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
  },

  // ══════════════════════════════════════════════
  // MAIN CENTER - Orange
  // ══════════════════════════════════════════════
  orbCenter: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 550,
    height: 550,
    background: 'radial-gradient(circle, rgba(251, 146, 60, 0.55) 0%, rgba(251, 146, 60, 0.2) 40%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(90px)',
    animation: 'pulseCenter 5s ease-in-out infinite',
  },
  ringCenter1: {
    top: '40%',
    left: '50%',
    borderColor: 'rgba(251, 146, 60, 0.35)',
    animation: 'ringCenter 5s ease-out infinite 0s',
  },
  ringCenter2: {
    top: '40%',
    left: '50%',
    borderColor: 'rgba(251, 146, 60, 0.35)',
    animation: 'ringCenter 5s ease-out infinite 1s',
  },
  ringCenter3: {
    top: '40%',
    left: '50%',
    borderColor: 'rgba(251, 146, 60, 0.35)',
    animation: 'ringCenter 5s ease-out infinite 2s',
  },
  ringCenter4: {
    top: '40%',
    left: '50%',
    borderColor: 'rgba(251, 146, 60, 0.35)',
    animation: 'ringCenter 5s ease-out infinite 3s',
  },

  // ══════════════════════════════════════════════
  // UPPER RIGHT - Red
  // ══════════════════════════════════════════════
  orbTopRight: {
    position: 'absolute',
    top: '8%',
    left: '75%',
    width: 400,
    height: 400,
    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.1) 50%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(70px)',
    animation: 'pulseTopRight 6s ease-in-out infinite 0.5s',
  },
  ringTopRight1: {
    top: '8%',
    left: '75%',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    animation: 'ringTopRight 6s ease-out infinite 0.5s',
  },
  ringTopRight2: {
    top: '8%',
    left: '75%',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    animation: 'ringTopRight 6s ease-out infinite 2s',
  },

  // ══════════════════════════════════════════════
  // LOWER LEFT - Green
  // ══════════════════════════════════════════════
  orbBottomLeft: {
    position: 'absolute',
    top: '80%',
    left: '20%',
    width: 380,
    height: 380,
    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.1) 50%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(65px)',
    animation: 'pulseBottomLeft 5.5s ease-in-out infinite 1.2s',
  },
  ringBottomLeft1: {
    top: '80%',
    left: '20%',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    animation: 'ringBottomLeft 5.5s ease-out infinite 1.2s',
  },
  ringBottomLeft2: {
    top: '80%',
    left: '20%',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    animation: 'ringBottomLeft 5.5s ease-out infinite 2.5s',
  },

  // ══════════════════════════════════════════════
  // RING BASE
  // ══════════════════════════════════════════════
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: '50%',
    borderWidth: 2,
    borderStyle: 'solid',
  },
};
