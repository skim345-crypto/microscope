// BECOMING A MICROSCOPE: FIVE WORDS, SIXTY MARKS
// Documentation archive. p5.js 2.x + p5.svgkit.
//   data/manifest.js : list of files and their display titles (ARCHIVE)
//   data/notes.js    : text shown above the viewer (NOTES)

let rec = null;            // svgkit recorder
let img = null;            // image currently on the stage
let current = 0;           // index into ARCHIVE
let loadToken = 0;         // ignores slow loads that finished after a newer click
let p5Ready = false;
const svgText = new Map(); // src -> SVG source text
const cache = new Map();   // "src@size" -> rasterized p5.Image (keep only a few)
const CACHE_MAX = 12;
const rows = [];           // thumbnail buttons, same order as ARCHIVE
const weekOf = [];         // for each item: index of its week tab
const tabs = [];
const panels = [];
let shownNote = null;

// ---------- Show any error on the page ----------
function showError(msg) {
  const el = document.getElementById('caption-path');
  if (el) el.textContent = 'Error: ' + msg;
}
window.addEventListener('error', (e) => {
  showError(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`);
});
window.addEventListener('unhandledrejection', (e) => {
  showError(String(e.reason && e.reason.message ? e.reason.message : e.reason));
});

// ---------- Page setup (plain HTML, independent of p5) ----------
document.addEventListener('DOMContentLoaded', () => {
  if (typeof ARCHIVE === 'undefined') {
    showError('data/manifest.js did not load. Check that the data folder sits next to index.html.');
    return;
  }
  buildIndex();
  markCurrent();
  showNote(ARCHIVE[current]);
  document.addEventListener('keydown', onKey);
  if (typeof p5 === 'undefined') showError('p5.js did not load. Check the internet connection.');
});

function weekLabel(week) {
  return 'Week ' + week.replace('week', '');
}

// Left column: one tab per week; each week shows its folders as thumbnail grids
function buildIndex() {
  const root = document.getElementById('index');
  const weeks = [...new Set(ARCHIVE.map((it) => it.week))];

  const tablist = document.createElement('div');
  tablist.className = 'tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Weeks');
  root.appendChild(tablist);

  weeks.forEach((wk, wi) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tab';
    tab.id = 'tab-' + wk;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'panel-' + wk);
    tab.textContent = weekLabel(wk);
    tab.addEventListener('click', () => openWeek(wi));
    tablist.appendChild(tab);
    tabs.push(tab);

    const panel = document.createElement('div');
    panel.id = 'panel-' + wk;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.hidden = true;
    root.appendChild(panel);
    panels.push(panel);
  });

  const counts = {};
  ARCHIVE.forEach((it) => {
    const k = it.week + '|' + it.folder;
    counts[k] = (counts[k] || 0) + 1;
  });

  let grid = null, lastKey = null;
  ARCHIVE.forEach((item, i) => {
    const wi = weeks.indexOf(item.week);
    const key = item.week + '|' + item.folder;

    if (key !== lastKey) {
      const section = document.createElement('section');
      section.className = 'folder';
      const h = document.createElement('h3');
      const label = document.createElement('span');
      label.textContent = item.folder;
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = counts[key];
      h.append(label, count);
      grid = document.createElement('div');
      grid.className = 'grid';
      section.append(h, grid);
      panels[wi].appendChild(section);
      lastKey = key;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = item.title;
    btn.setAttribute('aria-label', item.title);
    btn.innerHTML = `<img src="${item.src}" alt="" loading="lazy">`;
    btn.addEventListener('click', () => showItem(i));
    grid.appendChild(btn);
    rows.push(btn);
    weekOf.push(wi);
  });
}

function openWeek(wi) {
  tabs.forEach((t, k) => {
    t.setAttribute('aria-selected', k === wi ? 'true' : 'false');
    t.tabIndex = k === wi ? 0 : -1;
  });
  panels.forEach((p, k) => { p.hidden = k !== wi; });
}

function markCurrent() {
  rows.forEach((r, k) => r.setAttribute('aria-current', k === current ? 'true' : 'false'));
  if (weekOf[current] !== undefined) openWeek(weekOf[current]);
  if (rows[current]) rows[current].scrollIntoView({ block: 'nearest' });
}

// Text above the viewer: the file's note, else its week, else default
function showNote(item) {
  if (typeof NOTES === 'undefined') return;
  const key = (item.note && NOTES[item.note]) ? item.note
            : NOTES[item.week] ? item.week
            : 'default';
  if (key === shownNote) return;
  shownNote = key;

  const note = NOTES[key];
  const box = document.getElementById('notes');
  box.innerHTML = '';
  const h = document.createElement('h2');
  h.textContent = note.title || '';
  box.appendChild(h);
  const text = document.createElement('div');
  text.className = 'text';
  (note.paragraphs || []).forEach((txt) => {
    const p = document.createElement('p');
    p.textContent = txt;
    text.appendChild(p);
  });
  box.appendChild(text);
}

// ---------- p5 ----------
async function setup() {
  const stage = document.getElementById('stage');
  createCanvas(stage.clientWidth, stage.clientHeight).parent('stage');
  noLoop();              // only redraw when something changes

  // Keep the canvas exactly the size of the white stage. The stage can change
  // size after the page loads (web font arrives, notes text changes length),
  // not only when the window is resized.
  new ResizeObserver(fitCanvasToStage).observe(stage);

  try {
    rec = svgkit.record();
  } catch (err) {
    showError('p5.svgkit could not start: ' + err.message);
    return;
  }

  p5Ready = true;
  await showItem(current);
}

async function showItem(i) {
  if (typeof ARCHIVE === 'undefined') return;
  current = Math.max(0, Math.min(ARCHIVE.length - 1, i));
  const item = ARCHIVE[current];
  markCurrent();
  showNote(item);

  if (!p5Ready) return;  // setup() will show it once p5 is ready

  setCaption(item, true);
  const token = ++loadToken;

  let loaded;
  try {
    loaded = item.src.endsWith('.svg')
      ? await loadSharpSvg(item.src)
      : await loadCached(item.src, () => loadImage(item.src));   // poster preview (jpg)
  } catch (err) {
    if (token === loadToken) showError(`could not load ${item.src} (${err && err.message ? err.message : err})`);
    return;
  }

  if (token !== loadToken) return;   // a newer click already took over
  img = loaded;
  setCaption(item, false);
  redraw();
}

function setCaption(item, loading) {
  const path = document.getElementById('caption-path');
  const count = document.getElementById('caption-count');
  const label = `${weekLabel(item.week)}, ${item.title}`;

  path.textContent = loading ? `${label} (loading)` : label;
  if (!loading && item.pdf) {
    const a = document.createElement('a');
    a.href = item.pdf;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = ' (open full-size PDF)';
    path.appendChild(a);
  }
  count.textContent = `${current + 1} of ${ARCHIVE.length}`;
}

// ---------- Sharp SVGs ----------
// Illustrator SVGs only carry a viewBox (no width/height), so the browser
// would rasterize them at a tiny default size. Here the root <svg> gets the
// exact pixel size it will be drawn at, so the vector renders crisp.
async function loadSharpSvg(src) {
  let text = svgText.get(src);
  if (!text) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(res.status + ' ' + src);
    text = await res.text();
    svgText.set(src, text);
  }

  const vb = text.match(/viewBox="\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*"/);
  if (!vb) throw new Error('no viewBox in ' + src);
  const vw = parseFloat(vb[3]);
  const vh = parseFloat(vb[4]);

  const box = displayBox(vw, vh);
  const rw = Math.max(1, Math.round(box.w * pixelDensity()));
  const rh = Math.max(1, Math.round(box.h * pixelDensity()));

  return loadCached(`${src}@${rw}x${rh}`, async () => {
    const tag = text.match(/<svg\b[^>]*>/)[0];
    const sized = tag
      .replace(/\s(width|height)="[^"]*"/g, '')
      .replace(/^<svg/, `<svg width="${rw}" height="${rh}"`);
    const url = URL.createObjectURL(new Blob([text.replace(tag, sized)], { type: 'image/svg+xml' }));
    try {
      const im = await loadImage(url);
      rec.registerSvgImage(im, text);   // keeps svgkit aware of the vector source
      im.inkBox = findInk(im);          // where the drawing actually sits
      return im;
    } finally {
      URL.revokeObjectURL(url);
    }
  });
}

// Finds the area that has ink in it (as fractions of the image), so the
// drawing itself can be centered even if it sits high on the artboard.
function findInk(im) {
  try {
    im.loadPixels();
    const px = im.pixels;
    const d = Math.round(Math.sqrt(px.length / (4 * im.width * im.height))) || 1;
    const W = im.width * d, H = im.height * d;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const k = 4 * (y * W + x);
        if (px[k + 3] > 24 && px[k] + px[k + 1] + px[k + 2] < 720) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return { x: minX / W, y: minY / H, w: (maxX - minX + 1) / W, h: (maxY - minY + 1) / H };
  } catch (err) {
    return null;   // if the browser blocks reading pixels, just center the artboard
  }
}

async function loadCached(key, loader) {
  if (cache.has(key)) {
    const hit = cache.get(key);
    cache.delete(key);
    cache.set(key, hit);   // mark as recently used
    return hit;
  }
  const im = await loader();
  cache.set(key, im);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return im;
}

// where an image of size (iw, ih) sits on the stage, with padding
function displayBox(iw, ih) {
  const pad = Math.min(width, height) * 0.08;
  const s = Math.min((width - pad * 2) / iw, (height - pad * 2) / ih);
  const w = iw * s;
  const h = ih * s;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function draw() {
  if (rec) rec.clear();  // svgkit records every draw; keep only this one
  background(255);
  if (!img) return;

  const b = displayBox(img.width, img.height);
  let dx = 0, dy = 0;
  if (img.inkBox) {
    // move the drawing so its ink, not the artboard, is centered (scale unchanged)
    dx = width / 2 - (b.x + (img.inkBox.x + img.inkBox.w / 2) * b.w);
    dy = height / 2 - (b.y + (img.inkBox.y + img.inkBox.h / 2) * b.h);
  }
  image(img, b.x + dx, b.y + dy, b.w, b.h);
}

// ---------- Events ----------
function onKey(e) {
  // on the week tabs, left/right switches weeks
  const onTab = e.target.classList && e.target.classList.contains('tab');
  if (onTab && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    const wi = tabs.indexOf(e.target);
    const next = (wi + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    openWeek(next);
    tabs[next].focus();
    return;
  }

  let next = null;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = current + 1;
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = current - 1;
  if (next === null) return;
  e.preventDefault();
  showItem(next);
  if (rows[current]) rows[current].focus({ preventScroll: true });
}

let resizeTimer = null;
function fitCanvasToStage() {
  const stage = document.getElementById('stage');
  const w = stage.clientWidth, h = stage.clientHeight;
  if (w < 1 || h < 1 || (w === width && h === height)) return;
  resizeCanvas(w, h);
  redraw();
  // re-render the current SVG at the new size once resizing settles
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (p5Ready) showItem(current); }, 250);
}

function windowResized() {
  fitCanvasToStage();
}
