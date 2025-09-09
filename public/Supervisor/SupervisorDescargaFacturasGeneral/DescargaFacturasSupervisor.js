/* =========================================================================
   descargarFacturas.js
   - Filtros por fecha, ID factura, usuario, tipo gasto, comida, NIT emisor
   - Filtro por ID de ticket
   - Filtro por ID Administrador
   - NUEVO: Filtro por Entidad
   - Render tabla y resumen
   - Descargar CSV
   - Toggle tema + botón regresar
   - Habilitar 'Comida' solo si tipo = Alimentacion
   ========================================================================= */

let FACTURAS_ALL = [
  // DEMO: reemplaza con datos de tu API
  {
    entidad: "Automatix Solutions",
    idTicket: "TCK-1001",
    idAdministrador: "ADM-001",
    idUsuario: "USR-001",
    id: "fac-001",
    proveedor: "Hotel Quetzal",
    serie: "A",
    numero: "000123",
    fecha: "2025-09-03",
    moneda: "Q",
    nitEmisor: "1234567-8",
    nitReceptor: "CF",
    total: 850.0,
    tipoGasto: "Hotel",
    descripcion: "Noche de hotel para inspección regional",
    comida: { desayuno: true, almuerzo: false, cena: false },
    usuario: "maria.perez"
  },
  {
    entidad: "Automatix Solutions",
    idTicket: "TCK-1002",
    idAdministrador: "ADM-002",
    idUsuario: "USR-002",
    id: "fac-002",
    proveedor: "Subway de Guatemala",
    serie: "B",
    numero: "3416801579",
    fecha: "2025-08-29",
    moneda: "Q",
    nitEmisor: "799376-5",
    nitReceptor: "CF",
    total: 130.0,
    tipoGasto: "Alimentacion",
    descripcion: "Almuerzo equipo",
    comida: { desayuno: false, almuerzo: true, cena: false },
    usuario: "juan.garcia"
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
        <td colspan="16" style="text-align:center; padding:16px; color: var(--text-secondary);">
          No hay resultados para los filtros aplicados.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = FACTURAS_VIEW.map(f => `
      <tr>
        <td>${f.entidad || ""}</td>
        <td>${f.idTicket || ""}</td>
        <td>${f.idAdministrador || ""}</td>
        <td>${f.id || ""}</td>
        <td>${f.idUsuario || ""}</td>
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
  const qId  = $("#idSearch").value.trim().toLowerCase(); // ID Factura
  const qTicket = $("#ticketIdSearch") ? $("#ticketIdSearch").value.trim().toLowerCase() : "";
  const qAdmin  = $("#adminIdSearch") ? $("#adminIdSearch").value.trim().toLowerCase() : "";
  const qEntidad = $("#entidadSearch") ? $("#entidadSearch").value.trim().toLowerCase() : "";
  const user = $("#userFilter") ? $("#userFilter").value : "";

  const tipo = $("#tipoGastoFilter") ? $("#tipoGastoFilter").value.trim() : "";
  const comidaSel = $("#comidaFilter") ? $("#comidaFilter").value : "";
  const nitQ = $("#nitEmisorSearch") ? $("#nitEmisorSearch").value.trim().toLowerCase() : "";

  FACTURAS_VIEW = FACTURAS_ALL.filter(f => {
    // Usuario
    if (user && (String(f.usuario || "") !== user)) return false;

    // Tipo de gasto
    if (tipo) {
      const tg = String(f.tipoGasto || "");
      if (tg.toLowerCase() !== tipo.toLowerCase()) return false;
    }

    // Comida (si hay filtro seleccionado)
    if (comidaSel) {
      const c = f.comida || {};
      if (comidaSel === "desayuno" && !c.desayuno) return false;
      if (comidaSel === "almuerzo" && !c.almuerzo) return false;
      if (comidaSel === "cena" && !c.cena) return false;
    }

    // NIT Emisor (contiene)
    if (nitQ && !String(f.nitEmisor || "").toLowerCase().includes(nitQ)) return false;

    // ID Ticket (contiene)
    if (qTicket && !String(f.idTicket || "").toLowerCase().includes(qTicket)) return false;

    // ID Administrador (contiene)
    if (qAdmin && !String(f.idAdministrador || "").toLowerCase().includes(qAdmin)) return false;

    // NUEVO: Entidad (contiene)
    if (qEntidad && !String(f.entidad || "").toLowerCase().includes(qEntidad)) return false;

    // ID Factura (contiene)
    if (qId && !String(f.id || "").toLowerCase().includes(qId)) return false;

    // Rango de fechas (ISO)
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
    "Entidad","ID Ticket","ID Administrador","ID Factura","ID Usuario",
    "Proveedor","Serie","No. Factura","Fecha Emisión","Moneda",
    "NIT Emisor","NIT Receptor","Total","Tipo de Gasto","Descripción","Comida"
  ];

  const lines = FACTURAS_VIEW.map(f => {
    const row = [
      f.entidad || "",
      f.idTicket || "",
      f.idAdministrador || "",
      f.id || "",
      f.idUsuario || "",
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

/* ======= Poblar select de usuarios ======= */
function setupUserFilter() {
  const sel = $("#userFilter");
  if (!sel) return;

  const set = new Set(FACTURAS_ALL.map(x => x.usuario).filter(Boolean));
  sel.innerHTML = `<option value="">Todos</option>`;
  Array.from(set).sort().forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    sel.appendChild(opt);
  });

  sel.addEventListener("change", applyFilters);
}

/* ======= Habilitar 'Comida' solo si tipo=Alimentacion ======= */
function setupComidaToggleByTipo() {
  const tipoSel = $("#tipoGastoFilter");
  const comidaSel = $("#comidaFilter");
  if (!tipoSel || !comidaSel) return;

  const update = () => {
    const val = (tipoSel.value || "").trim().toLowerCase();
    const isAlim = (val === "alimentacion");
    comidaSel.disabled = !isAlim;
    if (!isAlim) comidaSel.value = ""; // reset si no aplica
  };

  tipoSel.addEventListener("change", update);
  update(); // inicial
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

  // Llenar select de usuarios
  setupUserFilter();

  // Habilitar/deshabilitar selector Comida según Tipo de gasto
  setupComidaToggleByTipo();

  // Buscar (submit)
  $("#filtersForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    applyFilters(); // demo local
  });

  // Descargar CSV
  $("#downloadCsvBtn").addEventListener("click", descargarCSV);

  // Render inicial (con demo)
  applyFilters();
  renderTabla();
});
