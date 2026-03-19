import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, X } from 'lucide-react';
import './SimilarityChart.css';

const SimilarityChart = ({ candidates, inputDrug }) => {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef(null);

  if (!candidates || candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => b.similarity_score - a.similarity_score);

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

  // Chart dimensions
  const W = 780, H = 420;
  const padLeft = 60, padRight = 40, padTop = 50, padBottom = 80;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  // Map candidates to x,y points
  const points = sorted.map((c, i) => ({
    x: padLeft + (i / (sorted.length - 1 || 1)) * chartW,
    y: padTop + chartH - (c.similarity_score * chartH),
    score: c.similarity_score,
    name: c.drug_name,
  }));

  // Build smooth cosine-style curve using cubic bezier
  const buildCurvePath = () => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpx = (p0.x + p1.x) / 2;
      path += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  // Build the gradient fill area under the curve
  const buildAreaPath = () => {
    const curve = buildCurvePath();
    const lastPt = points[points.length - 1];
    const firstPt = points[0];
    return `${curve} L ${lastPt.x} ${padTop + chartH} L ${firstPt.x} ${padTop + chartH} Z`;
  };

  // Y-axis ticks
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <>
      {/* The trigger button — render this where needed via the parent */}
      <button
        className="graph-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="View cosine similarity graph"
        title="View Cosine Similarity Graph"
      >
        <BarChart3 size={16} />
        View Graph
      </button>

      {/* Modal overlay — rendered via Portal to escape stacking context */}
      {isOpen && createPortal(
        <div className="graph-modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="graph-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Cosine Similarity Graph"
          >
            {/* Header */}
            <div className="graph-modal-header">
              <div>
                <h2><BarChart3 size={22} /> Cosine Similarity Graph</h2>
                <p className="graph-modal-subtitle">
                  Biological similarity of <strong>{inputDrug}</strong> vs top {sorted.length} candidates
                </p>
              </div>
              <button className="graph-close-btn" onClick={() => setIsOpen(false)} aria-label="Close graph">
                <X size={20} />
              </button>
            </div>

            {/* SVG Graph */}
            <div className="graph-svg-container">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="cosine-graph-svg"
                role="img"
                aria-label={`Cosine similarity curve for ${sorted.length} repurposing candidates`}
              >
                <defs>
                  {/* Gradient for the area fill */}
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00ffcc" stopOpacity="0.02" />
                  </linearGradient>
                  {/* Gradient for the line */}
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00ffcc" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                  {/* Glow filter */}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="dotGlow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid lines */}
                {yTicks.map((tick) => {
                  const y = padTop + chartH - tick * chartH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padLeft} y1={y}
                        x2={padLeft + chartW} y2={y}
                        stroke="rgba(255,255,255,0.06)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        fill="#64748b"
                        fontSize="11"
                        fontFamily="'Space Grotesk', monospace"
                      >
                        {(tick * 100).toFixed(0)}%
                      </text>
                    </g>
                  );
                })}

                {/* X axis line */}
                <line
                  x1={padLeft} y1={padTop + chartH}
                  x2={padLeft + chartW} y2={padTop + chartH}
                  stroke="rgba(255,255,255,0.1)"
                />

                {/* Y axis line */}
                <line
                  x1={padLeft} y1={padTop}
                  x2={padLeft} y2={padTop + chartH}
                  stroke="rgba(255,255,255,0.1)"
                />

                {/* Area fill under the curve */}
                <path
                  d={buildAreaPath()}
                  fill="url(#areaGrad)"
                  className="graph-area"
                />

                {/* The cosine-style smooth curve */}
                <path
                  d={buildCurvePath()}
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  className="graph-curve"
                />

                {/* Data points + labels */}
                {points.map((pt, idx) => (
                  <g key={idx} className="graph-point-group">
                    {/* Vertical dashed line from point to x-axis */}
                    <line
                      x1={pt.x} y1={pt.y}
                      x2={pt.x} y2={padTop + chartH}
                      stroke="rgba(0,255,204,0.12)"
                      strokeDasharray="3 3"
                    />

                    {/* Outer glow ring */}
                    <circle
                      cx={pt.x} cy={pt.y} r="10"
                      fill="rgba(0,255,204,0.1)"
                      className="point-pulse"
                      style={{ animationDelay: `${idx * 0.15}s` }}
                    />

                    {/* The dot */}
                    <circle
                      cx={pt.x} cy={pt.y} r="5"
                      fill="#00ffcc"
                      stroke="#07090f"
                      strokeWidth="2"
                      filter="url(#dotGlow)"
                    />

                    {/* Score label above the point */}
                    <text
                      x={pt.x}
                      y={pt.y - 16}
                      textAnchor="middle"
                      fill="#00ffcc"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="'Space Grotesk', monospace"
                    >
                      {(pt.score * 100).toFixed(1)}%
                    </text>

                    {/* Drug name label on x-axis */}
                    <text
                      x={pt.x}
                      y={padTop + chartH + 18}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="'Outfit', sans-serif"
                      transform={`rotate(-35, ${pt.x}, ${padTop + chartH + 18})`}
                    >
                      {pt.name.length > 14 ? pt.name.slice(0, 12) + '…' : pt.name}
                    </text>
                  </g>
                ))}

                {/* Y-axis label */}
                <text
                  x={16} y={padTop + chartH / 2}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="'Space Grotesk', sans-serif"
                  transform={`rotate(-90, 16, ${padTop + chartH / 2})`}
                >
                  Cosine Similarity
                </text>
              </svg>
            </div>

            {/* Bottom legend / info */}
            <div className="graph-modal-footer">
              <div className="graph-legend-item">
                <span className="graph-legend-line"></span>
                Similarity curve (smoothed)
              </div>
              <div className="graph-legend-item">
                <span className="graph-legend-dot"></span>
                Candidate data point
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
};

export default SimilarityChart;
