// ==============================
// Normalización de ticket
// ==============================
function normalizeTicket(raw) {
  // --- calcular estado a partir de la fecha_fin ---
  let estado = "activo";
  if (raw.fecha_fin) {
    const hoy = new Date();
    const fin = new Date(raw.fecha_fin);
    if (!isNaN(fin)) {
      if (hoy >= fin) {
        estado = "completado"; // ya vencido
      } else {
        const dias = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
        if (dias <= 7) estado = "proximo_vencer";
      }
    }
  }

  return {
    id: raw.id_ticket,
    ministerio: raw.ministerio || "-", // si no lo tienes, placeholder
    monto: parseFloat(raw.monto_presupuestado || 0),
    moneda: raw.moneda || "Q", // fija tu símbolo
    fechaCreacion: new Date(raw.creado_en), // lo que espera tu UI
    fechaVencimiento: new Date(raw.fecha_fin),
    // === NUEVO: incluir fecha de inicio desde el backend ===
    fechaInicio: new Date(raw.fecha_inicio),
    estado,
    gastado: parseFloat(raw.total_gastado || 0),
    descripcion: raw.descripcion,
    administrador: raw.creador || "-", // si no lo tienes aún
    // extras que podrías necesitar luego:
    beneficiario: raw.beneficiario,
    // fechaInicio: raw.fecha_inicio,
    // actualizadoEn: raw.actualizado_en,
  };
}

// ==============================
// Configuración de API (ajusta rutas según tu MVC)
// ==============================
const API_BASE = "http://localhost:8080"; // opcional, ej. "http://localhost:8080"
const ENDPOINTS = {
  // GET: lista de tickets del usuario autenticado
  tickets: "/viaticos/tickets/",
  // GET: descarga archivo de facturas (zip/csv/pdf). Devuelve binario.
  descargarFacturas: "/viaticos/facturas/descargar/",
  // GET: info de usuario (opcional si ya la tienes)
  me: "/perfil/userData/",
  // NUEVO (para viñeta "Llenar solicitud"):
  crearSolicitud: "/viaticos/solicitudes/crear/",
};

async function apiFetch(path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type") && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) return res.json();
  return res;
}

// ==============================
// Estado (sin DEMO)
// ==============================
let TICKETS = []; // <- se cargan desde API
let isDark = true;
let selectedFilter = "todos";
let showProfile = false;

// NUEVO: estado de búsqueda para pestaña "completados"
let completedSearchMode = "id"; // "id" | "fecha"
let completedIdQuery = ""; // int como string
let completedStartDate = ""; // YYYY-MM-DD
let completedEndDate = ""; // YYYY-MM-DD

// ==============================
// Referencias a elementos DOM
// ==============================
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const profileBtn = document.getElementById("profileBtn");
const profileDropdown = document.getElementById("profileDropdown");
const statsGrid = document.getElementById("statsGrid");
const filters = document.getElementById("filters");
const ticketsGrid = document.getElementById("ticketsGrid");
const noData = document.getElementById("noData");
const noDataSubtext = document.getElementById("noDataSubtext");
const downloadBtn = document.getElementById("downloadBtn");

// ==============================
// Utilidades
// ==============================
function getGastadoPercentage(gastado, monto) {
  const g = parseFloat(gastado || 0);
  const m = parseFloat(monto || 0);
  if (!m) return 0;
  return (g / m) * 100;
}

function getEstadoColor(estado) {
  switch (estado) {
    case "activo":
      return "status-active";
    case "proximo_vencer":
      return "status-expiring";
    case "completado":
      return "status-completed";
    default:
      return "status-active";
  }
}

function getEstadoTexto(estado) {
  switch (estado) {
    case "activo":
      return "Activo";
    case "proximo_vencer":
      return "Próximo a vencer";
    case "completado":
      return "Completado";
    default:
      return "Desconocido";
  }
}

function formatNumber(num) {
  const n = parseFloat(num || 0);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString();
}

// --- Helpers para búsqueda en "completados" ---
function matchTicketById(ticket, qInt) {
  // intenta igualdad estricta numérica; si el id es string, intenta convertir
  const idVal = ticket?.id;
  if (typeof idVal === "number") return idVal === qInt;
  const asNum = Number(idVal);
  if (!Number.isNaN(asNum)) return asNum === qInt;
  // fallback: coincidencia por inclusión de texto del número
  return String(idVal ?? "").includes(String(qInt));
}

