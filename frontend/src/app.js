const API_BASE = "http://localhost:8000";

async function analyze() {
  const drugName = document.getElementById("drugInput").value.trim();
  if (!drugName) return;

  setVisible("loading", true);
  setVisible("report", false);
  setVisible("error", false);

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drug_name: drugName, top_n: 10 }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Analysis failed");
    }

    const data = await res.json();
    renderReport(data);
  } catch (e) {
    document.getElementById("errorMsg").textContent = e.message;
    setVisible("error", true);
  } finally {
    setVisible("loading", false);
  }
}

function renderReport(data) {
  document.getElementById("drugName").textContent = data.input_drug;
  document.getElementById("drugId").textContent = data.drugbank_id;
  document.getElementById("indication").textContent = data.current_indication || "Not specified";
  document.getElementById("diseaseBadge").textContent = data.current_disease_area || "Unknown";
  document.getElementById("candidateCount").textContent = `${data.repurposing_candidates.length} found`;

  // Candidates
  const cEl = document.getElementById("candidates");
  cEl.innerHTML = "";
  if (!data.repurposing_candidates.length) {
    cEl.innerHTML = '<p class="empty">No candidates found.</p>';
  } else {
    data.repurposing_candidates.forEach((c, i) => {
      const card = document.createElement("div");
      card.className = "candidate-card";
      card.innerHTML = `
        <div class="candidate-header">
          <span class="rank">#${i + 1}</span>
          <span class="candidate-name">${c.drug_name}</span>
          <span class="score-badge">${(c.similarity_score * 100).toFixed(1)}% similar</span>
        </div>
        <p class="candidate-disease">Currently used for: <strong>${c.current_disease_area}</strong></p>
        ${c.shared_targets.length ? `
          <div class="feature-row">
            <span class="feature-label">Shared gene targets</span>
            <span class="feature-values">${c.shared_targets.slice(0, 6).join(", ")}</span>
          </div>` : ""}
        ${c.shared_pathways.length ? `
          <div class="feature-row">
            <span class="feature-label">Shared pathways</span>
            <span class="feature-values">${c.shared_pathways.slice(0, 3).join(", ")}</span>
          </div>` : ""}
        <div class="source-link">
          <a href="${c.sources[0]?.url}" target="_blank">View on DrugBank →</a>
        </div>
      `;
      cEl.appendChild(card);
    });
  }

  // Trials
  const tEl = document.getElementById("trials");
  tEl.innerHTML = "";
  (data.clinical_trials || []).slice(0, 5).forEach(t => {
    const div = document.createElement("div");
    div.className = "trial-row";
    div.textContent = t.info;
    tEl.appendChild(div);
  });
  if (!data.clinical_trials?.length) tEl.innerHTML = '<p class="empty">No active trials found.</p>';

  // Interactions
  const iEl = document.getElementById("interactions");
  iEl.innerHTML = "";
  (data.interaction_warnings || []).slice(0, 5).forEach(w => {
    const div = document.createElement("div");
    div.className = "interaction-row";
    div.textContent = w;
    iEl.appendChild(div);
  });

  setVisible("report", true);
}

function setVisible(id, visible) {
  document.getElementById(id).classList.toggle("hidden", !visible);
}

document.getElementById("drugInput").addEventListener("keydown", e => {
  if (e.key === "Enter") analyze();
});