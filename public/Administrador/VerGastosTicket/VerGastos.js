/* =========================================================================
   verGastos.js
   - Render de facturas (con demo)
   - Drawer de edición (overlay + panel derecho)
   - Acciones: Editar / Eliminar
   - Descargar CSV
   - Toggle de tema día/noche (iconos)
   - Botón Regresar
   - Listo para conectar a backend (PostgreSQL) con fetch()
   ========================================================================= */

let ticketId = null;

/** Demo inicial — reemplaza con fetch() cuando tengas API */
let FACTURAS = [
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
    comida: { desayuno: true, almuerzo: false, cena: true },
  }
];

/* ====================== Utilidades ====================== */
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
function comidaToText(comida) {
  if (!comida) return "";
  const arr = [];
  if (comida.desayuno) arr.push("Desayuno");
  if (comida.almuerzo) arr.push("Almuerzo");
  if (comida.cena) arr.push("Cena");
  return arr.join(", ");
}

/* mapping select<->obj para comidas */
function comidaObjFromSelect(value) {
  return {
    desayuno: value === "Desayuno",
    almuerzo: value === "Almuerzo",
    cena: value === "Cena",
  };
}
function comidaSelectFromObj(obj) {
  if (!obj) return "";
  if (obj.desayuno) return "Desayuno";
  if (obj.almuerzo) return "Almuerzo";
  if (obj.cena) return "Cena";
  return "";
}

/* Helpers DOM */
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = (val ?? ""); }
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ""; }

/* ====================== Tabla ====================== */
function renderTabla() {
  const tbody = document.querySelector("#facturasTable tbody");
  if (!tbody) return;

  if (!FACTURAS.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align:center; padding:16px;">
          <div class="vg-empty">
            <div class="vg-empty__icon">📄</div>
            <p class="vg-empty__title">No hay facturas para este ticket</p>
            <p class="vg-empty__desc">Cuando el usuario adjunte facturas, aparecerán aquí.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const rows = FACTURAS.map(f => `
    <tr data-id="${f.id}">
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
      <td>
        <button class="action-btn" data-action="edit" data-id="${f.id}">Editar</button>
        <button class="action-btn" data-action="delete" data-id="${f.id}">Eliminar</button>
      </td>
    </tr>
  `).join("");

  tbody.innerHTML = rows;
}

/* ====================== Drawer ====================== */
let editingId = null;

function openDrawer(facturaId) {
  editingId = facturaId;
  const f = FACTURAS.find(x => x.id === facturaId);
  if (!f) return;

  // Rellenar campos
  setValue("f_proveedor", f.proveedor);
  setValue("f_fecha", f.fecha); // ISO yyyy-mm-dd
  setValue("f_serie", f.serie);
  setValue("f_numero", f.numero);
  setValue("f_moneda", f.moneda || "Q");
  setValue("f_total", f.total);
  setValue("f_nitEmisor", f.nitEmisor);
  setValue("f_nitReceptor", f.nitReceptor);
  setValue("f_tipoGasto", f.tipoGasto || "Otros");
  setValue("f_descripcion", f.descripcion);
  setValue("f_comida", comidaSelectFromObj(f.comida));

  const chip = document.getElementById("drawerChip");
  if (chip) chip.textContent = `ID: ${f.id}`;

  toggleDrawer(true);
}

function closeDrawer() {
  editingId = null;
  toggleDrawer(false);
}

function toggleDrawer(show) {
  const overlay = document.getElementById("drawerOverlay");
  const drawer = document.getElementById("drawer");
  if (!overlay || !drawer) return;

  overlay.classList.toggle("hidden", !show);
  drawer.classList.toggle("hidden", !show);

  document.body.style.overflow = show ? "hidden" : "";
}

/* Guardar cambios del drawer */
async function onEditSubmit(e) {
  e.preventDefault();
  if (!editingId) return;

  const idx = FACTURAS.findIndex(x => x.id === editingId);
  if (idx === -1) return;

  const updated = {
    ...FACTURAS[idx],
    proveedor: getVal("f_proveedor"),
    fecha: getVal("f_fecha"),
    serie: getVal("f_serie"),
    numero: getVal("f_numero"),
    moneda: getVal("f_moneda") || "Q",
    total: Number(getVal("f_total") || 0),
    nitEmisor: getVal("f_nitEmisor"),
    nitReceptor: getVal("f_nitReceptor"),
    tipoGasto: getVal("f_tipoGasto") || "Otros",
    descripcion: getVal("f_descripcion"),
    comida: comidaObjFromSelect(getVal("f_comida"))
  };

  if (!updated.proveedor?.trim()) return alert("Proveedor es requerido.");
  if (!updated.fecha) return alert("Fecha es requerida.");
  if (isNaN(updated.total) || updated.total < 0) return alert("Total inválido.");

  // TODO: fetch PUT a tu API
  /*
  const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/facturas/${encodeURIComponent(editingId)}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(updated)
  });
  if (!res.ok) { alert('Error guardando cambios'); return; }
  */

  FACTURAS[idx] = updated;
  renderTabla();
  closeDrawer();
  alert("Cambios guardados.");
}

/* ====================== Acciones tabla ====================== */
function setupRowActions() {
  const tbody = document.querySelector("#facturasTable tbody");
  if (!tbody) return;

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "delete") {
      eliminarFactura(id);
    } else if (action === "edit") {
      openDrawer(id);
    }
  });
}

