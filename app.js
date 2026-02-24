// ==========================
// CONFIG
// ==========================
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkNVaGJvGsFXW3tlLZ8PiM3PPHltGMCVthJszUlJXCsMdM8UMTsb-V2JB2PHs6vuGNju6k_ucLDnEO/pub?gid=923538560&single=true&output=csv";

const MAX_ATHLETES = 30;

// ==========================
// ELEMENTOS
// ==========================
const els = {
  boxes: document.getElementById("boxes"),
  tbody: document.getElementById("tbody"),
  top3: document.getElementById("top3"),
  search: document.getElementById("search"),
  workout: document.getElementById("workout"),
  tableTitle: document.getElementById("tableTitle"),
  lastUpdated: document.getElementById("lastUpdated")
};

let rows = [];

// ==========================
// UTILIDADES
// ==========================
function pointsFromRank(rank) {
  const r = Number(rank);
  if (!Number.isFinite(r) || r < 1) return 0;
  if (r > MAX_ATHLETES) return 0;
  return (MAX_ATHLETES + 1) - r;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cols[i] ?? "").trim());
    return obj;
  });
}

function escapeHTML(str=""){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[s]));
}

function fallbackAvatar() {
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

// ==========================
// MODELO
// ==========================
function computeModel(r) {
  const w1Pts = pointsFromRank(r.w1_rank);
  const w2Pts = pointsFromRank(r.w2_rank);
  const w3Pts = pointsFromRank(r.w3_rank);
  const overallPts = w1Pts + w2Pts + w3Pts;

  return {
    athlete_id: r.athlete_id,
    name: r.name,
    box: r.box,
    box_logo: r.box_logo,
    photo_url: r.photo_url,
    w1_rank: r.w1_rank,
    w1_score: r.w1_score,
    w1Pts,
    w2_rank: r.w2_rank,
    w2_score: r.w2_score,
    w2Pts,
    w3_rank: r.w3_rank,
    w3_score: r.w3_score,
    w3Pts,
    overallPts
  };
}

// ==========================
// RENDER BOXES
// ==========================
function renderBoxes(data, view="overall"){
  const map = new Map();

  data.forEach(a => {
    const boxName = (a.box || "").trim();
    if (!boxName) return;

    if (!map.has(boxName)) {
      map.set(boxName, {
        name: boxName,
        logo: a.box_logo,
        totalPts: 0,
        athletes: 0
      });
    }

    const item = map.get(boxName);

    const pts =
      view === "w1" ? (Number(a.w1Pts) || 0) :
      view === "w2" ? (Number(a.w2Pts) || 0) :
      view === "w3" ? (Number(a.w3Pts) || 0) :
      (Number(a.overallPts) || 0);

    item.totalPts += pts;
    item.athletes += 1;

    if (!item.logo && a.box_logo) item.logo = a.box_logo;
  });

  const boxes = [...map.values()].sort((a,b) => {
    if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
    return a.name.localeCompare(b.name);
  });

  const label =
    view === "w1" ? "W1" : view === "w2" ? "W2" : view === "w3" ? "W3" : "Total";

  els.boxes.innerHTML = boxes.map((b, idx) => {
    const rank = idx + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏁";

    return `
      <div class="boxChip">
        <div class="boxMeta">
          <div class="boxLeft">
            <div class="boxLogoWrap">
              <img src="${safeImg(b.logo)}" alt="${escapeHTML(b.name)}"
                   onerror="this.src='${fallbackAvatar()}'">
            </div>
            <div style="min-width:0;">
              <div class="boxName">${escapeHTML(b.name)}</div>
              <div class="boxSub">${b.athletes} atletas</div>
            </div>
          </div>

          <div class="boxRight">
            <div class="boxRank">${medal} <strong>#${rank}</strong></div>
            <div class="boxPts">
              ${b.totalPts} pts
              <small>${label} del box</small>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================
// ORDENAMIENTO
// ==========================
function sortByView(data, view) {
  const copy = [...data];

  if (view === "w1") copy.sort((a,b) => b.w1Pts - a.w1Pts);
  else if (view === "w2") copy.sort((a,b) => b.w2Pts - a.w2Pts);
  else if (view === "w3") copy.sort((a,b) => b.w3Pts - a.w3Pts);
  else copy.sort((a,b) => b.overallPts - a.overallPts);

  return copy;
}

// ==========================
// RENDER TOP 3
// ==========================
function renderTop3(sorted, view) {
  const top = sorted.slice(0, 3);

  els.top3.innerHTML = top.map((a, idx) => {
    const pts = view==="w1" ? a.w1Pts :
                view==="w2" ? a.w2Pts :
                view==="w3" ? a.w3Pts :
                a.overallPts;

    const medal = idx === 0 ? "🥇" :
                  idx === 1 ? "🥈" : "🥉";

    return `
      <article class="card">
        <div class="rankBadge">${medal} #${idx+1}</div>
        <div class="athleteRow">
          <img class="avatar" src="${safeImg(a.photo_url)}"
               onerror="this.src='${fallbackAvatar()}'">
          <div>
            <div class="name">${escapeHTML(a.name)}</div>
            <div class="box">${escapeHTML(a.box)}</div>
          </div>
          <div style="margin-left:auto;font-weight:800">
            ${pts} pts
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// ==========================
// RENDER TABLA
// ==========================
function renderTable(sorted, view, query) {
  const q = (query || "").toLowerCase();

  const filtered = sorted.filter(a =>
    (a.name || "").toLowerCase().includes(q) ||
    (a.box || "").toLowerCase().includes(q)
  );

  els.tbody.innerHTML = filtered.map((a, idx) => {
    const pos = idx + 1;
    const pts = view==="w1" ? a.w1Pts :
                view==="w2" ? a.w2Pts :
                view==="w3" ? a.w3Pts :
                a.overallPts;

    return `
      <tr>
        <td><strong>${pos}</strong></td>
        <td>
          <div style="display:flex;gap:10px;align-items:center;">
            <img class="avatar"
                 src="${safeImg(a.photo_url)}"
                 onerror="this.src='${fallbackAvatar()}'">
            <div>${escapeHTML(a.name)}</div>
          </div>
        </td>
        <td>
          <div style="display:flex;gap:8px;align-items:center;">
            <img style="width:24px;height:24px;border-radius:6px"
                 src="${safeImg(a.box_logo)}"
                 onerror="this.src='${fallbackAvatar()}'">
            ${escapeHTML(a.box)}
          </div>
        </td>
        <td class="right"><strong>${pts}</strong></td>
        <td>#${a.w1_rank || "-"} · ${a.w1_score || "-"}</td>
        <td>#${a.w2_rank || "-"} · ${a.w2_score || "-"}</td>
        <td>#${a.w3_rank || "-"} · ${a.w3_score || "-"}</td>
      </tr>
    `;
  }).join("");
}

// ==========================
// CARGA
// ==========================
async function load() {
  const res = await fetch(CSV_URL, { cache: "no-store" });
  const text = await res.text();
  const raw = parseCSV(text);
  rows = raw.map(computeModel);

  renderBoxes(rows);
  refresh();

  els.lastUpdated.textContent =
    "Actualizado: " + new Date().toLocaleString();
}

function refresh() {
  const view = els.workout.value;
  els.tableTitle.textContent =
    view==="w1" ? "Workout 1" :
    view==="w2" ? "Workout 2" :
    view==="w3" ? "Workout 3" :
    "Overall";

  const sorted = sortByView(rows, view);
  renderTop3(sorted, view);
  renderTable(sorted, view, els.search.value);
}

els.search.addEventListener("input", refresh);
els.workout.addEventListener("change", refresh);

load();