function toYMD(dateStr) {
  if (!dateStr) return null;
  // Soporta "YYYY-MM-DD" / ISO, o "DD/MM/YYYY"
  if (dateStr.includes("-")) {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (dateStr.includes("/")) {
    const [dd, mm, yyyy] = dateStr.split("/");
    if (!dd || !mm || !yyyy) return null;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // último intento
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inDateRange(ticketDateStr, startYMD, endYMD) {
  const t = toYMD(ticketDateStr);
  if (!t) return false;
  const tN = Number(t.replaceAll("-", ""));
  const sN = startYMD ? Number(startYMD.replaceAll("-", "")) : null;
  const eN = endYMD ? Number(endYMD.replaceAll("-", "")) : null;
  if (sN && tN < sN) return false;
  if (eN && tN > eN) return false;
  return true;
}

// ==============================
// Carga de datos desde API
// ==============================
async function loadTickets() {
  // GET simple
  const data = await apiFetch("/usermain/ticketEmpleado");

  // tu backend responde con { items: [...], page, pageSize, total, totalPages }
  if (!Array.isArray(data.items)) {
    throw new Error(
      "El endpoint no devolvió un objeto con 'items' como arreglo"
    );
  }

  // normalizamos cada item
  TICKETS = data.items.map(normalizeTicket);
}

async function downloadInvoices() {
  const res = await apiFetch(ENDPOINTS.descargarFacturas, { method: "GET" });
  if (res instanceof Response) {
    const blob = await res.blob();
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "facturas.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } else {
    throw new Error("El endpoint de descarga no devolvió un archivo binario.");
  }
}

// ==============================
// Renderizado
// ==============================
function renderStats() {
  const activosCount = TICKETS.filter((t) => t.estado === "activo").length;
  const totalMonto = TICKETS.reduce((sum, t) => {
    const monto =
      new Date(t.fechaVencimiento) > new Date().getTime() ? t.monto : 0;
    return sum + parseFloat(monto);
  }, 0);
  const totalGastado = TICKETS.reduce((sum, t) => {
    return sum + parseFloat(t.gastado || 0);
  }, 0);
  const proximosVencer = TICKETS.filter(
    (t) => t.estado === "proximo_vencer"
  ).length;

  const stats = [
    {
      icon: "green",
      svg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      number: activosCount,
      label: "Tickets activos",
    },
    {
      icon: "blue",
      svg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />`,
      number: `Q${formatNumber(totalMonto)}`,
      label: "Total disponible",
    },
    {
      icon: "purple",
      svg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />`,
      number: `Q${formatNumber(totalGastado)}`,
      label: "Total gastado",
    },
    {
      icon: "yellow",
      svg: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      number: proximosVencer,
      label: "Por vencer",
    },
  ];

  statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <div class="stat-card">
            <div class="stat-content">
                <div class="stat-icon ${stat.icon}">
                    <svg class="stat-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        ${stat.svg}
                    </svg>
                </div>
                <div>
                    <p class="stat-number">${stat.number}</p>
                    <p class="stat-label">${stat.label}</p>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function renderFilters() {
  const filterOptions = [
    { key: "todos", label: "Todos", count: TICKETS.length },
    {
      key: "activos",
      label: "Activos",
      count: TICKETS.filter((t) => t.estado === "activo").length,
    },
    {
      key: "proximo_vencer",
      label: "Por vencer",
      count: TICKETS.filter((t) => t.estado === "proximo_vencer").length,
    },
    {
      key: "completados",
      label: "Completados",
      count: TICKETS.filter((t) => t.estado === "completado").length,
    },
    // NUEVO: viñeta "Llenar solicitud" sin contador
    { key: "llenar", label: "Llenar solicitud", count: "" },
  ];

  filters.innerHTML = filterOptions
    .map(
      (filter) => `
        <button class="filter-btn ${
          selectedFilter === filter.key ? "active" : ""
        }" 
                data-filter="${filter.key}">
            ${filter.label}${
        filter.count !== "" ? ` (${filter.count})` : ""
      }
        </button>
    `
    )
    .join("");

  // NUEVO: controles adicionales solo cuando está seleccionada la pestaña "completados"
  if (selectedFilter === "completados") {
    const extraControls = `
            <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
                <select id="completedSearchMode" style="padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--bg-tertiary);color:var(--text-tertiary);">
                    <option value="id" ${
                      completedSearchMode === "id" ? "selected" : ""
                    }>Buscar por ID ticket</option>
                    <option value="fecha" ${
                      completedSearchMode === "fecha" ? "selected" : ""
                    }>Buscar por fecha</option>
                </select>

                <div id="completedById" style="display:${
                  completedSearchMode === "id" ? "flex" : "none"
                };gap:8px;align-items:center;">
                    <input type="number" id="completedIdInput" placeholder="ID (entero)" value="${completedIdQuery}"
                           style="padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);width:160px;">
                    <button id="completedIdSearchBtn" class="filter-btn">Buscar</button>
                    <button id="completedIdClearBtn" class="filter-btn">Borrar</button>
                </div>

                <div id="completedByDate" style="display:${
                  completedSearchMode === "fecha" ? "flex" : "none"
                };gap:8px;align-items:center;flex-wrap:wrap;">
                    <input type="date" id="completedStartDate" value="${completedStartDate}"
                           style="padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);">
                    <span style="color:var(--text-secondary);">a</span>
                    <input type="date" id="completedEndDate" value="${completedEndDate}"
                           style="padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);">
                    <button id="completedDateSearchBtn" class="filter-btn">Buscar</button>
                    <button id="completedDateClearBtn" class="filter-btn">Borrar</button>
                </div>
            </div>
        `;
    filters.insertAdjacentHTML("beforeend", extraControls);

    // Listeners de los controles extra
    const modeSel = document.getElementById("completedSearchMode");
    const idInput = document.getElementById("completedIdInput");
    const idSearchBtn = document.getElementById("completedIdSearchBtn");
    const idClearBtn = document.getElementById("completedIdClearBtn");
    const startEl = document.getElementById("completedStartDate");
    const endEl = document.getElementById("completedEndDate");
    const dateSearchBtn = document.getElementById("completedDateSearchBtn");
    const dateClearBtn = document.getElementById("completedDateClearBtn");

    modeSel.addEventListener("change", () => {
      completedSearchMode = modeSel.value;
      // re-render para mostrar el bloque correcto
      renderFilters();
      renderTickets();
    });

    if (idInput && idSearchBtn && idClearBtn) {
      idSearchBtn.addEventListener("click", () => {
        completedIdQuery = (idInput.value || "").trim();
        renderTickets();
      });
      idClearBtn.addEventListener("click", () => {
        completedIdQuery = "";
        if (idInput) idInput.value = "";
        renderTickets();
      });
      // enter en el input
      idInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          completedIdQuery = (idInput.value || "").trim();
          renderTickets();
        }
      });
    }

    if (startEl && endEl && dateSearchBtn && dateClearBtn) {
      dateSearchBtn.addEventListener("click", () => {
        completedStartDate = startEl.value || "";
        completedEndDate = endEl.value || "";
        renderTickets();
      });
      dateClearBtn.addEventListener("click", () => {
        completedStartDate = "";
        completedEndDate = "";
        startEl.value = "";
        endEl.value = "";
        renderTickets();
      });
    }
  }

  // Listeners de los botones de filtro (siempre al final)
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    // evitar que los botones internos (buscar/borrar) reasignen selectedFilter
    const isSearchOrClear = [
      "completedIdSearchBtn",
      "completedIdClearBtn",
      "completedDateSearchBtn",
      "completedDateClearBtn",
    ].includes(btn.id);
    if (isSearchOrClear) return;

    btn.addEventListener("click", (e) => {
      const key = e.currentTarget.dataset.filter;
      if (!key) return;
      selectedFilter = key;
      renderFilters();
      renderTickets();
    });
  });
}

