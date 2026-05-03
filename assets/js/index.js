/* ============================================================
   TAITARA – index.js
   Estructura CSV: FAMILIA | PRODUCTO | DESCRIPCION | PRECIO
   Los precios vienen formateados desde el Sheet ($5.700)
   ============================================================ */

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQyXC6GwAi6XiQM782lchykl-n0AOlb9Purnflp5SX_9mJOc9JORG2A-3CBWthXMAJdUNn7J6cT3fCP/pub?output=csv";

const PROXIES = [
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

let todosLosProductos = [];
let familiaData = {};
let ordenFamilias = [];

/* ── Dark mode toggle ── */
(function () {
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  
  // Siempre arranca en light, dark es opcional
  let theme = 'light';
  root.setAttribute('data-theme', theme);

  const sunSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  const moonSVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  if (toggle) {
    toggle.innerHTML = moonSVG; // empieza mostrando luna (para ir a dark)
    toggle.setAttribute('aria-label', 'Activar modo oscuro');
    toggle.addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', theme);
      toggle.innerHTML = theme === 'dark' ? sunSVG : moonSVG;
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
    });
  }
})();

/* ── Fetch con fallback de proxies ── */
async function fetchCSV() {
  for (const proxyFn of PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(proxyFn(CSV_URL), { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes(',') && text.split('\n').length > 1) {
          console.log('✅ CSV cargado OK');
          return text;
        }
      }
    } catch (e) {
      console.warn('Proxy falló, probando siguiente…', e.message);
    }
  }
  throw new Error('No se pudo cargar el CSV con ningún proxy.');
}

/* ── Parser CSV respetando comillas ── */
function parseCSVRow(row) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

/* ── Precio: respetar formato CLP del Sheet ── */
function formatPrecio(raw) {
  if (!raw) return '';
  const s = raw.toString().trim();
  if (s.startsWith('$')) return s;
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (isNaN(n)) return s;
  return '$' + Math.round(n).toLocaleString('es-CL');
}

