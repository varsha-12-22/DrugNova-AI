import React, { useState, useEffect } from 'react';
import './BioBackground.css';

const DnaHelix = ({ style, count = 15, speed = '4s', color1 = '#4fd1c5', color2 = '#3182ce' }) => (
  <div className="dna-helix-bg" style={{ ...style, '--speed': speed }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="base-pair-bg" style={{ animationDelay: `${i * -0.15}s` }}>
        <div className="dot-bg dot-left-bg" style={{ backgroundColor: color1, boxShadow: `0 0 10px ${color1}80` }}></div>
        <div className="bar-bg" style={{ background: `linear-gradient(90deg, ${color1}, ${color2})` }}></div>
        <div className="dot-bg dot-right-bg" style={{ backgroundColor: color2, boxShadow: `0 0 10px ${color2}80` }}></div>
      </div>
    ))}
  </div>
);

const Molecule = ({ style, speed = '20s' }) => (
  <div className="molecule-bg" style={{ ...style, '--speed': speed }}>
    <svg width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <filter id="glow-bg">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g className="molecule-group-bg">
        <circle cx="100" cy="100" r="8" fill="#4fd1c5" filter="url(#glow-bg)" />
        <circle cx="60" cy="60" r="5" fill="#3182ce" filter="url(#glow-bg)" />
        <circle cx="140" cy="60" r="5" fill="#3182ce" filter="url(#glow-bg)" />
        <circle cx="100" cy="150" r="6" fill="#fff" filter="url(#glow-bg)" />
        <line x1="100" y1="100" x2="60" y2="60" stroke="#4fd1c522" strokeWidth="2" />
        <line x1="100" y1="100" x2="140" y2="60" stroke="#4fd1c522" strokeWidth="2" />
        <line x1="100" y1="100" x2="100" y2="150" stroke="#4fd1c522" strokeWidth="2" />
      </g>
    </svg>
  </div>
);

const Particle = ({ style }) => (
  <div className="particle-bg" style={style}></div>
);

const BioBackground = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const parallaxStyle = {
    transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`
  };

  const slowParallaxStyle = {
    transform: `translate3d(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px, 0)`
  };

  return (
    <div className="bio-background-root">
      {/* Top Left - Helix */}
      <div className="bg-animation-container tl" style={parallaxStyle}>
        <DnaHelix style={{ transform: 'rotate(25deg) scale(0.8)' }} count={12} speed="6s" />
      </div>

      {/* Top Right - Molecule */}
      <div className="bg-animation-container tr" style={slowParallaxStyle}>
        <Molecule speed="25s" />
      </div>

      {/* Bottom Left - Molecule */}
      <div className="bg-animation-container bl" style={parallaxStyle}>
        <Molecule speed="30s" style={{ transform: 'scale(1.2) rotate(45deg)' }} />
      </div>

      {/* Bottom Right - Helix */}
      <div className="bg-animation-container br" style={slowParallaxStyle}>
        <DnaHelix style={{ transform: 'rotate(-15deg) scale(1.1)' }} count={10} speed="8s" color1="#3182ce" color2="#4fd1c5" />
      </div>

      {/* Center Background - Subtle Particles */}
      <div className="bg-particles-layer">
        {Array.from({ length: 30 }).map((_, i) => (
          <Particle 
            key={i} 
            style={{ 
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `${Math.random() * -20}s`,
              opacity: Math.random() * 0.2 + 0.1
            }} 
          />
        ))}
      </div>

      {/* Ambient Glows */}
      <div className="ambient-glow g1"></div>
      <div className="ambient-glow g2"></div>
    </div>
  );
};

export default BioBackground;
