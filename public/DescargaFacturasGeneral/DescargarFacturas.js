/* =========================================================================
   descargarFacturas.js
   - Filtros por fecha (inicio/fin), por ID de factura y por USUARIO (nuevo)
   - Render tabla y resumen (conteo + total)
   - Descargar CSV de resultados filtrados
   - Toggle tema + botón regresar
   - Listo para conectar a backend Postgres (fetch() comentado)
   ========================================================================= */

let FACTURAS_ALL = [
  // DEMO: reemplaza con datos de tu API
  {
    id: "fac-001",
    proveedor: "Hotel Quetzal",
    serie: "A",
    numero: "000123",
    fecha: "2025-09-03",
    moneda: "Q",
    nitEmisor: "1234567-8",
    nitReceptor: "CF",
    total: 850.0,
    tipoGasto: "Hospedaje",
    descripcion: "Noche de hotel para inspección regional",
    comida: { desayuno: true, almuerzo: false, cena: false },
    usuario: "maria.perez"              // NUEVO (solo demo)
  },
  {
    id: "fac-002",
    proveedor: "Subway de Guatemala",
    serie: "B",
    numero: "3416801579",
    fecha: "2025-08-29",
    moneda: "Q",
    nitEmisor: "799376-5",
    nitReceptor: "CF",
    total: 130.0,
    tipoGasto: "Alimentación",
    descripcion: "Almuerzo equipo",
    comida: { desayuno: false, almuerzo: true, cena: false },
    usuario: "juan.garcia"              // NUEVO (solo demo)
  }
];

let FACTURAS_VIEW = [...FACTURAS_ALL];

const $ = (sel) => document.querySelector(sel);