/* ── Cargar datos ── */
async function cargarDatos() {
  try {
    const csvData = await fetchCSV();
    const rows = csvData.split(/\r?\n/).filter(r => r.trim() !== '');

    familiaData = {};
    ordenFamilias = [];
    todosLosProductos = [];

    const header = parseCSVRow(rows[0]).map(h => h.toUpperCase().trim());
    const cFam  = header.indexOf('FAMILIA')     >= 0 ? header.indexOf('FAMILIA')     : 0;
    const cNom  = header.indexOf('PRODUCTO')    >= 0 ? header.indexOf('PRODUCTO')    : 1;
    const cDesc = header.indexOf('DESCRIPCION') >= 0 ? header.indexOf('DESCRIPCION') : 2;
    const cPre  = header.indexOf('PRECIO')      >= 0 ? header.indexOf('PRECIO')      : 3;
    const cVend = header.indexOf('CANTIDAD VENDIDA') >= 0 ? header.indexOf('CANTIDAD VENDIDA') : 4;

    rows.slice(1).forEach((row, idx) => {
      const cols = parseCSVRow(row);
      if (cols.length < 3) return;
      const familia = cols[cFam] || 'General';
      const nombre  = cols[cNom] || '';
      if (!nombre) return;

      const prod = {
        familia:         familia,
        nombre:          nombre,
        descripcion:     cols[cDesc] || '',
        precio:          formatPrecio(cols[cPre] || ''),
        cantidadVendida: parseInt(cols[cVend]) || 0,
      };

      if (!familiaData[familia]) {
        familiaData[familia] = [];
        ordenFamilias.push(familia);
      }
      familiaData[familia].push(prod);
      todosLosProductos.push(prod);
    });

    mostrarTopVendidos(todosLosProductos);
    renderizarCarta(familiaData, ordenFamilias);

  } catch (err) {
    console.error('Error al cargar datos:', err);
    document.getElementById('carrusel-top').innerHTML = '';
    document.getElementById('productos-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>No pudimos cargar la carta.<br>Verifica tu conexión e intenta de nuevo.</p>
        <button onclick="location.reload()">🔄 Reintentar</button>
      </div>`;
  }
}

/* ── Top 3 más vendidos ── */
function mostrarTopVendidos(productos) {
  const top = [...productos]
    .filter(p => p.cantidadVendida > 0)
    .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
    .slice(0, 3);
  const container = document.getElementById('carrusel-top');
  if (!top.length) {
    container.innerHTML = `
      <p style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem 0">
        Agrega una columna <strong>CANTIDAD</strong> en tu Sheet con las unidades vendidas para ver los más pedidos aquí.
      </p>`;
    return;
  }
  const medallas = ['🥇', '🥈', '🥉'];
  container.innerHTML = top.map((p, i) => `
    <div class="top-card">
      <span class="top-card-badge">${medallas[i]} Top ${i + 1}</span>
      <div class="top-card-familia">${p.familia}</div>
      <div class="top-card-nombre">${p.nombre}</div>
      ${p.descripcion ? `<div class="top-card-desc">${p.descripcion}</div>` : ''}
      <div class="top-card-precio">${p.precio}</div>
    </div>`).join('');
}

/* ── Renderizar carta ── */
function renderizarCarta(familias, orden) {
  const container = document.getElementById('productos-container');
  container.innerHTML = '';

  orden.forEach(familia => {
    const prods = familias[familia];
    const section = document.createElement('div');
    section.className = 'familia-section';
    section.dataset.familia = familia.toLowerCase();

    const titulo = document.createElement('div');
    titulo.className = 'familia-titulo';
    titulo.innerHTML = `
      <span>${familia}<span class="familia-titulo-tag">${prods.length} items</span></span>
      <span class="toggle-icon">+</span>`;

    const grid = document.createElement('div');
    grid.className = 'productos-grid';

    prods.forEach(p => {
      const card = document.createElement('div');
      card.className = 'producto-card';
      card.dataset.nombre = p.nombre.toLowerCase();
      card.dataset.desc = p.descripcion.toLowerCase();

      const esPromo = familia.toLowerCase().includes('promo');
      let descHTML = '';
      if (p.descripcion) {
        if (esPromo && p.descripcion.includes('|')) {
          const lineas = p.descripcion.split('|').map(l => l.trim()).join('\n');
          descHTML = `<div class="prod-desc promo-desc">${lineas}</div>`;
        } else {
          descHTML = `<div class="prod-desc">${p.descripcion}</div>`;
        }
      }

      card.innerHTML = `
        <div class="prod-info">
          <div class="prod-nombre">${p.nombre}</div>
          ${descHTML}
        </div>
        <div class="prod-precio">${p.precio}</div>`;
      grid.appendChild(card);
    });

    titulo.addEventListener('click', () => {
      const open = grid.classList.toggle('visible');
      titulo.classList.toggle('open', open);
    });

    section.appendChild(titulo);
    section.appendChild(grid);
    container.appendChild(section);
  });
}

/* ── Buscador ── */
function triggerSearch() {
  const q = document.getElementById('buscador').value.toLowerCase().trim();
  document.getElementById('btn-clear-search').style.display = q ? 'block' : 'none';
  let totalVisibles = 0;

  document.querySelectorAll('.familia-section').forEach(sec => {
    const cards = sec.querySelectorAll('.producto-card');
    let visibles = 0;
    cards.forEach(card => {
      const match = !q ||
        card.dataset.nombre.includes(q) ||
        card.dataset.desc.includes(q) ||
        sec.dataset.familia.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visibles++;
    });
    if (visibles > 0) {
      sec.style.display = '';
      totalVisibles += visibles;
      if (q) {
        sec.querySelector('.productos-grid').classList.add('visible');
        sec.querySelector('.familia-titulo').classList.add('open');
      }
    } else {
      sec.style.display = q ? 'none' : '';
    }
  });

  const noRes = document.getElementById('no-resultados');
  noRes.style.display = (q && totalVisibles === 0) ? 'block' : 'none';
  if (q && totalVisibles === 0)
    document.getElementById('busqueda-texto').textContent = q;
}

document.getElementById('buscador').addEventListener('input', triggerSearch);
document.getElementById('btn-clear-search').addEventListener('click', () => {
  document.getElementById('buscador').value = '';
  triggerSearch();
});

/* ── Generar PDF ── */
async function generarPDF() {
  const btn = document.getElementById('descargar-carta');
  btn.innerHTML = '⏳ Generando…';
  btn.disabled = true;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, margin = 14, contentW = W - margin * 2;
    let y = 0;

    const cNegro  = [26, 26, 26];
    const cSalmon = [232, 96, 26];
    const cGray   = [120, 120, 120];
    const cCream  = [255, 248, 243];
    const cWhite  = [255, 255, 255];

    /* Header negro + línea salmón */
    doc.setFillColor(...cNegro);
    doc.rect(0, 0, W, 44, 'F');
    doc.setFillColor(...cSalmon);
    doc.rect(0, 44, W, 3, 'F');

    /* Logo — se intenta cargar y se invierte a blanco para que se vea sobre fondo negro */
    await new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const ratio = img.width / img.height;
          const lH = 24, lW = lH * ratio;
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', (W - lW) / 2, (44 - lH) / 2, lW, lH);
        } catch (e) { logoTexto(); }
        resolve();
      };
      img.onerror = () => { logoTexto(); resolve(); };
      img.src = 'assets/img/logotaitara.png';
      function logoTexto() {
        doc.setTextColor(...cWhite); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
        doc.text('TAITARA', W / 2, 20, { align: 'center' });
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...cSalmon);
        doc.text('SUSHI & ROLLS', W / 2, 30, { align: 'center' });
      }
    });

    y = 57;
    const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...cGray);
    doc.text(`Carta actualizada: ${fecha}`, W - margin, y - 4, { align: 'right' });

    /* Usar datos ya en memoria o recargar */
    let csvFam = familiaData, csvOrd = ordenFamilias;
    if (!csvOrd.length) {
      try {
        const csvData = await fetchCSV();
        const rows = csvData.split(/\r?\n/).filter(r => r.trim() !== '');
        const hdr = parseCSVRow(rows[0]).map(h => h.toUpperCase().trim());
        const cF = hdr.indexOf('FAMILIA')     >= 0 ? hdr.indexOf('FAMILIA')     : 0;
        const cN = hdr.indexOf('PRODUCTO')    >= 0 ? hdr.indexOf('PRODUCTO')    : 1;
        const cD = hdr.indexOf('DESCRIPCION') >= 0 ? hdr.indexOf('DESCRIPCION') : 2;
        const cP = hdr.indexOf('PRECIO')      >= 0 ? hdr.indexOf('PRECIO')      : 3;
        csvFam = {}; csvOrd = [];
        rows.slice(1).forEach(row => {
          const cols = parseCSVRow(row);
          if (cols.length < 3 || !cols[cN]) return;
          const fam = cols[cF] || 'General';
          const prod = { nombre: cols[cN], descripcion: cols[cD] || '', precio: formatPrecio(cols[cP] || '') };
          if (!csvFam[fam]) { csvFam[fam] = []; csvOrd.push(fam); }
          csvFam[fam].push(prod);
        });
      } catch (e) { console.error(e); }
    }

    const pageH = H - 18;
    function checkPage(needed = 10) {
      if (y + needed > pageH) { doc.addPage(); y = 20; }
    }

    csvOrd.forEach(familia => {
      checkPage(18);
      doc.setFillColor(...cNegro);
      doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
      doc.setTextColor(...cWhite); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(familia.toUpperCase(), margin + 4, y + 6.8);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...cSalmon);
      doc.text(`${csvFam[familia].length} items`, W - margin - 2, y + 6.8, { align: 'right' });
      y += 13;
      doc.setDrawColor(...cSalmon); doc.setLineWidth(0.25);
      doc.line(margin, y - 1, W - margin, y - 1);

      csvFam[familia].forEach((prod, idx) => {
        const esPromo = familia.toLowerCase().includes('promo');
        const nL = (esPromo && prod.descripcion && prod.descripcion.includes('|'))
          ? prod.descripcion.split('|').length
          : (prod.descripcion && prod.descripcion.trim() ? 1 : 0);
        const needed = 7 + (nL > 1 ? nL * 3.8 + 2 : nL * 3.5 + 1);
        checkPage(needed);

        if (idx % 2 === 0) {
          doc.setFillColor(...cCream);
          doc.rect(margin, y - 0.5, contentW, needed + 0.5, 'F');
        }

        doc.setTextColor(...cNegro); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        const nombreStr = doc.splitTextToSize(prod.nombre, contentW - 28)[0];
        doc.text(nombreStr, margin + 2, y + 3.5);

        const xDespN = margin + 2 + doc.getTextWidth(nombreStr) + 2;
        const xAntesP = W - margin - doc.getTextWidth(prod.precio) - 2;
        const puntos = '.'.repeat(Math.max(3, Math.floor((xAntesP - xDespN) / doc.getTextWidth('.'))));
        doc.setTextColor(190, 190, 190); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(puntos, xDespN, y + 3.5);

        doc.setTextColor(...cSalmon); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
        doc.text(prod.precio, W - margin - 1, y + 3.5, { align: 'right' });
        y += 5.5;

        if (prod.descripcion && prod.descripcion.trim()) {
          doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(105, 105, 105);
          if (esPromo && prod.descripcion.includes('|')) {
            prod.descripcion.split('|').forEach(linea => {
              checkPage(4);
              const lc = linea.trim(), ci = lc.indexOf(':');
              if (ci > 0) {
                doc.setFont('helvetica', 'bold'); doc.setTextColor(...cNegro);
                doc.text(lc.slice(0, ci), margin + 4, y + 2.5);
                const aw = doc.getTextWidth(lc.slice(0, ci));
                doc.setFont('helvetica', 'italic'); doc.setTextColor(105, 105, 105);
                doc.text(lc.slice(ci), margin + 4 + aw, y + 2.5);
              } else {
                doc.text(lc, margin + 4, y + 2.5);
              }
              y += 3.8;
            });
            y += 1;
          } else {
            doc.splitTextToSize(prod.descripcion, contentW - 10).slice(0, 2).forEach(ln => {
              doc.text(ln, margin + 4, y + 2.5); y += 3.5;
            });
            y += 0.5;
          }
        } else { y += 1.5; }
      });
      y += 4;
    });

    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFillColor(...cNegro); doc.rect(0, H - 14, W, 14, 'F');
      doc.setFillColor(...cSalmon); doc.rect(0, H - 14, W, 1.5, 'F');
      doc.setTextColor(...cWhite); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text('Taitara – Sushi & Rolls', margin, H - 6);
      doc.setTextColor(170, 170, 170);
      doc.text(`Página ${i} de ${total}`, W - margin, H - 6, { align: 'right' });
    }

    doc.save('Carta_Taitara.pdf');

  } catch (err) {
    console.error('Error PDF:', err);
    alert('Error al generar el PDF. Intenta nuevamente.');
  } finally {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Carta PDF`;
    btn.disabled = false;
  }
}

document.getElementById('descargar-carta').addEventListener('click', generarPDF);

cargarDatos();