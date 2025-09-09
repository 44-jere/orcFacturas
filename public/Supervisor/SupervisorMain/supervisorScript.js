/* =========================================================================
   Panel Supervisor – Automatix Solutions
   Cambios solicitados:
   - Fix cierre del modal "Usuarios asignados" (X, botón Cerrar, clic fuera, tecla Esc)
   - Agregar buscador por nombre en "Administradores" (inserción dinámica por JS)
   ========================================================================= */

/* ====================== Mock data ====================== */
const SAMPLE_ADMINS = [
  { id: "adm_001", nombre: "Ana Morales", email: "ana.morales@gobierno.gob.gt", titulo: "Admin Regional", ministerio: "ME", cui: "1234 56789 0101" },
  { id: "adm_002", nombre: "Luis Herrera", email: "luis.herrera@gobierno.gob.gt", titulo: "Admin Central", ministerio: "MS", cui: "9876 54321 0202" },
];

const SAMPLE_USERS = [
  { id: "usr_001", nombre: "Carlos López", email: "carlos.lopez@gobierno.gob.gt", titulo: "Técnico", ministerio: "MA", cui: "1111 22222 3333", adminId: "adm_001" },
  { id: "usr_002", nombre: "María González", email: "maria.gonzalez@gobierno.gob.gt", titulo: "Supervisora médica", ministerio: "MS", cui: "4444 55555 6666", adminId: "adm_002" },
  { id: "usr_003", nombre: "Juan Pérez", email: "juan.perez@gobierno.gob.gt", titulo: "Director", ministerio: "ME", cui: "7777 88888 9999" },
];

const SAMPLE_TICKETS = [
  {
    id: "ME-2025-010",
    ministerio: "ME",
    descripcion: "Capacitación TIC en Quetzaltenango",
    presupuesto: 2500.00,
    gastado: 850.00,
    fecha_creacion: "28/08/2025",
    fecha_vencimiento: "20/09/2025",
    estado: "abierto",
    adminId: "adm_001",
    userId: "usr_003"
  },
  {
    id: "MS-2025-012",
    ministerio: "MS",
    descripcion: "Supervisión de clínicas rurales",
    presupuesto: 3200.00,
    gastado: 4200.00,
    fecha_creacion: "25/08/2025",
    fecha_vencimiento: "18/09/2025",
    estado: "abierto",
    adminId: "adm_002",
    userId: "usr_002"
  }
];

const SAMPLE_HISTORY_TICKETS = [
  {
    id: "EC-2024-032",
    ministerio: "EC",
    descripcion: "Feria de empleo regional",
    presupuesto: 1800.00,
    gastado: 1750.00,
    fecha_creacion: "15/11/2024",
    fecha_vencimiento: "22/11/2024",
    estado: "cerrado",
    adminId: "adm_001",
    userId: "usr_001"
  },
  {
    id: "ME-2025-004",
    ministerio: "ME",
    descripcion: "Evaluación de centros educativos",
    presupuesto: 2000.00,
    gastado: 2300.00,
    fecha_creacion: "10/01/2025",
    fecha_vencimiento: "20/01/2025",
    estado: "cerrado",
    adminId: "adm_002",
    userId: "usr_003"
  }
];

/* ====================== Estado global ====================== */
let appState = {
  isDark: true,
  activeTab: "dashboard",
  admins: [...SAMPLE_ADMINS],
  users: [...SAMPLE_USERS],
  tickets: [...SAMPLE_TICKETS],
  history: [...SAMPLE_HISTORY_TICKETS],
  loading: false,
  creating: false,
  createForm: {
    role: "",
    nombre: "",
    email: "",
    titulo: "",
    ministerio: "",
    cui: "",
    adminAsignadoId: "",
  },
  activity: { altas: 2, edits: 1 },
  assignedModal: { adminId: null },
  reopenModal: { ticketId: null }
};

/* ====================== Utils ====================== */
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = "notification";
  const colors = {
    success: { bg: "rgba(16, 185, 129, 0.2)", border: "rgba(16, 185, 129, 0.3)", text: "#6ee7b7" },
    error:   { bg: "rgba(239, 68, 68, 0.2)", border: "rgba(239, 68, 68, 0.3)", text: "#fca5a5" },
    info:    { bg: "rgba(59, 130, 246, 0.2)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa" },
  };
  const color = colors[type] || colors.success;
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: ${color.bg}; border: 1px solid ${color.border};
    color: ${color.text}; padding: 16px 20px; border-radius: 12px;
    z-index: 1000; backdrop-filter: blur(8px); animation: slideIn 0.3s ease;
    max-width: 420px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    if (!notification.parentNode) return;
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.parentNode && notification.parentNode.removeChild(notification), 300);
  }, 5000);
}