function renderTickets() {
  // NUEVO: si está seleccionada la viñeta "Llenar solicitud", mostramos formulario y salimos
  if (selectedFilter === "llenar") {
    ticketsGrid.style.display = "block";
    noData.style.display = "none";

    ticketsGrid.innerHTML = `
      <div class="ticket-card">
        <div class="ticket-header">
          <div>
            <h3 class="ticket-title">Nueva solicitud de viáticos</h3>
            <p class="ticket-ministry">Complete los campos y envíe</p>
          </div>
          <span class="ticket-status status-active">Formulario</span>
        </div>

        <form id="solicitudForm" class="ticket-form">
          <div class="budget-row">
            <label class="budget-label" for="destino">Destino</label>
            <input id="destino" name="destino" required
                   style="flex:1;padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);">
          </div>

          <div class="budget-row">
            <label class="budget-label" for="motivo">Motivo</label>
            <input id="motivo" name="motivo" required
                   style="flex:1;padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);">
          </div>

          <div class="budget-row">
            <label class="budget-label" for="fecha_inicio">Fecha inicio</label>
            <input type="date" id="fecha_inicio" name="fecha_inicio" required
                   style="padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);">
          </div>

          <div class="budget-row">
            <label class="budget-label" for="fecha_fin">Fecha fin</label>
            <input type="date" id="fecha_fin" name="fecha_fin" required
                   style="padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);">
          </div>

          <div class="budget-row">
            <label class="budget-label" for="moneda">Moneda</label>
            <select id="moneda" name="moneda" required
                    style="padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);">
              <option value="Q">Q</option>
              <option value="$">$</option>
            </select>
          </div>

          <div class="budget-row">
            <label class="budget-label" for="monto_estimado">Monto estimado</label>
            <input type="number" id="monto_estimado" name="monto_estimado" step="0.01" min="0" required
                   style="padding:8px;border-radius:12px;border:1px solid var(--border-secondary);background:var(--input-bg);color:var(--text-primary);">
          </div>

          <div class="ticket-actions" style="margin-top:16px;">
            <button type="submit" class="action-btn primary">Enviar solicitud</button>
            <button type="button" id="cancelSolicitudBtn" class="action-btn secondary">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    // listeners del formulario
    const form = document.getElementById("solicitudForm");
    const cancelBtn = document.getElementById("cancelSolicitudBtn");

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        selectedFilter = "todos";
        renderFilters();
        renderTickets();
      });
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          destino: form.destino.value.trim(),
          motivo: form.motivo.value.trim(),
          fecha_inicio: form.fecha_inicio.value, // YYYY-MM-DD
          fecha_fin: form.fecha_fin.value,       // YYYY-MM-DD
          moneda: form.moneda.value,
          monto_estimado: parseFloat(form.monto_estimado.value || 0),
        };
        try {
          await apiFetch(ENDPOINTS.crearSolicitud, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          alert("Solicitud enviada correctamente.");
          // opcional: recargar tickets si el backend crea uno
          try {
            await loadTickets();
          } catch {}
          selectedFilter = "todos";
          renderFilters();
          renderTickets();
        } catch (err) {
          alert("No se pudo enviar la solicitud. " + (err?.message || ""));
        }
      });
    }
    return; // importante: no sigas con el render de tickets
  }

  // Filtrar por pestaña
  let filteredTickets = TICKETS.filter((ticket) => {
    if (selectedFilter === "todos") return true;
    if (selectedFilter === "activos") return ticket.estado === "activo";
    if (selectedFilter === "proximo_vencer")
      return ticket.estado === "proximo_vencer";
    if (selectedFilter === "completados") return ticket.estado === "completado";
    return true;
  });

  // Filtros adicionales si estamos en "completados"
  if (selectedFilter === "completados") {
    if (completedSearchMode === "id" && completedIdQuery) {
      const qInt = parseInt(completedIdQuery, 10);
      if (!Number.isNaN(qInt)) {
        filteredTickets = filteredTickets.filter((t) =>
          matchTicketById(t, qInt)
        );
      } else {
        // si no es número válido, no muestra nada para evitar confusión
        filteredTickets = [];
      }
    } else if (
      completedSearchMode === "fecha" &&
      (completedStartDate || completedEndDate)
    ) {
      // === CAMBIO: usar fecha de INICIO para el rango de búsqueda en "Completados" ===
      filteredTickets = filteredTickets.filter((t) =>
        inDateRange(t.fechaInicio, completedStartDate, completedEndDate)
      );
    }
  }

  if (filteredTickets.length === 0) {
    ticketsGrid.style.display = "none";
    noData.style.display = "block";
    if (selectedFilter === "completados") {
      noDataSubtext.textContent =
        "Ajusta los criterios de búsqueda o borra los filtros.";
    } else {
      noDataSubtext.textContent =
        selectedFilter !== "todos"
          ? "Prueba cambiando el filtro"
          : "Espera a que un administrador te asigne tickets";
    }
    return;
  }

  ticketsGrid.style.display = "grid";
  noData.style.display = "none";

  ticketsGrid.innerHTML = filteredTickets
    .map((ticket) => {
      const disponible =
        parseFloat(ticket.monto || 0) - parseFloat(ticket.gastado || 0);
      const porcentaje = getGastadoPercentage(ticket.gastado, ticket.monto);
      const estadoClass = getEstadoColor(ticket.estado);
      const estadoTexto = getEstadoTexto(ticket.estado);
      const isCompleted = ticket.estado === "completado";

      return `
            <div class="ticket-card">
                <!-- Header del ticket -->
                <div class="ticket-header">
                    <div>
                        <h3 class="ticket-title">ID: ${ticket.id || "-"}</h3>
                        <p class="ticket-ministry">Administrador: ${
                          ticket.administrador || "-"
                        }</p>
                    </div>
                    <span class="ticket-status ${estadoClass}">
                        ${estadoTexto}
                    </span>
                </div>

                <!-- Descripción -->
                <p class="ticket-description">${
                  ticket.descripcion || "Descripcion: -"
                }</p>

                <!-- Información financiera -->
                <div class="ticket-budget">
                    <div class="budget-row">
                        <span class="budget-label">Presupuesto</span>
                        <span class="budget-amount budget-total">${
                          ticket.moneda || ""
                        }${formatNumber(ticket.monto)}</span>
                    </div>
                    <div class="budget-row">
                        <span class="budget-label">Gastado</span>
                        <span class="budget-amount budget-spent">${
                          ticket.moneda || ""
                        }${formatNumber(ticket.gastado)}</span>
                    </div>
                    <div class="budget-row">
                        <span class="budget-label">Disponible</span>
                        <span class="budget-amount budget-available">
                            ${ticket.moneda || ""}${formatNumber(
        disponible.toFixed(2)
      )}
                        </span>
                    </div>

                    <!-- Barra de progreso -->
                    <div class="budget-progress">
                        <div class="budget-fill" style="width: ${porcentaje}%"></div>
                    </div>
                    <p class="budget-percentage">
                        ${porcentaje.toFixed(1)}% utilizado
                    </p>
                </div>

                <!-- Fechas -->
                <div class="ticket-dates">
                    <span>Inicio: ${
                      ticket.fechaInicio?.toLocaleString("es-GT") || "-"
                    }</span>
                    <span>Creado: ${
                      ticket.fechaCreacion.toLocaleString("es-GT") || "-"
                    }</span>
                    <span>Vence: ${
                      ticket.fechaVencimiento.toLocaleString("es-GT") || "-"
                    }</span>
                </div>

                <!-- Botones de acción -->
                <div class="ticket-actions">
                    <form action="/mainfacturas/${ticket.id}">
  <button class="action-btn primary" ${isCompleted ? "disabled" : ""}>
                        Agregar Gasto
                    </button>
</form>
                    <button class="action-btn secondary">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
    })
    .join("");
}

