import Login from './Login';
import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Search, Activity, SearchIcon, Sparkles, Beaker, Pill, AlertTriangle, ExternalLink, ActivitySquare, ShieldCheck, FileText, TrendingUp, FlaskConical, Download, ArrowRight, Database, Cpu, Globe, User, Zap } from 'lucide-react';
import './index.css';
import BioBackground from './BioBackground';
import CarbonLoading from './CarbonLoading';
import DrugSimilarityViz from './DrugSimilarityViz';
import Profile from './Profile';

const API_BASE = "http://localhost:8000";

const formatIndicationText = (text) => {
  if (!text || String(text).toLowerCase() === "nan") return <p>Not specified in core databank.</p>;
  let cleaned = text.replace(/\[L\d+\]/g, '');
  const paragraphs = cleaned.split(/\n\s*\n/).filter(p => p.trim() !== '');
  return paragraphs.map((p, i) => {
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
      <p className="candidate-disease" onClick={() => setShowFullDisease(!showFullDisease)} style={{ cursor: 'pointer' }} title="Click to toggle full disease areas">
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

// ── Landing Page ──────────────────────────────────────────────────────────────
const LandingPage = ({ onStart, user }) => (
  <>
    <BioBackground />
    <div className="content-overlay">
      <div className="landing-page fade-in">
        <div className="landing-hero">
          <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            <Activity className="logo-icon" size={48} />
            <h1 className="logo" style={{ fontSize: '3rem' }}>DrugNova <span>AI</span></h1>
          </div>
          {user && (
            <div className="welcome-banner glass">
              <span className="purpose-icon-lg">{PURPOSE_BADGE_ICON[user.purpose]}</span>
              <div style={{ flex: 1 }}>
                <p className="welcome-name">Welcome back, {user.name}</p>
                <p className="welcome-purpose">{PURPOSE_WELCOME[user.purpose]}</p>
              </div>
            </div>
          )}
          <p className="landing-tagline">Autonomous Drug Repurposing Platform</p>
          <p className="landing-desc">
            Discover new therapeutic uses for existing drugs using biological similarity,
            real-time clinical data and multi-source intelligence.
          </p>
          <button className="landing-cta glass" onClick={() => onStart('search')}>
            <Sparkles size={20} />
            Start Analyzing
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="landing-stats">
          <div className="stat-card glass">
            <Database size={28} className="stat-icon" />
            <div className="stat-number">19,842</div>
            <div className="stat-label">Drug Compounds</div>
          </div>
          <div className="stat-card glass">
            <Cpu size={28} className="stat-icon" />
            <div className="stat-number">51,891</div>
            <div className="stat-label">Biological Features</div>
          </div>
          <div className="stat-card glass">
            <Globe size={28} className="stat-icon" />
            <div className="stat-number">5</div>
            <div className="stat-label">Live Data Sources</div>
          </div>
          <div className="stat-card glass">
            <Activity size={28} className="stat-icon" />
            <div className="stat-number">2.9M+</div>
            <div className="stat-label">Drug Interactions</div>
          </div>
        </div>

        <div className="landing-features">
          <div className="feature-card glass">
            <Sparkles size={24} className="stat-icon" />
            <h3>Cosine Similarity Engine</h3>
            <p>Compares biological fingerprints across all drug compounds using gene targets and pathways</p>
          </div>
          <div className="feature-card glass">
            <ShieldCheck size={24} className="stat-icon" />
            <h3>Multi-Source Intelligence</h3>
            <p>Enriches every candidate with FDA regulatory data, clinical trials, patents and market signals</p>
          </div>
          <div className="feature-card glass">
            <FileText size={24} className="stat-icon" />
            <h3>Traceable Evidence</h3>
            <p>Every finding is cited with primary sources — DrugBank, ClinicalTrials.gov, FDA Orange Book</p>
          </div>
        </div>

        {/* Section 1 — Scalability & Market */}
        <div className="section-header" style={{ marginTop: '5rem', textAlign: 'center', justifyContent: 'center' }}>
          <TrendingUp className="logo-icon" size={24} />
          <h2 style={{ flex: 'none' }}>Scalability & Market Potential</h2>
        </div>

        <div className="landing-stats" style={{ marginTop: '1.5rem' }}>
          <div className="stat-card glass">
            <Globe size={28} className="stat-icon" />
            <div className="stat-number">$280B</div>
            <div className="stat-label">Global Pharma R&D Spend</div>
          </div>
          <div className="stat-card glass">
            <Database size={28} className="stat-icon" />
            <div className="stat-number">10,000+</div>
            <div className="stat-label">Repurposing Opportunities Identified Annually</div>
          </div>
          <div className="stat-card glass">
            <Zap size={28} className="stat-icon" />
            <div className="stat-number">3-5x</div>
            <div className="stat-label">Faster than Traditional Discovery</div>
          </div>
        </div>

        <div className="landing-features" style={{ marginTop: '2.5rem' }}>
          <div className="feature-card glass">
            <ActivitySquare size={24} className="stat-icon" />
            <h3>Pharma R&D Teams</h3>
            <p>Accelerate pipeline decisions and optimize resource allocation with data-driven insights</p>
          </div>
          <div className="feature-card glass">
            <FlaskConical size={24} className="stat-icon" />
            <h3>Biotech Startups</h3>
            <p>Identify high-potential repurposing candidates even with limited initial discovery budgets</p>
          </div>
          <div className="feature-card glass">
            <Beaker size={24} className="stat-icon" />
            <h3>Academic Researchers</h3>
            <p>Access traceable evidence and comprehensive biological fingerprints for high-impact publications</p>
          </div>
        </div>

        <p className="hint" style={{ marginTop: '2.5rem', opacity: 0.8, fontSize: '1rem', letterSpacing: '0.05em' }}>
          Expanding to rare diseases <span style={{ color: 'var(--accent)', margin: '0 8px' }}>→</span> real-time trial integration <span style={{ color: 'var(--accent)', margin: '0 8px' }}>→</span> API licensing
        </p>

        {/* Section 2 — Business Model */}
        <div className="section-header" style={{ marginTop: '6rem', textAlign: 'center', justifyContent: 'center' }}>
          <Database className="logo-icon" size={24} />
          <h2 style={{ flex: 'none' }}>Business Model</h2>
        </div>

        <div className="landing-features" style={{ marginTop: '2.5rem' }}>
          <div className="feature-card glass">
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>Free</div>
            <p>Basic repurposing search, top 5 candidates, DrugBank data only</p>
          </div>
          <div className="feature-card glass" style={{ border: '1px solid var(--accent)', boxShadow: '0 0 25px rgba(0, 255, 204, 0.25)', borderTop: '4px solid var(--accent)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Pro <span style={{ fontSize: '0.9rem', background: 'var(--accent)', color: '#000', padding: '2px 8px', borderRadius: '4px' }}>Recommended</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>$99<span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>/mo</span></div>
            <p>Full report, all 7 data sources, citation export, API access</p>
          </div>
          <div className="feature-card glass">
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>Enterprise</div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>Custom</p>
            <p>White-label integration, bulk analysis, dedicated support</p>
          </div>
        </div>

        <p className="hint" style={{ marginTop: '2.5rem', opacity: 0.8, fontSize: '1rem', letterSpacing: '0.05em' }}>
          Funding path — open source core + SaaS revenue + pharma partnership licensing
        </p>
      </div>
      {user && (
        <div className="landing-header-user">
          <button className="user-profile-btn" onClick={() => onStart('profile')}>
            <span className="user-icon-circle">
              <User size={18} />
            </span>
            <div className="user-info-text">
              <span className="user-name-text">{user.name}</span>
              <span className="user-purpose-tag">{PURPOSE_BADGE_ICON[user.purpose]} {user.purpose}</span>
            </div>
          </button>
        </div>
      )}
    </div>
  </>
);

// ── Tab Navigation ────────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: 'overview', label: 'Overview', icon: Pill },
  { id: 'clinical', label: 'Clinical', icon: ActivitySquare },
  { id: 'intelligence', label: 'Intelligence', icon: TrendingUp },
  { id: 'chemistry', label: 'Chemistry', icon: FlaskConical },
];

const PURPOSE_TABS = {
  "Academic Research": ['overview', 'clinical', 'chemistry'],
  "Drug Discovery": ['overview', 'clinical', 'intelligence', 'chemistry'],
  "Healthcare Professional": ['overview', 'clinical'],
  "Personal Learning": ['overview', 'clinical', 'chemistry'],
};

const PURPOSE_SEARCH_HINT = {
  "Academic Research": "Search compounds for research analysis...",
  "Drug Discovery": "Search compounds for pipeline discovery...",
  "Healthcare Professional": "Search compounds for clinical insights...",
  "Personal Learning": "Search compounds to learn about drug biology...",
};

const PURPOSE_WELCOME = {
  "Academic Research": "Exploring drug repurposing for research",
  "Drug Discovery": "Accelerating your drug pipeline",
  "Healthcare Professional": "Evidence-based repurposing insights",
  "Personal Learning": "Discover the science of drug repurposing",
};

const PURPOSE_BADGE_ICON = {
  "Academic Research": "🔬",
  "Drug Discovery": "💊",
  "Healthcare Professional": "🏥",
  "Personal Learning": "📚",
};

function App() {
  // ── Auth state ─────────────────────────────────────────────────────────────
  // Force login on every refresh by starting with null
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setPage('landing');
  };

  const handleLogout = () => {
    localStorage.removeItem('drugnova_token');
    localStorage.removeItem('drugnova_user');
    setUser(null);
    setPage('landing');
    setReport(null);
    setError(null);
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  // ── App state ──────────────────────────────────────────────────────────────
  const [page, setPage] = useState('landing');
  const [drugName, setDrugName] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showFullDisease, setShowFullDisease] = useState(false);

  // tabs filtered by purpose
  const allowedTabIds = user ? (PURPOSE_TABS[user.purpose] || ALL_TABS.map(t => t.id)) : ALL_TABS.map(t => t.id);
  const TABS = ALL_TABS.filter(t => allowedTabIds.includes(t.id));

  const analyze = async (e) => {
    if (e) e.preventDefault();
    if (!drugName.trim()) return;
    setLoading(true);
    setReport(null);
    setError(null);
    setActiveTab('overview');
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
    const applyDarkBackground = (pdf) => {
      pdf.setFillColor(7, 9, 15);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    };
    const addInsightBox = (text, x, currentY, maxWidth) => {
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(String(text), maxWidth - 10);
      const boxHeight = (lines.length * 5) + 15;
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(x, currentY, maxWidth, boxHeight, 3, 3, 'F');
      doc.setTextColor(79, 209, 197);
      doc.setFont('helvetica', 'bold');
      doc.text("REPURPOSING INSIGHT", x + 5, currentY + 7);
      doc.setTextColor(226, 232, 240);
      doc.setFont('helvetica', 'normal');
      doc.text(lines, x + 5, currentY + 14);
      return currentY + boxHeight + 8;
    };
    const addLabelValue = (label, value, x, currentY, maxWidth) => {
      doc.setFontSize(9);
      doc.setTextColor(79, 209, 197);
      doc.setFont('helvetica', 'bold');
      doc.text(`• ${label}: `, x, currentY);
      const labelWidth = doc.getTextWidth(`• ${label}: `);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      const valText = String(value || "N/A");
      const subLines = doc.splitTextToSize(valText, maxWidth - labelWidth);
      doc.text(subLines, x + labelWidth, currentY);
      return currentY + (subLines.length * 5) + 2;
    };
    applyDarkBackground(doc);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("DrugNova AI Analysis Report", margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(79, 209, 197);
    doc.text("Autonomous Biological Target Repurposing", margin, y);
    y += 15;
    doc.setDrawColor(255, 255, 255, 0.1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Reference Compound Context", margin, y);
    y += 10;
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y, chartW, 35, 3, 3, 'F');
    let ctxY = y + 8;
    ctxY = addLabelValue("Target Compound", report.input_drug, margin + 5, ctxY, chartW - 10);
    ctxY = addLabelValue("DrugBank ID", report.drugbank_id, margin + 5, ctxY, chartW - 10);
    ctxY = addLabelValue("Current Indication", report.current_indication.slice(0, 150) + "...", margin + 5, ctxY, chartW - 10);
    y += 45;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Repurposing Candidates", margin, y);
    y += 10;
    report.repurposing_candidates.forEach((cand, i) => {
      if (y + 90 > pageHeight) {
        doc.addPage();
        applyDarkBackground(doc);
        y = 20;
      }
      const cardTop = y;
      const cardHeight = 100;
      doc.setFillColor(15, 23, 42, 0.5);
      doc.setDrawColor(79, 209, 197, 0.4);
      doc.roundedRect(margin, cardTop, chartW, cardHeight, 4, 4, 'FD');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 2}. ${cand.drug_name}`, margin + 8, cardTop + 10);
      doc.setTextColor(79, 209, 197);
      doc.text(`${(cand.similarity_score * 100).toFixed(1)}% match`, pageWidth - margin - 8, cardTop + 10, { align: 'right' });
      let listY = cardTop + 20;
      listY = addLabelValue("DrugBank ID", cand.drugbank_id, margin + 8, listY, chartW - 16);
      listY = addLabelValue("Cosine Similarity", `${(cand.similarity_score * 100).toFixed(1)}%`, margin + 8, listY, chartW - 16);
      listY = addLabelValue("Therapeutic Areas", cand.current_disease_area || "Not Specified", margin + 8, listY, chartW - 16);
      listY = addLabelValue("Shared Targets", cand.shared_targets?.length ? cand.shared_targets.join(", ") : "None", margin + 8, listY, chartW - 16);
      listY += 2;
      const strength = cand.similarity_score > 0.7 ? "high" : cand.similarity_score > 0.4 ? "moderate" : "targeted";
      const insightText = `With a ${strength} cosine similarity of ${(cand.similarity_score * 100).toFixed(1)}%, ${cand.drug_name} shares ${cand.shared_targets?.length || 0} biological targets with the query drug.`;
      y = addInsightBox(insightText, margin + 8, listY, chartW - 16);
      y += 5;
    });
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated via DrugNova AI v1.0`, margin, pageHeight - 10);
    doc.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.save(`DrugNova_Analysis_${report.input_drug}.pdf`);
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // ── Landing page ───────────────────────────────────────────────────────────
  if (page === 'landing') {
    return <LandingPage onStart={(targetPage) => setPage(targetPage)} user={user} />;
  }

  // ── Profile page ───────────────────────────────────────────────────────────
  if (page === 'profile') {
    return (
      <>
        <BioBackground />
        <div className="content-overlay">
          <Profile
            user={user}
            onUpdate={handleProfileUpdate}
            onLogout={handleLogout}
            onBack={() => setPage('search')}
          />
        </div>
      </>
    );
  }

  // ── Search + Results page ───────────────────────────────────────────────────
  return (
    <>
      <BioBackground />
      <div className="content-overlay">
        <header className="fade-in">
          <div className="logo-container">
            <Activity className="logo-icon" size={36} />
            <h1 className="logo" style={{ cursor: 'pointer' }} onClick={() => { setPage('landing'); setReport(null); setError(null); }}>
              DrugNova <span>AI</span>
            </h1>
          </div>
          <p className="tagline">Autonomous Drug Repurposing</p>
          {user && (
            <div className="header-user">
              <button className="user-profile-btn" onClick={() => setPage('profile')}>
                <span className="user-icon-circle">
                  <User size={18} />
                </span>
                <div className="user-info-text">
                  <span className="user-name-text">{user.name}</span>
                  <span className="user-purpose-tag">{PURPOSE_BADGE_ICON[user.purpose]} {user.purpose}</span>
                </div>
              </button>
            </div>
          )}
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
                placeholder={user ? PURPOSE_SEARCH_HINT[user.purpose] : "Enter a drug (e.g. Metformin, Aspirin)"}
                autoComplete="off"
              />
              <button onClick={analyze} disabled={loading}>
                {loading ? <span>Analyzing...</span> : <><Sparkles size={18} />Analyze</>}
              </button>
            </div>
            <p className="hint"><Beaker size={14} /> Searches across 19,842 DrugBank compounds</p>
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

              {/* Drug header */}
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

              {/* Tab navigation */}
              <div className="tab-nav glass">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── TAB: Overview ─────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <>
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
                </>
              )}

              {/* ── TAB: Clinical ─────────────────────────────────────────── */}
              {activeTab === 'clinical' && (
                <>
                  <div className="section-header">
                    <ActivitySquare className="logo-icon" size={24} />
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

                  <div className="section-header" style={{ marginTop: '2rem' }}>
                    <AlertTriangle className="logo-icon" size={24} />
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
                </>
              )}

              {/* ── TAB: Intelligence ─────────────────────────────────────── */}
              {activeTab === 'intelligence' && (
                <>
                  {/* Regulatory */}
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
                        {regMod.sources?.length > 0 && (
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

                  {/* Patent */}
                  {(() => {
                    const patentMod = getModule(report, 'patents');
                    return patentMod && patentMod.findings && patentMod.findings.length > 0 && (
                      <>
                        <div className="section-header" style={{ marginTop: '2rem' }}>
                          <FileText className="logo-icon" size={24} />
                          <h2>Patent Landscape</h2>
                        </div>
                        <p className="section-desc">FDA Orange Book patent records, expiry dates and exclusivity status</p>
                        {patentMod.findings.map((f, idx) => (
                          <div key={idx} className="info-row glass">
                            <FileText className="trial-icon" size={18} />
                            <span>{f}</span>
                          </div>
                        ))}
                        {patentMod.sources?.length > 0 && (
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

                  {/* Market */}
                  {(() => {
                    const marketMod = getModule(report, 'market');
                    return marketMod && marketMod.findings && marketMod.findings.length > 0 && (
                      <>
                        <div className="section-header" style={{ marginTop: '2rem' }}>
                          <TrendingUp className="logo-icon" size={24} />
                          <h2>Market Intelligence</h2>
                        </div>
                        <p className="section-desc">FDA adverse event reports and real-world clinical usage signals</p>
                        {marketMod.findings.map((f, idx) => (
                          <div key={idx} className="info-row glass">
                            <TrendingUp className="trial-icon" size={18} />
                            <span>{f}</span>
                          </div>
                        ))}
                        {marketMod.sources?.length > 0 && (
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

                  {/* SEC */}
                  {(() => {
                    const secMod = getModule(report, 'sec_signals');
                    return secMod && secMod.findings && secMod.findings.length > 0 && (
                      <>
                        <div className="section-header" style={{ marginTop: '2rem' }}>
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
                        {secMod.sources?.length > 0 && (
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
                </>
              )}

              {/* ── TAB: Chemistry ────────────────────────────────────────── */}
              {activeTab === 'chemistry' && (
                <>
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
                        {pcMod.sources?.length > 0 && (
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
                </>
              )}

              <div className="sources-footer">
                <p><Activity size={16} /> All findings traceable to DrugBank, ClinicalTrials.gov, PubChem, FDA Orange Book and OpenFDA.</p>
              </div>

            </section>
          )}
        </main>
      </div>
    </>
  );
}

export default App;