function updateTheme() {
  document.body.className = appState.isDark ? "dark-theme" : "light-theme";
  document.getElementById("moonIcon")?.classList.toggle("hidden", !appState.isDark);
  document.getElementById("sunIcon")?.classList.toggle("hidden", appState.isDark);
}

function ministerioName(code) {
  switch (code) {
    case "ME": return "Ministerio de Educación";
    case "MS": return "Ministerio de Salud";
    case "MA": return "Ministerio de Agricultura";
    case "EC": return "Ministerio de Economía";
    default: return code;
  }
}

function iso_to_ddmmyyyy(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`;
}

/* ====================== KPI & Dashboard ====================== */
function updateKPIs() {
  document.getElementById("kpiAdmins").textContent = appState.admins.length;
  document.getElementById("kpiUsers").textContent = appState.users.length;
}

function updateMinisterioStats() {
  const el = document.getElementById("ministerioStats");
  if (!el) return;
  const all = [...appState.admins, ...appState.users];
  const total = all.length || 1;
  const codes = ["ME", "MS", "MA", "EC"];
  el.innerHTML = codes.map((c) => {
    const count = all.filter(p => p.ministerio === c).length;
    const pct = (count / total) * 100;
    return `
      <div class="ministerio-item">
        <span class="ministerio-label">${c}</span>
        <div class="ministerio-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;"></div>
          </div>
          <span class="ministerio-count">${count}</span>
        </div>
      </div>
    `;
  }).join("");
}

function updateActivity() {
  document.getElementById("statusAltas").textContent = appState.activity.altas;
  document.getElementById("statusEdits").textContent = appState.activity.edits;
}

/* ====================== Personas ====================== */
function personCard(p, type) {
  const actions = type === "admin"
    ? `
      <button class="action-btn primary" onclick="viewAssignedUsers('${p.id}')">Ver usuarios asignados</button>
      <button class="action-btn secondary" onclick="editPerson('admin','${p.id}')">Editar</button>
      <button class="action-btn danger" onclick="deletePerson('admin','${p.id}')">Eliminar</button>
    `
    : `
      <button class="action-btn secondary" onclick="editPerson('user','${p.id}')">Editar</button>
      <button class="action-btn danger" onclick="deletePerson('user','${p.id}')">Eliminar</button>
    `;

  return `
    <div class="person-card">
      <div class="person-head">
        <div>
          <h3 class="person-name">${p.nombre}</h3>
          <p class="person-role">${type === "admin" ? "Administrador" : "Usuario"} · ${p.titulo || "—"}</p>
        </div>
        <span class="person-tag">${p.ministerio}</span>
      </div>
      <p class="person-detail"><strong>Correo:</strong> ${p.email}</p>
      <p class="person-detail"><strong>CUI:</strong> ${p.cui || "—"}</p>
      <p class="person-detail"><strong>Ministerio:</strong> ${ministerioName(p.ministerio)}</p>
      ${type !== "admin" ? `<p class="person-detail"><strong>Admin asignado:</strong> ${p.adminId ? (appState.admins.find(a=>a.id===p.adminId)?.nombre || p.adminId) : "—"}</p>` : ""}
      <div class="person-actions">
        ${actions}
      </div>
    </div>
  `;
}

/* === Cambio: renderAdmins ahora soporta filtro por nombre si existe #adminsSearchInput === */
function renderAdmins() {
  const box = document.getElementById("adminsContainer");
  const empty = document.getElementById("noAdmins");
  if (!box) return;

  // Filtro por nombre (input inyectado dinámicamente)
  const q = (document.getElementById("adminsSearchInput")?.value || "").toLowerCase().trim();

  let list = [...appState.admins];
  if (q) list = list.filter(a => a.nombre.toLowerCase().includes(q));

  if (list.length === 0) {
    box.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");
  box.innerHTML = list.map(a => personCard(a, "admin")).join("");
}

function renderUsers() {
  const box = document.getElementById("usersContainer");
  const empty = document.getElementById("noUsers");
  if (!box) return;

  const code = document.getElementById("ministerioFilter")?.value || "";
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const adminFilter = document.getElementById("usersAdminFilter")?.value || "";

  let list = [...appState.users];

  if (code) list = list.filter(u => u.ministerio === code);
  if (adminFilter) {
    if (adminFilter === "__none__") list = list.filter(u => !u.adminId);
    else list = list.filter(u => u.adminId === adminFilter);
  }
  if (q) {
    list = list.filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  if (list.length === 0) {
    box.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");
  box.innerHTML = list.map(u => personCard(u, "user")).join("");
}

function renderUsersWithoutAdmin() {
  const box = document.getElementById("sinAdminUsersContainer");
  const empty = document.getElementById("noSinAdminUsers");
  if (!box) return;

  const code = document.getElementById("sinAdminMinisterioFilter")?.value || "";
  const q = (document.getElementById("sinAdminSearchInput")?.value || "").toLowerCase();

  let list = appState.users.filter(u => !u.adminId);
  if (code) list = list.filter(u => u.ministerio === code);
  if (q) list = list.filter(u =>
    u.nombre.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)
  );

  if (list.length === 0) {
    box.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");
  box.innerHTML = list.map(u => personCard(u, "user")).join("");
}

/* ====================== Modal: usuarios asignados ====================== */
function viewAssignedUsers(adminId) {
  const admin = appState.admins.find(a => a.id === adminId);
  if (!admin) return;

  appState.assignedModal.adminId = adminId;

  const modal = document.getElementById("assignedModalBackdrop");
  const titleName = document.getElementById("assignedAdminName");
  const list = document.getElementById("assignedList");
  const empty = document.getElementById("assignedEmpty");

  titleName.textContent = admin.nombre;

  const assigned = appState.users.filter(u => u.adminId === adminId);
  if (assigned.length === 0) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    list.innerHTML = assigned.map(u => personCard(u, "user")).join("");
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAssignedModal() {
  const modal = document.getElementById("assignedModalBackdrop");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  appState.assignedModal.adminId = null;
}

/* ====================== Tickets (barra = % UTILIZADO + EXCESO) ====================== */
function ticketCard(t, isHistory = false) {
  const admin = appState.admins.find(a => a.id === t.adminId);
  const user = appState.users.find(u => u.id === t.userId);

  const presupuesto = Number(t.presupuesto || 0);
  const gastado = Number(t.gastado || 0);

  const disponible = Math.max(0, presupuesto - gastado);
  const exceso = Math.max(0, gastado - presupuesto);

  const usedPct = presupuesto > 0 ? Math.min(100, (gastado / presupuesto) * 100) : 0;
  const excesoPct = presupuesto > 0 ? Math.min(100, (exceso / presupuesto) * 100) : 0;

  const statusClass = isHistory ? "status-completed" : "status-active";
  const statusText = isHistory ? "Cerrado" : "Abierto";

  return `
    <div class="ticket-card">
      <div class="ticket-header">
        <div>
          <h3 class="ticket-title">${t.id}</h3>
          <p class="ticket-ministry">${ministerioName(t.ministerio)}</p>
          <p class="ticket-assigned"><strong>Administrador:</strong> ${admin ? admin.nombre : "—"}</p>
          <p class="ticket-assigned"><strong>Usuario asignado:</strong> ${user ? `<code>${user.id}</code> — ${user.nombre}` : "—"}</p>
        </div>
        <span class="ticket-status ${statusClass}">${statusText}</span>
      </div>

      <p class="ticket-description">${t.descripcion}</p>

      <div class="ticket-budget">
        <div class="budget-row">
          <span class="budget-label">Presupuesto</span>
          <span class="budget-amount budget-total">Q${presupuesto.toFixed(2)}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">Gastado</span>
          <span class="budget-amount budget-spent">Q${gastado.toFixed(2)}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">${exceso > 0 ? "Exceso" : "Disponible"}</span>
          <span class="budget-amount ${exceso > 0 ? "savings-negative" : "budget-available"}">
            ${exceso > 0 ? `Q${exceso.toFixed(2)}` : `Q${disponible.toFixed(2)}`}
          </span>
        </div>

        <div class="available-progress" title="Porcentaje utilizado">
          <div class="available-fill" style="width:${usedPct}%;"></div>
        </div>
        <p class="budget-percentage">${usedPct.toFixed(1)}% utilizado</p>

        ${exceso > 0 ? `
          <div class="excess-progress" title="Exceso sobre el presupuesto">
            <div class="excess-fill" style="width:${excesoPct}%;"></div>
          </div>
          <p class="excess-text">Exceso: Q${exceso.toFixed(2)} (${excesoPct.toFixed(1)}%)</p>
        ` : ``}
      </div>

      <div class="ticket-dates">
        <span>Creado: ${t.fecha_creacion}</span>
        <span>Vence: ${t.fecha_vencimiento}</span>
      </div>

      <div class="ticket-actions">
        <button class="action-btn secondary" onclick="showNotification('Detalle próximamente','info')">Ver Detalles</button>
        ${isHistory
          ? `<button class="action-btn primary" onclick="openReopenModal('${t.id}')">Reabrir</button>`
          : `<button class="action-btn danger" onclick="showNotification('Cerrar ticket próximamente','info')">Cerrar</button>`
        }
      </div>
    </div>
  `;
}

function renderTickets() {
  const box = document.getElementById("ticketsContainer");
  const empty = document.getElementById("ticketsEmpty");
  if (!box) return;

  const code = document.getElementById("ticketsMinisterioFilter")?.value || "";
  const adminId = document.getElementById("ticketsAdminFilter")?.value || "";
  const q = (document.getElementById("ticketsSearchInput")?.value || "").toLowerCase();

  let list = [...appState.tickets].filter(t => (t.estado || "abierto") === "abierto");
  if (code) list = list.filter(t => t.ministerio === code);
  if (adminId) list = list.filter(t => t.adminId === adminId);
  if (q) list = list.filter(t =>
    t.id.toLowerCase().includes(q) ||
    (t.descripcion || "").toLowerCase().includes(q)
  );

  if (list.length === 0) {
    box.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");
  box.innerHTML = list.map(t => ticketCard(t, false)).join("");
}

/* ====================== Historial ====================== */
function renderHistory() {
  const box = document.getElementById("historyContainer");
  const empty = document.getElementById("historyEmpty");
  if (!box) return;

  const code = document.getElementById("historyMinisterioFilter")?.value || "";
  const adminId = document.getElementById("historyAdminFilter")?.value || "";
  const q = (document.getElementById("historySearchInput")?.value || "").toLowerCase();

  let list = [...appState.history].filter(t => (t.estado || "cerrado") === "cerrado");
  if (code) list = list.filter(t => t.ministerio === code);
  if (adminId) list = list.filter(t => t.adminId === adminId);
  if (q) list = list.filter(t =>
    t.id.toLowerCase().includes(q) ||
    (t.descripcion || "").toLowerCase().includes(q)
  );

  if (list.length === 0) {
    box.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");
  box.innerHTML = list.map(t => ticketCard(t, true)).join("");
}

/* ===== Reabrir ===== */
function openReopenModal(ticketId) {
  const t = appState.history.find(x => x.id === ticketId);
  if (!t) {
    showNotification("No se encontró el ticket a reabrir", "error");
    return;
  }
  appState.reopenModal.ticketId = ticketId;

  const label = document.getElementById("reopenTicketIdLabel");
  label.textContent = ticketId;

  const d = new Date();
  d.setDate(d.getDate() + 7);
  document.getElementById("reopenDueDate").value = d.toISOString().slice(0,10);
  document.getElementById("reopenReason").value = "";

  const backdrop = document.getElementById("reopenModalBackdrop");
  backdrop.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReopenModal() {
  document.getElementById("reopenModalBackdrop").classList.add("hidden");
  document.body.style.overflow = "";
  appState.reopenModal.ticketId = null;
}

function saveReopenModal(e) {
  e.preventDefault();
  if (!appState.reopenModal.ticketId) return;

  const dueIso = document.getElementById("reopenDueDate").value;
  const reason = (document.getElementById("reopenReason").value || "").trim();

  if (!dueIso || !reason) {
    showNotification("Ingresa la fecha y la razón de reapertura", "error");
    return;
  }
  const due = new Date(dueIso);
  const today = new Date(); today.setHours(0,0,0,0);
  if (due < today) {
    showNotification("La nueva fecha de vencimiento debe ser hoy o posterior", "error");
    return;
  }

  const idx = appState.history.findIndex(t => t.id === appState.reopenModal.ticketId);
  if (idx === -1) {
    showNotification("No se pudo reabrir el ticket", "error");
    return;
  }

  const t = { ...appState.history[idx] };
  appState.history.splice(idx, 1);

  t.estado = "abierto";
  t.fecha_vencimiento = iso_to_ddmmyyyy(dueIso);
  t.reopen = { reason, at: new Date().toISOString() };

  appState.tickets.push(t);

  closeReopenModal();
  showNotification(`Ticket ${t.id} reabierto hasta ${t.fecha_vencimiento}`, "success");
  renderHistory();
  renderTickets();
}

/* ====================== Creación ====================== */
function updateCreateButton() {
  const { role, nombre, email, ministerio } = appState.createForm;
  const btn = document.getElementById("createBtn");
  const valid = !!(role && nombre && email && ministerio);
  if (btn) btn.disabled = !valid || appState.creating;

  const text = document.getElementById("createBtnText");
  const icon = document.getElementById("createIcon");
  const loading = document.getElementById("createLoadingIcon");

  if (appState.creating) {
    text && (text.textContent = "Creando...");
    icon && icon.classList.add("hidden");
    loading && loading.classList.remove("hidden");
  } else {
    text && (text.textContent = "Crear");
    icon && icon.classList.remove("hidden");
    loading && loading.classList.add("hidden");
  }
}

function toggleAssignAdminByRole() {
  const assignGroup = document.getElementById("assignAdminGroup");
  const role = appState.createForm.role;

  if (role === "user") {
    assignGroup.style.display = "";
  } else {
    assignGroup.style.display = "none";
    appState.createForm.adminAsignadoId = "";
    const sel = document.getElementById("assignAdminSelect");
    if (sel) sel.value = "";
  }
}

function populateAdminSelects() {
  const assignSelect = document.getElementById("assignAdminSelect");
  if (assignSelect) {
    const current = assignSelect.value;
    assignSelect.innerHTML = `<option value="">(Opcional) Seleccionar administrador…</option>` +
      appState.admins.map(a => `<option value="${a.id}">${a.nombre} — ${a.ministerio}</option>`).join("");
    if (current && appState.admins.some(a=>a.id===current)) assignSelect.value = current;
  }

  const ticketsAdminFilter = document.getElementById("ticketsAdminFilter");
  if (ticketsAdminFilter) {
    const cur = ticketsAdminFilter.value;
    ticketsAdminFilter.innerHTML = `<option value="">Todos los administradores</option>` +
      appState.admins.map(a => `<option value="${a.id}">${a.nombre}</option>`).join("");
    if (cur && appState.admins.some(a=>a.id===cur)) ticketsAdminFilter.value = cur;
  }

  const historyAdminFilter = document.getElementById("historyAdminFilter");
  if (historyAdminFilter) {
    const curH = historyAdminFilter.value;
    historyAdminFilter.innerHTML = `<option value="">Todos los administradores</option>` +
      appState.admins.map(a => `<option value="${a.id}">${a.nombre}</option>`).join("");
    if (curH && appState.admins.some(a=>a.id===curH)) historyAdminFilter.value = curH;
  }

  const usersAdminFilter = document.getElementById("usersAdminFilter");
  if (usersAdminFilter) {
    const cur2 = usersAdminFilter.value;
    usersAdminFilter.innerHTML = `<option value="">Todos los administradores</option>
                                  <option value="__none__">Sin administrador</option>` +
      appState.admins.map(a => `<option value="${a.id}">${a.nombre}</option>`).join("");
    if (cur2) usersAdminFilter.value = cur2;
  }
}

async function handleCreate(e) {
  e.preventDefault();
  const { role, nombre, email, titulo, ministerio, cui, adminAsignadoId } = appState.createForm;
  if (!role || !nombre || !email || !ministerio) {
    showNotification("Completa los campos obligatorios (*)", "error");
    return;
  }

  appState.creating = true;
  updateCreateButton();

  try {
    await new Promise(r => setTimeout(r, 700));
    const id = (role === "admin" ? "adm_" : "usr_") + Math.random().toString(36).slice(2, 7);

    const base = { id, nombre, email, titulo, ministerio, cui };

    if (role === "admin") {
      appState.admins.push(base);
    } else {
      if (adminAsignadoId) base.adminId = adminAsignadoId;
      appState.users.push(base);
    }

    appState.activity.altas += 1;

    appState.createForm = { role: "", nombre: "", email: "", titulo: "", ministerio: "", cui: "", adminAsignadoId: "" };
    document.getElementById("createPersonForm")?.reset();
    toggleAssignAdminByRole();

    updateKPIs();
    updateMinisterioStats();
    updateActivity();
    renderAdmins();
    renderUsers();
    renderUsersWithoutAdmin();
    renderTickets();
    renderHistory();
    populateAdminSelects();

    showNotification("Creado correctamente", "success");
  } catch (err) {
    console.error(err);
    showNotification("Error al crear el registro", "error");
  } finally {
    appState.creating = false;
    updateCreateButton();
  }
}

/* ====================== CSV ====================== */
function pickCsv() { document.getElementById("csvInput")?.click(); }

function parseCsvText(text) {
  const rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
  if (rows.length === 0) return [];

  const header = rows[0].split(",").map(h => h.trim().toLowerCase());
  const ix = (name) => header.indexOf(name);

  const iRole = ix("role"), iNombre = ix("nombre"), iEmail = ix("email"), iTitulo = ix("titulo"),
        iMinisterio = ix("ministerio"), iCui = ix("cui");

  const data = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r].split(",").map(c => c.trim());
    if (!cols.length) continue;
    data.push({
      role: iRole >= 0 ? (cols[iRole] || "user").toLowerCase() : "user",
      nombre: iNombre >= 0 ? cols[iNombre] : "",
      email: iEmail >= 0 ? cols[iEmail] : "",
      titulo: iTitulo >= 0 ? cols[iTitulo] : "",
      ministerio: iMinisterio >= 0 ? cols[iMinisterio] : "",
      cui: iCui >= 0 ? cols[iCui] : "",
    });
  }
  return data;
}

function validMinisterio(v) { return ["ME","MS","MA","EC"].includes(v); }

function handleCsvFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        showNotification("CSV vacío o inválido", "error");
        return;
      }
      let ok = 0, err = 0;
      rows.forEach((r) => {
        const role = (r.role === "admin" ? "admin" : "user");
        if (!r.nombre || !r.email || !r.ministerio || !validMinisterio(r.ministerio)) { err++; return; }
        const id = (role === "admin" ? "adm_" : "usr_") + Math.random().toString(36).slice(2, 7);
        const nuevo = { id, nombre: r.nombre, email: r.email, titulo: r.titulo || "", ministerio: r.ministerio, cui: r.cui || "" };

        if (role === "admin") {
          appState.admins.push(nuevo);
        } else {
          const adminSameMin = appState.admins.find(a => a.ministerio === r.ministerio);
          if (adminSameMin) nuevo.adminId = adminSameMin.id;
          appState.users.push(nuevo);
        }
        ok++;
      });

      if (ok > 0) {
        appState.activity.altas += ok;
        updateKPIs(); updateMinisterioStats(); updateActivity();
        renderAdmins(); renderUsers(); renderUsersWithoutAdmin(); renderTickets(); renderHistory();
        populateAdminSelects();
      }

      showNotification(`CSV procesado: ${ok} creados, ${err} con errores.`, ok ? "success" : "error");
    } catch (e) {
      console.error(e);
      showNotification("Error leyendo CSV", "error");
    }
  };
  reader.onerror = () => showNotification("No se pudo leer el archivo", "error");
  reader.readAsText(file);
}

function downloadCsvTemplate() {
  const header = "role,nombre,email,titulo,ministerio,cui\n";
  const example1 = "admin,Ana Morales,ana.morales@gobierno.gob.gt,Admin Regional,ME,1234 56789 0101\n";
  const example2 = "user,Carlos López,carlos.lopez@gobierno.gob.gt,Técnico,MA,7777 88888 9999\n";
  const blob = new Blob([header, example1, example2], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_usuarios_admins.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification("Plantilla CSV descargada", "success");
}

/* ====================== Tabs ====================== */
function switchTab(tabName) {
  appState.activeTab = tabName;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-content").forEach(c => {
    c.classList.toggle("active", c.id === `${tabName}-tab`);
  });

  if (tabName === "dashboard") {
    updateKPIs(); updateMinisterioStats(); updateActivity();
  } else if (tabName === "administradores") {
    renderAdmins();
  } else if (tabName === "usuarios") {
    renderUsers();
  } else if (tabName === "tickets") {
    renderTickets();
  } else if (tabName === "sinadmin") {
    renderUsersWithoutAdmin();
  } else if (tabName === "historial") {
    renderHistory();
  }
}

/* ====================== Init ====================== */
document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Tema
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    appState.isDark = !appState.isDark;
    updateTheme();
  });

  // Perfil dropdown
  const profileToggle = document.getElementById("profileToggle");
  const profileDropdown = document.getElementById("profileDropdown");
  if (profileToggle && profileDropdown) {
    profileToggle.addEventListener("click", () => {
      profileDropdown.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!profileDropdown.contains(e.target) && !profileToggle.contains(e.target)) {
        profileDropdown.classList.add("hidden");
      }
    });
  }

  // Filtros usuarios
  document.getElementById("ministerioFilter")?.addEventListener("change", renderUsers);
  document.getElementById("usersAdminFilter")?.addEventListener("change", renderUsers);
  document.getElementById("searchInput")?.addEventListener("input", renderUsers);

  // Filtros usuarios sin admin
  document.getElementById("sinAdminMinisterioFilter")?.addEventListener("change", renderUsersWithoutAdmin);
  document.getElementById("sinAdminSearchInput")?.addEventListener("input", renderUsersWithoutAdmin);

  // Filtros tickets activos
  document.getElementById("ticketsMinisterioFilter")?.addEventListener("change", renderTickets);
  document.getElementById("ticketsAdminFilter")?.addEventListener("change", renderTickets);
  document.getElementById("ticketsSearchInput")?.addEventListener("input", renderTickets);

  // Filtros historial
  document.getElementById("historyMinisterioFilter")?.addEventListener("change", renderHistory);
  document.getElementById("historyAdminFilter")?.addEventListener("change", renderHistory);
  document.getElementById("historySearchInput")?.addEventListener("input", renderHistory);

  // === Cambio: insertar dinámicamente buscador en "Administradores" ===
  const adminsTab = document.getElementById("administradores-tab");
  if (adminsTab && !document.getElementById("adminsSearchInput")) {
    const row = document.createElement("div");
    row.className = "filters-row";
    const input = document.createElement("input");
    input.id = "adminsSearchInput";
    input.className = "filter-input";
    input.type = "search";
    input.placeholder = "Buscar administrador por nombre";
    input.addEventListener("input", renderAdmins);
    row.appendChild(input);
    adminsTab.insertBefore(row, adminsTab.firstElementChild?.nextSibling || adminsTab.firstChild);
  }

  // Modal asignados (Usuarios asignados) — Fix cierre
  const assignedBackdrop = document.getElementById("assignedModalBackdrop");
  const assignedCloseBtn = document.getElementById("assignedCloseBtn");
  const assignedCancelBtn = document.getElementById("assignedCancelBtn");
  const assignedModalBox = assignedBackdrop?.querySelector(".modal");

  assignedCloseBtn?.addEventListener("click", (e) => { e.preventDefault(); closeAssignedModal(); });
  assignedCancelBtn?.addEventListener("click", (e) => { e.preventDefault(); closeAssignedModal(); });

  // Clic fuera del modal cierra (solo si el target es el backdrop)
  assignedBackdrop?.addEventListener("click", (e) => {
    if (e.target === assignedBackdrop) closeAssignedModal();
  });

  // Evitar que clics dentro del cuadro propaguen al backdrop
  assignedModalBox?.addEventListener("click", (e) => e.stopPropagation());

  // Tecla Esc cierra
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !assignedBackdrop.classList.contains("hidden")) {
      closeAssignedModal();
    }
  });

  // Modal reabrir
  const reopenForm = document.getElementById("reopenForm");
  reopenForm?.addEventListener("submit", saveReopenModal);
  document.getElementById("reopenCloseBtn")?.addEventListener("click", closeReopenModal);
  document.getElementById("reopenCancelBtn")?.addEventListener("click", closeReopenModal);
  const reopenBackdrop = document.getElementById("reopenModalBackdrop");
  reopenBackdrop?.addEventListener("click", (e) => { if (e.target === reopenBackdrop) closeReopenModal(); });

  // Inicial
  updateTheme();
  updateKPIs();
  updateMinisterioStats();
  updateActivity();
  populateAdminSelects();
  renderAdmins();
  renderUsers();
  renderUsersWithoutAdmin();
  renderTickets();
  renderHistory();
});

/* Exponer funciones usadas en HTML dinámico */
window.viewAssignedUsers = viewAssignedUsers;
window.deletePerson = (type,id)=>showNotification(`Eliminar ${type} ${id} próximamente`,"info");
window.editPerson = () => showNotification("Edición rápida próximamente","info");
window.switchTab = switchTab;
window.openReopenModal = openReopenModal;