// ==============================
// Tema y Perfil
// ==============================
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle("light-theme", !isDark);

  if (isDark) {
    themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`;
  } else {
    themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />`;
  }
}

function toggleProfile() {
  showProfile = !showProfile;
  profileDropdown.classList.toggle("show", showProfile);
}

// ==============================
// Event Listeners
// ==============================
if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
if (profileBtn) profileBtn.addEventListener("click", toggleProfile);

// Cerrar dropdown al hacer clic fuera
document.addEventListener("click", (e) => {
  if (
    profileBtn &&
    !profileBtn.contains(e.target) &&
    profileDropdown &&
    !profileDropdown.contains(e.target)
  ) {
    showProfile = false;
    profileDropdown.classList.remove("show");
  }
});

// Botón Descargar Facturas
if (downloadBtn) {
  downloadBtn.addEventListener("click", async () => {
    try {
      await downloadInvoices();
    } catch (err) {
      alert("No se pudieron descargar las facturas. " + (err?.message || ""));
    }
  });
}

// ==============================
// Inicialización
// ==============================
async function init() {
  try {
    await loadTickets(); // <- carga desde tu backend
  } catch (err) {
    console.error("Error al cargar tickets:", err);
    TICKETS = []; // aseguramos array
  }
  renderStats();
  renderFilters();
  renderTickets();
}

// Cargar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", init);
