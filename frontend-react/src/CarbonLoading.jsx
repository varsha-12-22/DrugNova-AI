import React from 'react';
import './CarbonLoading.css';

const CarbonLoading = () => {
  return (
    <div className="carbon-loader-wrapper">
      <div className="carbon-loader">
        <div className="orbital-ring"></div>
        <div className="orbital-ringring-2"></div>
        
        <div className="atom central-atom"></div>
        
        <div className="bond-container bond1">
          <div className="bond"></div>
          <div className="atom orbiting-atom"></div>
        </div>
        
        <div className="bond-container bond2">
          <div className="bond"></div>
          <div className="atom orbiting-atom"></div>
        </div>
        
        <div className="bond-container bond3">
          <div className="bond"></div>
          <div className="atom orbiting-atom"></div>
        </div>
        
        <div className="bond-container bond4">
          <div className="bond"></div>
          <div className="atom orbiting-atom"></div>
        </div>

        {/* Floating particles for extra effect */}
        <div className="particle p1"></div>
        <div className="particle p2"></div>
        <div className="particle p3"></div>
      </div>
    </div>
  );
};

export default CarbonLoading;
