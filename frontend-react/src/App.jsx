import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Search, Activity, SearchIcon, Sparkles, Beaker, Pill, AlertTriangle, ExternalLink, ActivitySquare, ShieldCheck, FileText, TrendingUp, FlaskConical, Download } from 'lucide-react';
import './index.css';
import BioBackground from './BioBackground';
import CarbonLoading from './CarbonLoading';
import DrugSimilarityViz from './DrugSimilarityViz';

const API_BASE = "http://localhost:8000";

const formatIndicationText = (text) => {
  if (!text || String(text).toLowerCase() === "nan") return <p>Not specified in core databank.</p>;

  // Remove citation brackets like [L40243]
  let cleaned = text.replace(/\[L\d+\]/g, '');

  // Split by double newlines or carriage returns to make paragraphs
  const paragraphs = cleaned.split(/\n\s*\n/).filter(p => p.trim() !== '');

  return paragraphs.map((p, i) => {
    // Basic bold parsing for **text**
    const parts = p.split(/(\*\*.*?\*\*)/g);

    return (
      <p key={i} style={{ marginBottom: '12px' }}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} style={{ color: '#00ffcc', display: 'block', fontSize: '1.1rem', marginBottom: '4px' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  });
};

const getModule = (report, moduleName) => {
  if (!report?.module_results) return null;
  return report.module_results.find(m => m.module === moduleName) || null;
};

const formatDiseaseArea = (areaStr) => {
  if (!areaStr || String(areaStr).toLowerCase() === "nan") return "Various Conditions";
  const parts = String(areaStr).split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return "Various Conditions";
  if (parts.length <= 2) return parts.join(', ');
  return `${parts[0]}, ${parts[1]} + ${parts.length - 2} more`;
};

const CandidateCard = ({ candidate, idx }) => {
  const [showFullDisease, setShowFullDisease] = useState(false);

  return (
    <div className="candidate-card glass">
      <div className="candidate-header">
        <span className="rank">{idx + 1}</span>
        <span className="candidate-name">{candidate.drug_name}</span>
        <span className="score-badge">
          <Activity size={14} />
          {(candidate.similarity_score * 100).toFixed(1)}% match
        </span>
      </div>

      <p
        className="candidate-disease"
        onClick={() => setShowFullDisease(!showFullDisease)}
        style={{ cursor: 'pointer' }}
        title="Click to toggle full disease areas"
      >
        Used for: <strong>
          {showFullDisease
            ? (candidate.current_disease_area && String(candidate.current_disease_area).toLowerCase() !== 'nan' ? String(candidate.current_disease_area).replace(/\|/g, ', ') : "Various Conditions")
            : formatDiseaseArea(candidate.current_disease_area)}
        </strong>
      </p>

      <div className="feature-container">
        {candidate.shared_targets && candidate.shared_targets.length > 0 && (
          <div className="feature-col">
            <h4>Shared Targets</h4>
            <div className="feature-tags">
              {candidate.shared_targets.slice(0, 5).map(t => (
                <span key={t} className="feature-tag">{t}</span>
              ))}
              {candidate.shared_targets.length > 5 && (
                <span className="feature-tag">+{candidate.shared_targets.length - 5}</span>
              )}
            </div>
          </div>
        )}

        {candidate.shared_pathways && candidate.shared_pathways.length > 0 && (
          <div className="feature-col">
            <h4>Shared Pathways</h4>
            <div className="feature-tags">
              {candidate.shared_pathways.slice(0, 3).map(p => (
                <span key={p} className="feature-tag">{p}</span>
              ))}
              {candidate.shared_pathways.length > 3 && (
                <span className="feature-tag">+{candidate.shared_pathways.length - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="source-link">
        <a href={candidate.sources?.[0]?.url || `https://go.drugbank.com/drugs/${candidate.drugbank_id}`} target="_blank" rel="noopener noreferrer">
          View compound on DrugBank <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

function App() {
  const [drugName, setDrugName] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [showFullDisease, setShowFullDisease] = useState(false);

  const analyze = async (e) => {
    if (e) e.preventDefault();
    if (!drugName.trim()) return;

    setLoading(true);
    setReport(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drug_name: drugName.trim(), top_n: 10 }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed due to server error");
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const chartW = pageWidth - 2 * margin;
    let y = 20;

    // Helper: Dark Background for the whole page
    const applyDarkBackground = (pdf) => {
      pdf.setFillColor(7, 9, 15); // Dark background #07090f
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    // Helper: Nested Insight Box
    const addInsightBox = (text, x, currentY, maxWidth) => {
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(String(text), maxWidth - 10);
      const boxHeight = (lines.length * 5) + 15;

      // Box background
      doc.setFillColor(15, 23, 42); // Darker blue #0f172a
      doc.roundedRect(x, currentY, maxWidth, boxHeight, 3, 3, 'F');

      // Header
      doc.setTextColor(79, 209, 197); // Teal
      doc.setFont('helvetica', 'bold');
      doc.text("REPURPOSING INSIGHT", x + 5, currentY + 7);

      // Body
      doc.setTextColor(226, 232, 240); // Light gray
      doc.setFont('helvetica', 'normal');
      doc.text(lines, x + 5, currentY + 14);

      return currentY + boxHeight + 8;
    };

    // Helper: Key-Value Label Pair
    const addLabelValue = (label, value, x, currentY, maxWidth) => {
      doc.setFontSize(9);
      doc.setTextColor(79, 209, 197); // Teal Label
      doc.setFont('helvetica', 'bold');
      doc.text(`• ${label}: `, x, currentY);

      const labelWidth = doc.getTextWidth(`• ${label}: `);
      doc.setTextColor(255, 255, 255); // White Value
      doc.setFont('helvetica', 'normal');

      const valText = String(value || "N/A");
      const subLines = doc.splitTextToSize(valText, maxWidth - labelWidth);
      doc.text(subLines, x + labelWidth, currentY);

      return currentY + (subLines.length * 5) + 2;
    };

    // Initial Background
    applyDarkBackground(doc);

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("DrugNova AI Analysis Report", margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(79, 209, 197);
    doc.text("Autonomous Biological Target Repurposing", margin, y);
    y += 15;

    // Line separator
    doc.setDrawColor(255, 255, 255, 0.1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // 1. Target Drug Context
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Reference Compound Context", margin, y);
    y += 10;

    doc.setFillColor(30, 41, 59); // Surface #1e293b
    doc.roundedRect(margin, y, chartW, 35, 3, 3, 'F');
    let ctxY = y + 8;
    ctxY = addLabelValue("Target Compound", report.input_drug, margin + 5, ctxY, chartW - 10);
    ctxY = addLabelValue("DrugBank ID", report.drugbank_id, margin + 5, ctxY, chartW - 10);
    ctxY = addLabelValue("Current Indication", report.current_indication.slice(0, 150) + "...", margin + 5, ctxY, chartW - 10);
    y += 45;

    // 2. Candidates Loop
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Repurposing Candidates", margin, y);
    y += 10;

    report.repurposing_candidates.forEach((cand, i) => {
      // Check for page break (estimated card height ~90)
      if (y + 90 > pageHeight) {
        doc.addPage();
        applyDarkBackground(doc);
        y = 20;
      }

      const cardTop = y;
      const cardHeight = 100;

      // Card Background & Border
      doc.setFillColor(15, 23, 42, 0.5);
      doc.setDrawColor(79, 209, 197, 0.4); // Neon Teal Border
      doc.roundedRect(margin, cardTop, chartW, cardHeight, 4, 4, 'FD');

      // Card Header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 2}. ${cand.drug_name}`, margin + 8, cardTop + 10); // +2 for listing purposes

      doc.setTextColor(79, 209, 197);
      doc.text(`${(cand.similarity_score * 100).toFixed(1)}% match`, pageWidth - margin - 8, cardTop + 10, { align: 'right' });

      // Card Details
      let listY = cardTop + 20;
      listY = addLabelValue("DrugBank ID", cand.drugbank_id, margin + 8, listY, chartW - 16);
      listY = addLabelValue("Cosine Similarity", `${(cand.similarity_score * 100).toFixed(1)}% (${cand.similarity_score > 0.8 ? 'High' : cand.similarity_score > 0.5 ? 'Moderate' : 'Targeted'})`, margin + 8, listY, chartW - 16);
      listY = addLabelValue("Drug Class", cand.category || "Classification Unknown", margin + 8, listY, chartW - 16);
      listY = addLabelValue("Mechanism of Action", cand.mechanism || "Mechanism Data Unavailable", margin + 8, listY, chartW - 16);
      listY = addLabelValue("Therapeutic Areas", cand.current_disease_area || "Not Specified", margin + 8, listY, chartW - 16);
      listY = addLabelValue("Shared Targets", cand.shared_targets?.length ? cand.shared_targets.join(", ") : "None Detected", margin + 8, listY, chartW - 16);
      listY = addLabelValue("Reference", `https://go.drugbank.com/drugs/${cand.drugbank_id}`, margin + 8, listY, chartW - 16);

      // Insight Box within card
      listY += 2;
      const strength = cand.similarity_score > 0.7 ? "high" : cand.similarity_score > 0.4 ? "moderate" : "targeted";
      const insightText = `With a ${strength} cosine similarity of ${(cand.similarity_score * 100).toFixed(1)}%, ${cand.drug_name} shares ${cand.shared_targets?.length || 0} biological targets (${cand.shared_targets?.slice(0, 3).join(", ")}...) with the query drug. Both drugs are classified under: ${cand.category || 'diverse therapeutic areas'}. This suggests potential for cross-indication investigation.`;

      y = addInsightBox(insightText, margin + 8, listY, chartW - 16);

      y += 5; // spacing between cards
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Digital Fingerprint: ${btoa(report.input_drug).slice(0, 16)} | Generated via DrugNova AI v1.0`, margin, pageHeight - 10);
    doc.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });

    doc.save(`DrugNova_Analysis_${report.input_drug}.pdf`);
  };

  return (
    <>
      <BioBackground />
      <div className="content-overlay">
        <header className="fade-in">
          <div className="logo-container">
            <Activity className="logo-icon" size={36} />
            <h1 className="logo">DrugNova <span>AI</span></h1>
          </div>
          <p className="tagline">Autonomous Drug Repurposing</p>
        </header>

        <main>
          <section className="search-section fade-in">
            <div className="search-box glass">
              <SearchIcon className="search-icon" size={20} />
              <input
                type="text"
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="Enter a drug (e.g. Metformin, Aspirin)"
                autoComplete="off"
              />
              <button onClick={analyze} disabled={loading}>
                {loading ? (
                  <span>Analyzing...</span>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Analyze
                  </>
                )}
              </button>
            </div>
            <p className="hint">
              <Beaker size={14} /> Searches across 19,842 DrugBank compounds
            </p>
          </section>

          {loading && (
            <section className="loading-box glass fade-in">
              <CarbonLoading />
              <h3>Computing biological similarities...</h3>
              <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>Mapping gene targets and pathways across entire databank</p>
            </section>
          )}

          {error && (
            <section className="error-box glass fade-in">
              <AlertTriangle size={24} />
              <span>{error}</span>
            </section>
          )}

          {report && (
            <section className="report fade-in">
              <div className="glass indication-box">
                <div className="drug-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Pill color="#4fd1c5" size={32} />
                      {report.input_drug}
                    </h1>
                    <p className="drug-id">ID: {report.drugbank_id}</p>
                  </div>
                  <div
                    className="disease-badge"
                    title={report.current_disease_area && String(report.current_disease_area).toLowerCase() !== 'nan' ? String(report.current_disease_area).replace(/\|/g, ', ') : "Unknown Target Area"}
                    onClick={() => setShowFullDisease(!showFullDisease)}
                    style={{ cursor: 'pointer', whiteSpace: showFullDisease ? 'normal' : 'nowrap' }}
                  >
                    <ActivitySquare size={16} />
                    {showFullDisease
                      ? (report.current_disease_area && String(report.current_disease_area).toLowerCase() !== 'nan' ? String(report.current_disease_area).replace(/\|/g, ', ') : "Unknown Target Area")
                      : formatDiseaseArea(report.current_disease_area)}
                  </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3>Current Indication</h3>
                  <div className="formatted-indication">
                    {formatIndicationText(report.current_indication)}
                  </div>
                </div>
              </div>

              <div className="section-header">
                <Sparkles className="logo-icon" size={24} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <h2>Repurposing Candidates <span className="count-badge">{report.repurposing_candidates.length} options</span></h2>
                  <button className="download-btn glass" onClick={generateReport}>
                    <Download size={16} />
                    Download Report
                  </button>
                </div>
                {report.repurposing_candidates.length > 0 && (
                  <DrugSimilarityViz
                    candidates={report.repurposing_candidates}
                    inputDrug={report.input_drug}
                    targetVector={report.target_vector}
                  />
                )}
              </div>
              <p className="section-desc">Drugs sharing similar biology but currently prescribed for different conditions</p>

              <div className="candidate-grid">
                {report.repurposing_candidates.length === 0 ? (
                  <p className="empty">No strong repurposing candidates found.</p>
                ) : (
                  report.repurposing_candidates.map((candidate, idx) => (
                    <CandidateCard key={idx} candidate={candidate} idx={idx} />
                  ))
                )}
              </div>

              <div className="section-header">
                <h2>Clinical Trials</h2>
              </div>
              {report.clinical_trials && report.clinical_trials.length > 0 ? (
                report.clinical_trials.slice(0, 5).map((trial, idx) => (
                  <div key={idx} className="info-row glass">
                    <ActivitySquare className="trial-icon" size={20} />
                    <span>{trial.info}</span>
                  </div>
                ))
              ) : (
                <p className="empty">No active trials found.</p>
              )}

              <div className="section-header">
                <h2>Interaction Warnings</h2>
              </div>
              {report.interaction_warnings && report.interaction_warnings.length > 0 ? (
                report.interaction_warnings.slice(0, 5).map((warning, idx) => (
                  <div key={idx} className="info-row interaction-row glass">
                    <AlertTriangle className="interaction-icon" size={20} />
                    <span>{warning}</span>
                  </div>
                ))
              ) : (
                <p className="empty">No significant interaction warnings in our database.</p>
              )}

              {/* Regulatory Section */}
              {(() => {
                const regMod = getModule(report, 'regulatory');
                return regMod && regMod.findings && regMod.findings.length > 0 && (
                  <>
                    <div className="section-header">
                      <ShieldCheck className="logo-icon" size={24} />
                      <h2>Regulatory Intelligence</h2>
                    </div>
                    <p className="section-desc">FDA approval status, labeling, and enforcement actions</p>
                    {regMod.findings.map((f, idx) => (
                      <div key={idx} className="info-row glass">
                        <ShieldCheck className="trial-icon" size={18} />
                        <span>{f}</span>
                      </div>
                    ))}
                    {regMod.sources && regMod.sources.length > 0 && (
                      <div className="module-sources">
                        {regMod.sources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="module-source-link">
                            {s.label} <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Market Intelligence Section */}
              {(() => {
                const marketMod = getModule(report, 'market');
                return marketMod && marketMod.findings && marketMod.findings.length > 0 && (
                  <>
                    <div className="section-header">
                      <TrendingUp className="logo-icon" size={24} />
                      <h2>Market Intelligence</h2>
                    </div>
                    <p className="section-desc">Medicare Part D and Medicaid spending data (CMS.gov)</p>
                    {marketMod.findings.map((f, idx) => (
                      <div key={idx} className="info-row glass">
                        <TrendingUp className="trial-icon" size={18} />
                        <span>{f}</span>
                      </div>
                    ))}
                    {marketMod.sources && marketMod.sources.length > 0 && (
                      <div className="module-sources">
                        {marketMod.sources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="module-source-link">
                            {s.label} <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}


              {/* SEC Signals Section */}
              {(() => {
                const secMod = getModule(report, 'sec_signals');
                return secMod && secMod.findings && secMod.findings.length > 0 && (
                  <>
                    <div className="section-header">
                      <TrendingUp className="logo-icon" size={24} />
                      <h2>SEC & Market Signals</h2>
                    </div>
                    <p className="section-desc">Corporate filings and market intelligence from SEC EDGAR</p>
                    {secMod.findings.map((f, idx) => (
                      <div key={idx} className="info-row glass">
                        <TrendingUp className="trial-icon" size={18} />
                        <span>{f}</span>
                      </div>
                    ))}
                    {secMod.sources && secMod.sources.length > 0 && (
                      <div className="module-sources">
                        {secMod.sources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="module-source-link">
                            {s.label} <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Patent Landscape Section */}
              {(() => {
                const patentMod = getModule(report, 'patents');
                return patentMod && patentMod.findings && patentMod.findings.length > 0 && (
                  <>
                    <div className="section-header">
                      <FileText className="logo-icon" size={24} />
                      <h2>Patent Landscape</h2>
                    </div>
                    <p className="section-desc">Relevant patent filings and intellectual property status (Europe PMC)</p>
                    {patentMod.findings.map((f, idx) => (
                      <div key={idx} className="info-row glass">
                        <FileText className="trial-icon" size={18} />
                        <span>{f}</span>
                      </div>
                    ))}
                    {patentMod.sources && patentMod.sources.length > 0 && (
                      <div className="module-sources">
                        {patentMod.sources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="module-source-link">
                            {s.label} <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* PubChem Section */}
              {(() => {
                const pcMod = getModule(report, 'pubchem');
                return pcMod && pcMod.findings && pcMod.findings.length > 0 && (
                  <>
                    <div className="section-header">
                      <FlaskConical className="logo-icon" size={24} />
                      <h2>PubChem Profile</h2>
                    </div>
                    <p className="section-desc">Chemical identity and molecular properties</p>
                    {pcMod.findings.map((f, idx) => (
                      <div key={idx} className="info-row glass">
                        <FlaskConical className="trial-icon" size={18} />
                        <span>{f}</span>
                      </div>
                    ))}
                    {pcMod.sources && pcMod.sources.length > 0 && (
                      <div className="module-sources">
                        {pcMod.sources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="module-source-link">
                            {s.label} <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="sources-footer">
                <p><Activity size={16} /> All findings traceable to DrugBank, ClinicalTrials.gov, PubChem, FDA, CMS, and Europe PMC.</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

export default App;
