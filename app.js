// 1) Pega aquí el link CSV publicado de tu pestaña "Public"
const CSV_URL = "PEGA_AQUI_TU_CSV_PUBLICADO";

// Config: 30 atletas, 1er lugar 30 pts
const MAX_ATHLETES = 30;

const els = {
  tbody: document.getElementById("tbody"),
  top3: document.getElementById("top3"),
  search: document.getElementById("search"),
  workout: document.getElementById("workout"),
  tableTitle: document.getElementById("tableTitle"),
  lastUpdated: document.getElementById("lastUpdated")
};

let rows = [];

function pointsFromRank(rank) {
  const r = Number(rank);
  if (!Number.isFinite(r) || r < 1) return 0;
  if (r > MAX_ATHLETES) return 0;
  return (MAX_ATHLETES + 1) - r; // 1->30, 2->29 ... 30->1
}

function parseCSV(text) {
  // CSV simple (sin comillas raras). Si tus nombres traen comas, luego lo mejoramos.
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(","); // simple
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cols[i] ?? "").trim());
    return obj;
  });
}

function computeModel(r) {
  const w1Pts = pointsFromRank(r.w1_rank);
  const w2Pts = pointsFromRank(r.w2_rank);
  const w3Pts = pointsFromRank(r.w3_rank);
  const overallPts = w1Pts + w2Pts + w3Pts;

  return {
    athlete_id: r.athlete_id,
    name: r.name,
    box: r.box,
    photo_url: r.photo_url,
    w1_rank: r.w1_rank, w1_score: r.w1_score, w1Pts,
    w2_rank: r.w2_rank, w2_score: r.w2_score, w2Pts,
    w3_rank: r.w3_rank, w3_score: r.w3_score, w3Pts,
    overallPts
  };
}

function sortByView(data, view) {
  const copy = [...data];
  if (view === "w1") copy.sort((a,b) => b.w1Pts - a.w1Pts);
  else if (view === "w2") copy.sort((a,b) => b.w2Pts - a.w2Pts);
  else if (view === "w3") copy.sort((a,b) => b.w3Pts - a.w3Pts);
  else copy.sort((a,b) => b.overallPts - a.overallPts);

  // desempate suave: si empatan en puntos, ordena por nombre
  copy.sort((a,b) => {
    const pa = (view==="w1") ? a.w1Pts : (view==="w2") ? a.w2Pts : (view==="w3") ? a.w3Pts : a.overallPts;
    const pb = (view==="w1") ? b.w1Pts : (view==="w2") ? b.w2Pts : (view==="w3") ? b.w3Pts : b.overallPts;
    if (pb !== pa) return pb - pa;
    return (a.name || "").localeCompare(b.name || "");
  });

  return copy;
}

function renderTop3(sorted, view) {
  const top = sorted.slice(0, 3);
  els.top3.innerHTML = top.map((a, idx) => {
    const pts = view==="w1" ? a.w1Pts : view==="w2" ? a.w2Pts : view==="w3" ? a.w3Pts : a.overallPts;
    const subtitle = view==="w1" ? `W1: #${a.w1_rank} (${a.w1_score})`
                  : view==="w2" ? `W2: #${a.w2_rank} (${a.w2_score})`
                  : view==="w3" ? `W3: #${a.w3_rank} (${a.w3_score})`
                  : `Total: ${a.overallPts} pts`;
    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";

    return `
      <article class="card">
        <div class="rankBadge">${medal} <span class="rankNum">#${idx+1}</span></div>
        <div class="athleteRow">
          <img class="avatar" src="${safeImg(a.photo_url)}" alt="${escapeHTML(a.name)}" onerror="this.src='${fallbackAvatar()}'">
          <div>
            <div class="name">${escapeHTML(a.name)}</div>
            <div class="box">${escapeHTML(a.box || "")}</div>
          </div>
          <div style="margin-left:auto; text-align:right">
            <div style="font-weight:800">${pts} pts</div>
            <small>${escapeHTML(subtitle)}</small>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderTable(sorted, view, query) {
  const q = (query || "").toLowerCase().trim();
  const filtered = sorted.filter(a => {
    if (!q) return true;
    return (a.name || "").toLowerCase().includes(q) || (a.box || "").toLowerCase().includes(q);
  });

  els.tbody.innerHTML = filtered.map((a, idx) => {
    const pos = idx + 1;
    const pts = view==="w1" ? a.w1Pts : view==="w2" ? a.w2Pts : view==="w3" ? a.w3Pts : a.overallPts;

    const w1 = `#${a.w1_rank || "-"} · ${a.w1_score || "-"}`;
    const w2 = `#${a.w2_rank || "-"} · ${a.w2_score || "-"}`;
    const w3 = `#${a.w3_rank || "-"} · ${a.w3_score || "-"}`;

    return `
      <tr>
        <td><strong>${pos}</strong></td>
        <td>
          <div style="display:flex; gap:10px; align-items:center;">
            <img class="avatar" style="width:34px;height:34px;border-radius:12px"
              src="${safeImg(a.photo_url)}" alt="${escapeHTML(a.name)}"
              onerror="this.src='${fallbackAvatar()}'">
            <div>
              <div style="font-weight:750">${escapeHTML(a.name)}</div>
              <small>${escapeHTML(a.athlete_id ? ("ID " + a.athlete_id) : "")}</small>
            </div>
          </div>
        </td>
        <td>${escapeHTML(a.box || "")}</td>
        <td class="right"><strong>${pts}</strong></td>
        <td><small>${escapeHTML(w1)}</small></td>
        <td><small>${escapeHTML(w2)}</small></td>
        <td><small>${escapeHTML(w3)}</small></td>
      </tr>
    `;
  }).join("");
}

function escapeHTML(str=""){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[s]));
}

function fallbackAvatar() {
  // un mini SVG data-url (no dependes de archivos)
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect width="100%" height="100%" fill="#111827"/>
  <text x="50%" y="54%" text-anchor="middle" fill="#8aa0b2" font-size="18" font-family="Arial">IFL</text>
  </svg>`);
  return `data:image/svg+xml,${svg}`;
}

function safeImg(url){
  const u = (url || "").trim();
  return u ? u : fallbackAvatar();
}

async function load() {
  if (!CSV_URL || CSV_URL.includes("PEGA_AQUI")) {
    els.lastUpdated.textContent = "Falta configurar el CSV_URL en app.js";
    return;
  }

  const res = await fetch(CSV_URL, { cache: "no-store" });
  const text = await res.text();
  const raw = parseCSV(text);
  rows = raw.map(computeModel);

  els.lastUpdated.textContent = `Actualizado: ${new Date().toLocaleString()}`;
  refresh();
}

function refresh() {
  const view = els.workout.value;
  const title = view==="w1" ? "Workout 1"
              : view==="w2" ? "Workout 2"
              : view==="w3" ? "Workout 3"
              : "Overall";
  els.tableTitle.textContent = title;

  const sorted = sortByView(rows, view);
  renderTop3(sorted, view);
  renderTable(sorted, view, els.search.value);
}

els.search.addEventListener("input", refresh);
els.workout.addEventListener("change", refresh);

load();
