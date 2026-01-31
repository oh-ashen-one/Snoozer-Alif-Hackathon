/**
 * SINGLE PULSE BACKGROUND - WEB VERSION
 * 
 * Usage:
 * <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#0C0A09' }}>
 *   <PulseBackground />
 *   <div style={{ position: 'relative', zIndex: 1 }}>Your content</div>
 * </div>
 */

import React from 'react';

export default function PulseBackground() {
  return (
    <div style={styles.container}>
      {/* Main glow orb */}
      <div style={styles.orb} />

      {/* Rings */}
      <div style={{ ...styles.ring, animation: 'ring 5s ease-out infinite 0s' }} />
      <div style={{ ...styles.ring, animation: 'ring 5s ease-out infinite 1.25s' }} />
      <div style={{ ...styles.ring, animation: 'ring 5s ease-out infinite 2.5s' }} />
      <div style={{ ...styles.ring, animation: 'ring 5s ease-out infinite 3.75s' }} />

      <style>{keyframes}</style>
    </div>
  );
}

const keyframes = `
  @keyframes pulse {
    0%, 100% { 
      transform: translate(-50%, -50%) scale(0.85); 
      opacity: 0.4; 
    }
    50% { 
      transform: translate(-50%, -50%) scale(1.15); 
      opacity: 0.75; 
    }
  }
  
  @keyframes ring {
    0% { 
      transform: translate(-50%, -50%) scale(0.3); 
      opacity: 0.5; 
    }
    100% { 
      transform: translate(-50%, -50%) scale(2.5); 
      opacity: 0; 
    }
  }
`;

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
  orb: {
    position: 'absolute',
    top: '12%',
    left: '50%',
    width: 500,
    height: 500,
    background: 'radial-gradient(circle, rgba(251, 146, 60, 0.5) 0%, rgba(251, 146, 60, 0.15) 45%, transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(80px)',
    animation: 'pulse 5s ease-in-out infinite',
  },
  ring: {
    position: 'absolute',
    top: '12%',
    left: '50%',
    width: 180,
    height: 180,
    borderRadius: '50%',
    border: '2px solid rgba(251, 146, 60, 0.3)',
  },
};