async function eliminarFactura(id) {
  if (!confirm("¿Eliminar esta factura?")) return;

  // TODO: fetch DELETE a tu API
  /*
  const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/facturas/${encodeURIComponent(id)}`, { method:'DELETE' });
  if (!res.ok) { alert('No se pudo eliminar'); return; }
  */

  FACTURAS = FACTURAS.filter(f => f.id !== id);
  renderTabla();
  alert("Factura eliminada.");
}

/* ====================== CSV ====================== */
function descargarCSV() {
  if (!FACTURAS.length) return;

  const headers = [
    "Proveedor","Serie","No. Factura","Fecha","Moneda",
    "NIT Emisor","NIT Receptor","Total","Tipo de Gasto","Descripción","Comida"
  ];

  const lines = FACTURAS.map(f => {
    const row = [
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
  const sanitizedTicket = (ticketId || "ticket").replace(/[^a-z0-9_-]+/gi, "_");
  a.href = url;
  a.download = `facturas_${sanitizedTicket}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setupDownloadBtn() {
  const btn = document.getElementById("downloadCsvBtn");
  if (btn) btn.addEventListener("click", descargarCSV);
}

/* ====================== Tema ====================== */
function setupThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  const moonIcon = document.getElementById("moonIcon");
  const sunIcon = document.getElementById("sunIcon");
  const body = document.body;

  const setIcons = () => {
    const isDark = body.classList.contains("dark-theme");
    if (moonIcon) moonIcon.classList.toggle("hidden", !isDark);
    if (sunIcon) sunIcon.classList.toggle("hidden", isDark);
  };

  setIcons();

  if (toggle) {
    toggle.addEventListener("click", () => {
      const isDark = body.classList.contains("dark-theme");
      if (isDark) {
        body.classList.remove("dark-theme");
        body.classList.add("light-theme");
      } else {
        body.classList.remove("light-theme");
        body.classList.add("dark-theme");
      }
      setIcons();
    });
  }
}

/* ====================== Regresar ====================== */
function setupBackBtn() {
  const btn = document.getElementById("backBtn");
  if (!btn) return;

  const params = new URLSearchParams(location.search);
  const returnUrl = params.get("return");

  btn.addEventListener("click", () => {
    if (returnUrl) {
      window.location.assign(returnUrl);
    } else {
      history.back();
    }
  });
}

/* ====================== Carga API (placeholder) ====================== */
async function loadFacturasFromAPI(ticket) {
  // Si deseas cargar desde backend:
  /*
  const res = await fetch(`/api/tickets/${encodeURIComponent(ticket)}/facturas`);
  if (!res.ok) throw new Error("Error al cargar facturas");
  const data = await res.json();
  FACTURAS = data.map(x => ({
    id: x.id,
    proveedor: x.proveedor,
    serie: x.serie,
    numero: x.numero,
    fecha: x.fecha,            // "YYYY-MM-DD"
    moneda: x.moneda,
    nitEmisor: x.nit_emisor,
    nitReceptor: x.nit_receptor,
    total: Number(x.total),
    tipoGasto: x.tipo_gasto,
    descripcion: x.descripcion,
    comida: {
      desayuno: !!x.desayuno,
      almuerzo: !!x.almuerzo,
      cena: !!x.cena
    }
  }));
  */
}

/* ====================== Init ====================== */
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  ticketId = params.get("ticket") || "ME-2025-001";
  const label = document.getElementById("ticketIdLabel");
  if (label) label.textContent = ticketId;

  try {
    // await loadFacturasFromAPI(ticketId);
  } catch (e) {
    console.warn("Usando datos demo por ahora.", e);
  }

  renderTabla();
  setupRowActions();
  setupDownloadBtn();
  setupThemeToggle();
  setupBackBtn();

  // Drawer wiring
  const overlay = document.getElementById("drawerOverlay");
  const closeBtn = document.getElementById("drawerCloseBtn");
  const cancelBtn = document.getElementById("editCancelBtn");
  const form = document.getElementById("editForm");

  if (overlay) overlay.addEventListener("click", closeDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (cancelBtn) cancelBtn.addEventListener("click", closeDrawer);
  if (form) form.addEventListener("submit", onEditSubmit);

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
});
