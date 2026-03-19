import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, X, ArrowLeft, Dna, Target } from 'lucide-react';
import './DrugSimilarityViz.css';

// ── Helpers ───────────────────────────────────────────────

const dotProduct = (a, b) => a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
const magnitude = (a) => Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));

const computeDynamicSimilarity = (v1, v2) => {
  if (!v1 || !v2 || v1.length === 0 || v2.length === 0) return 0;
  const dot = dotProduct(v1, v2);
  const mag1 = magnitude(v1);
  const mag2 = magnitude(v2);
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (mag1 * mag2);
};

const toDeg = (rad) => (rad * 180) / Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;

// Generate color based on similarity score (Teal to Pink)
const getDynamicColor = (score) => {
  // score 1.0 -> teal (#00ffcc), score 0.0 -> pink (#f472b6)
  const t = Math.max(0, Math.min(1, score));
  return `hsl(${lerp(168, 330, 1 - t)}, 100%, 70%)`;
};

// ── Vector Graph (SVG) ───────────────────────────────────

const VectorGraph = ({ targetDrug, selectedDrug, similarity, isVisible }) => {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) { setAnimProgress(0); return; }
    let frame;
    let start = null;
    const duration = 900;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimProgress(eased);
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isVisible, selectedDrug]);

  const W = 500, H = 500;
  const cx = W / 2, cy = H / 2;
  const radius = 185; // vector length
  const score = computeDynamicSimilarity([1,0,0], similarity); // similarity is the vector here
  const angle = Math.acos(Math.max(-1, Math.min(1, score)));

  // Target vector always points RIGHT (0°)
  const targetEnd = { x: cx + radius, y: cy };

  // Selected drug vector at angle θ (clockwise from target)
  const currentAngle = lerp(0, angle, animProgress);
  const selectedEnd = {
    x: cx + radius * Math.cos(currentAngle),
    y: cy - radius * Math.sin(currentAngle),
  };

  const dynamicColor = getDynamicColor(score);

  // Arc path for the angle indicator
  const arcRadius = 60;
  const arcEnd = {
    x: cx + arcRadius * Math.cos(currentAngle),
    y: cy - arcRadius * Math.sin(currentAngle),
  };
  const largeArc = currentAngle > Math.PI ? 1 : 0;
  const arcPath = `M ${cx + arcRadius} ${cy} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y}`;

  // Angle label position (midpoint of arc)
  const midAngle = currentAngle / 2;
  const labelR = arcRadius + 18;
  const angleLabelPos = {
    x: cx + labelR * Math.cos(midAngle),
    y: cy - labelR * Math.sin(midAngle),
  };

  // Grid circles
  const gridRadii = [60, 120, 185];

  // Similarity percentage
  const simPct = (similarity * 100).toFixed(1);

  return (
    <div className={`vector-graph-container ${isVisible ? 'vector-graph--visible' : ''}`}>
      {/* Similarity score display */}
      <div className="sim-score-display">
        <div className="sim-score-value" style={{ opacity: animProgress, color: dynamicColor, WebkitTextFillColor: dynamicColor }}>
          {(score * 100).toFixed(1)}<span>%</span>
        </div>
        <div className="sim-score-label">Dynamic Cosine Similarity</div>
        <div className="sim-score-angle" style={{ opacity: animProgress }}>
          θ = {toDeg(angle).toFixed(1)}°
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="vector-svg">
        <defs>
          <marker id="arrowTarget" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#00ffcc" />
          </marker>
          <marker id="arrowSelected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={dynamicColor} />
          </marker>
          <filter id="vecGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="originGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00ffcc" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background grid circles */}
        {gridRadii.map(r => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none"
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 6" />
        ))}

        {/* Axis lines */}
        <line x1={cx - 200} y1={cy} x2={cx + 200} y2={cy}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line x1={cx} y1={cy - 200} x2={cx} y2={cy + 200}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* Angle arc with fill */}
        {animProgress > 0.05 && (
          <>
            {/* Filled wedge */}
            <path
              d={`M ${cx} ${cy} L ${cx + arcRadius} ${cy} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${arcEnd.x} ${arcEnd.y} Z`}
              fill="rgba(0, 255, 204, 0.06)"
              stroke="none"
            />
            {/* Arc line */}
            <path d={arcPath} fill="none" stroke="rgba(0,255,204,0.5)"
              strokeWidth="1.5" strokeDasharray="4 3" />
            {/* Angle label */}
            <text x={angleLabelPos.x} y={angleLabelPos.y} textAnchor="middle"
              fill="#94a3b8" fontSize="12" fontFamily="'Space Grotesk', monospace">
              {toDeg(currentAngle).toFixed(1)}°
            </text>
          </>
        )}

        {/* Origin glow */}
        <circle cx={cx} cy={cy} r="30" fill="url(#originGlow)" />

        {/* TARGET vector (always right) */}
        <line x1={cx} y1={cy} x2={lerp(cx, targetEnd.x, animProgress)} y2={cy}
          stroke="#00ffcc" strokeWidth="3" markerEnd="url(#arrowTarget)"
          filter="url(#vecGlow)" strokeLinecap="round" />

        {/* SELECTED DRUG vector */}
        <line x1={cx} y1={cy}
          x2={lerp(cx, selectedEnd.x, animProgress)}
          y2={lerp(cy, selectedEnd.y, animProgress)}
          stroke={dynamicColor} strokeWidth="3" markerEnd="url(#arrowSelected)"
          filter="url(#vecGlow)" strokeLinecap="round" />

        {/* Origin dot */}
        <circle cx={cx} cy={cy} r="5" fill="#fff" stroke="#07090f" strokeWidth="2" />

        {/* Target endpoint dot */}
        <circle cx={lerp(cx, targetEnd.x, animProgress)} cy={cy}
          r="6" fill="#00ffcc" stroke="#07090f" strokeWidth="2" opacity={animProgress} />

        {/* Selected endpoint dot */}
        <circle cx={lerp(cx, selectedEnd.x, animProgress)}
          cy={lerp(cy, selectedEnd.y, animProgress)}
          r="6" fill={dynamicColor} stroke="#07090f" strokeWidth="2" opacity={animProgress} />

        {/* Labels */}
        <text x={lerp(cx, targetEnd.x, animProgress) - 10}
          y={cy + 24}
          textAnchor="end" fill="#00ffcc" fontSize="12" fontWeight="600"
          fontFamily="'Space Grotesk', sans-serif" opacity={animProgress}>
          {targetDrug}
        </text>

        <text x={lerp(cx, selectedEnd.x, animProgress) + 10}
          y={lerp(cy, selectedEnd.y, animProgress) - 14}
          textAnchor="start" fill={dynamicColor} fontSize="12" fontWeight="600"
          fontFamily="'Space Grotesk', sans-serif" opacity={animProgress}>
          {selectedDrug}
        </text>

        {/* Axis labels */}
        <text x={cx + 195} y={cy + 18} fill="#475569" fontSize="10"
          fontFamily="'Space Grotesk', monospace" textAnchor="end">x</text>
        <text x={cx + 10} y={cy - 195} fill="#475569" fontSize="10"
          fontFamily="'Space Grotesk', monospace">y</text>

        {/* Origin label */}
        <text x={cx - 12} y={cy + 20} fill="#64748b" fontSize="10"
          fontFamily="'Space Grotesk', monospace">O</text>
      </svg>

      {/* Legend */}
      <div className="vector-legend">
        <div className="vector-legend-item">
          <span className="vector-legend-line" style={{ background: '#00ffcc' }}></span>
          {targetDrug} (target)
        </div>
        <div className="vector-legend-item">
          <span className="vector-legend-line" style={{ background: dynamicColor }}></span>
          {selectedDrug} (candidate)
        </div>
        <div className="vector-legend-item">
          <span className="vector-legend-arc"></span>
          θ = angle between vectors
        </div>
      </div>
    </div>
  );
};

