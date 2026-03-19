import React from 'react';
import './DnaAnimation.css';

const DnaAnimation = () => {
  return (
    <div className="dna-container">
      <div className="dna-helix">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="base-pair" style={{ animationDelay: `${i * -0.1}s` }}>
            <div className="dot dot-left"></div>
            <div className="bar"></div>
            <div className="dot dot-right"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DnaAnimation;