function formatGTQ(value) {
  const n = Number(value || 0);
  return n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatFechaLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function comidaToText(c) {
  if (!c) return "";
  const r = [];
  if (c.desayuno) r.push("Desayuno");
  if (c.almuerzo) r.push("Almuerzo");
  if (c.cena) r.push("Cena");
  return r.join(", ");
}

/* ================= Render ================= */
function renderTabla() {
  const tbody = $("#facturasTable tbody");
  if (!tbody) return;

  if (!FACTURAS_VIEW.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align:center; padding:16px; color: var(--text-secondary);">
          No hay resultados para los filtros aplicados.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = FACTURAS_VIEW.map(f => `
      <tr>
        <td>${f.id}</td>
        <td>${f.proveedor || ""}</td>
        <td>${f.serie || ""}</td>
        <td>${f.numero || ""}</td>
        <td>${formatFechaLocal(f.fecha)}</td>
        <td>${f.moneda || ""}</td>
        <td>${f.nitEmisor || ""}</td>
        <td>${f.nitReceptor || ""}</td>
        <td>${f.moneda || ""}${formatGTQ(f.total)}</td>
        <td>${f.tipoGasto || ""}</td>
        <td>${f.descripcion || ""}</td>
        <td>${comidaToText(f.comida)}</td>
      </tr>
    `).join("");
  }

  // Resumen
  const count = FACTURAS_VIEW.length;
  const total = FACTURAS_VIEW.reduce((s, x) => s + Number(x.total || 0), 0);
  $("#countLabel").textContent = `${count} ${count === 1 ? 'resultado' : 'resultados'}`;
  $("#totalLabel").textContent = `Total: Q${formatGTQ(total)}`;
}

/* ================ Filtros ================ */
function applyFilters() {
  const from = $("#dateFrom").value;   // yyyy-mm-dd
  const to   = $("#dateTo").value;     // yyyy-mm-dd
  const qId  = $("#idSearch").value.trim().toLowerCase();
  const user = $("#userFilter") ? $("#userFilter").value : "";

  FACTURAS_VIEW = FACTURAS_ALL.filter(f => {
    // Usuario (nuevo)
    if (user && (String(f.usuario || "") !== user)) return false;

    // ID
    if (qId && !(f.id || "").toLowerCase().includes(qId)) return false;

    // Fechas (comparación ISO yyyy-mm-dd)
    if (from && f.fecha < from) return false;
    if (to && f.fecha > to) return false;

    return true;
  });

  renderTabla();
}

/* ============== Descargar CSV ============== */
function descargarCSV() {
  if (!FACTURAS_VIEW.length) return;

  const headers = [
    "ID","Proveedor","Serie","No. Factura","Fecha","Moneda",
    "NIT Emisor","NIT Receptor","Total","Tipo de Gasto","Descripción","Comida"
  ];

  const lines = FACTURAS_VIEW.map(f => {
    const row = [
      f.id || "",
      f.proveedor || "",
      f.serie || "",
      f.numero || "",
      formatFechaLocal(f.fecha),
      f.moneda || "",
      f.nitEmisor || "",
      f.nitReceptor || "",
      (f.total ?? 0),
      f.tipoGasto || "",
      (f.descripcion || "").replace(/\r?\n/g, " ").trim(),
      comidaToText(f.comida)
    ];
    return row.map(s => {
      const str = String(s ?? "");
      return /[",\n;]/.test(str) ? `"${str.replace(/"/g,'""')}"` : str;
    }).join(",");
  });

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `facturas_${($("#dateFrom").value || "inicio")}_${($("#dateTo").value || "fin")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============== Tema / Back ============== */
function setupThemeToggle() {
  const btn = $("#themeToggle");
  const moon = $("#moonIcon");
  const sun = $("#sunIcon");
  const body = document.body;

  const setIcons = () => {
    const isDark = body.classList.contains("dark-theme");
    moon.classList.toggle("hidden", !isDark);
    sun.classList.toggle("hidden", isDark);
  };
  setIcons();

  btn.addEventListener("click", () => {
    const isDark = body.classList.contains("dark-theme");
    body.classList.toggle("dark-theme", !isDark);
    body.classList.toggle("light-theme", isDark);
    setIcons();
  });
}
function setupBackBtn() {
  const btn = $("#backBtn");
  const params = new URLSearchParams(location.search);
  const returnUrl = params.get("return");
  btn.addEventListener("click", () => {
    if (returnUrl) window.location.assign(returnUrl); else history.back();
  });
}

/* ======= NUEVO: poblar el select de usuarios ======= */
function setupUserFilter() {
  const sel = $("#userFilter");
  if (!sel) return;

  // Obtiene usuarios únicos si existen en los datos
  const set = new Set(FACTURAS_ALL.map(x => x.usuario).filter(Boolean));
  // Limpia y agrega "Todos"
  sel.innerHTML = `<option value="">Todos</option>`;
  // Agrega opciones únicas
  Array.from(set).sort().forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    sel.appendChild(opt);
  });

  // Refiltra al cambiar
  sel.addEventListener("change", applyFilters);
}
/* ======= /NUEVO ======= */

/* ============== Carga desde API (Postgres) ============== */
/**
 * Deja la integración lista:
 * - GET /api/facturas?from=YYYY-MM-DD&to=YYYY-MM-DD&id=fac-123&usuario=john
 * Respuesta esperada: array de facturas con el mismo shape que FACTURAS_ALL.
 */
async function fetchFacturas(from, to, idLike, usuario) {
  // Descomenta y ajusta a tu backend cuando esté listo
  /*
  const u = new URL('/api/facturas', window.location.origin);
  if (from) u.searchParams.set('from', from);
  if (to)   u.searchParams.set('to', to);
  if (idLike) u.searchParams.set('id', idLike);
  if (usuario) u.searchParams.set('usuario', usuario);

  const res = await fetch(u.toString(), { headers: { 'Accept': 'application/json' }});
  if (!res.ok) throw new Error('Error al consultar facturas');
  const data = await res.json();

  FACTURAS_ALL = data.map(x => ({
    id: x.id,
    proveedor: x.proveedor,
    serie: x.serie,
    numero: x.numero,
    fecha: x.fecha,             // "YYYY-MM-DD"
    moneda: x.moneda || 'Q',
    nitEmisor: x.nit_emisor,
    nitReceptor: x.nit_receptor,
    total: Number(x.total),
    tipoGasto: x.tipo_gasto,
    descripcion: x.descripcion,
    comida: { desayuno: !!x.desayuno, almuerzo: !!x.almuerzo, cena: !!x.cena },
    usuario: x.usuario || ""    // NUEVO
  }));
  */
}

/* ============== Init ============== */
document.addEventListener("DOMContentLoaded", async () => {
  setupThemeToggle();
  setupBackBtn();

  // Prefill: última semana
  const today = new Date();
  const from = new Date(today); from.setDate(today.getDate() - 7);
  $("#dateFrom").value = from.toISOString().slice(0,10);
  $("#dateTo").value = today.toISOString().slice(0,10);

  // Llenar select de usuarios (nuevo)
  setupUserFilter();

  // Buscar (submit)
  $("#filtersForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = $("#dateFrom").value;
    const t = $("#dateTo").value;
    const idq = $("#idSearch").value.trim();
    const usuario = $("#userFilter").value;

    try {
      // await fetchFacturas(f, t, idq, usuario);
      applyFilters(); // con demo
    } catch (err) {
      console.error(err);
      alert("No se pudieron cargar facturas.");
    }
  });

  // Descargar CSV
  $("#downloadCsvBtn").addEventListener("click", descargarCSV);

  // Render inicial (con demo)
  applyFilters();
  renderTabla();
});