// ── Drug Card ─────────────────────────────────────────────

const DrugCard = ({ drug, idx, isSelected, onClick }) => {
  const simPct = (drug.similarity_score * 100).toFixed(1);
  return (
    <button
      className={`drug-sim-card ${isSelected ? 'drug-sim-card--active' : ''}`}
      onClick={onClick}
      aria-label={`View similarity graph for ${drug.drug_name}`}
      style={{ animationDelay: `${idx * 0.04}s` }}
    >
      <div className="drug-sim-card-rank">#{idx + 1}</div>
      <div className="drug-sim-card-info">
        <span className="drug-sim-card-name">{drug.drug_name}</span>
        <span className="drug-sim-card-score">{simPct}% match</span>
      </div>
      {isSelected && <div className="drug-sim-card-indicator"></div>}
    </button>
  );
};

// ── Main Component ────────────────────────────────────────

const DrugSimilarityViz = ({ candidates, inputDrug, targetVector }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);

  if (!candidates || candidates.length === 0) return null;

  const sorted = useMemo(
    () => [...candidates].sort((a, b) => b.similarity_score - a.similarity_score),
    [candidates]
  );

  const selectedDrug = selectedIdx !== null ? sorted[selectedIdx] : null;

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOpen = () => {
    setSelectedIdx(null);
    setIsOpen(true);
  };

  const handleSelectDrug = (idx) => {
    setSelectedIdx(idx);
  };

  const handleBack = () => {
    setSelectedIdx(null);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        className="drug-viz-trigger"
        onClick={handleOpen}
        aria-label="View drug similarities"
        title="View Drug Similarity Vectors"
      >
        <BarChart3 size={16} />
        View Drug Similarities
      </button>

      {/* Modal via Portal */}
      {isOpen && createPortal(
        <div className="drug-viz-overlay" onClick={() => setIsOpen(false)}>
          <div className="drug-viz-modal" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Drug Similarity Visualization">

            {/* Header */}
            <div className="drug-viz-header">
              <div className="drug-viz-header-left">
                {selectedDrug && (
                  <button className="drug-viz-back" onClick={handleBack} aria-label="Back to drug list">
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div>
                  <h2>
                    <Dna size={22} />
                    {selectedDrug
                      ? `${inputDrug} vs ${selectedDrug.drug_name}`
                      : 'Drug Similarity Explorer'}
                  </h2>
                  <p className="drug-viz-subtitle">
                    {selectedDrug
                      ? 'Cosine similarity vector visualization'
                      : `Select a candidate to visualize vector similarity with ${inputDrug}`}
                  </p>
                </div>
              </div>
              <button className="drug-viz-close" onClick={() => setIsOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="drug-viz-content">
              {/* Drug List (always visible, collapses on selection) */}
              <div className={`drug-viz-list ${selectedDrug ? 'drug-viz-list--collapsed' : ''}`}>
                <div className="drug-viz-list-header">
                  <Target size={16} />
                  <span>Target: <strong>{inputDrug}</strong></span>
                  <span className="drug-viz-list-count">{sorted.length} candidates</span>
                </div>
                <div className="drug-viz-cards">
                  {sorted.map((drug, idx) => (
                    <DrugCard
                      key={drug.drugbank_id || idx}
                      drug={drug}
                      idx={idx}
                      isSelected={selectedIdx === idx}
                      onClick={() => handleSelectDrug(idx)}
                    />
                  ))}
                </div>
              </div>

              {/* Vector Graph */}
              <div className={`drug-viz-graph ${selectedDrug ? 'drug-viz-graph--visible' : ''}`}>
                {selectedDrug ? (
                  <VectorGraph
                    targetDrug={inputDrug}
                    selectedDrug={selectedDrug.drug_name}
                    similarity={selectedDrug.vector}
                    isVisible={!!selectedDrug}
                  />
                ) : (
                  <div className="drug-viz-placeholder">
                    <Dna size={48} />
                    <p>Click a drug candidate to visualize its cosine similarity vector.</p>
                  </div>
                )}

                {/* Shared targets info */}
                {selectedDrug && selectedDrug.shared_targets && selectedDrug.shared_targets.length > 0 && (
                  <div className="drug-viz-targets">
                    <h4>Shared Gene Targets</h4>
                    <div className="drug-viz-target-tags">
                      {selectedDrug.shared_targets.map(t => (
                        <span key={t} className="drug-viz-target-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default DrugSimilarityViz;
