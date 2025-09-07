/* =========================================================================
   Panel Administrador – Automatix Solutions
   Archivo: admin-script.js (CON MENÚ LATERAL)
   - Pestañas funcionando con data-tab
   - Toggle de tema, perfil y logout
   - Formulario de creación con validaciones
   - Dashboard, Gestión e Historial actualizables
   - NUEVO: Menú lateral hamburguesa
   ========================================================================= */

/* ====================== Datos de ejemplo (mock) ====================== */
// REEMPLAZAR por llamadas a tu API cuando estén listas
const SAMPLE_USERS = [
  {
    id: "user_001",
    nombre: "Juan Pérez",
    email: "juan.perez@gobierno.gob.gt",
    cargo: "Director Regional",
    ministerios_asignados: [{ id: "min_001", nombre: "Ministerio de Educación", codigo: "ME" }],
  },
  {
    id: "user_002",
    nombre: "María González",
    email: "maria.gonzalez@gobierno.gob.gt",
    cargo: "Supervisora Médica",
    ministerios_asignados: [{ id: "min_002", nombre: "Ministerio de Salud", codigo: "MS" }],
  },
  {
    id: "user_003",
    nombre: "Carlos López",
    email: "carlos.lopez@gobierno.gob.gt",
    cargo: "Técnico Agrícola",
    ministerios_asignados: [{ id: "min_003", nombre: "Ministerio de Agricultura", codigo: "MA" }],
  },
  {
    id: "user_004",
    nombre: "Ana Rodríguez",
    email: "ana.rodriguez@gobierno.gob.gt",
    cargo: "Analista Económico",
    ministerios_asignados: [
      { id: "min_004", nombre: "Ministerio de Economía", codigo: "EC" },
      { id: "min_001", nombre: "Ministerio de Educación", codigo: "ME" },
    ],
  },
];

const SAMPLE_ADMIN_TICKETS = [
  {
    id: "ME-2025-001",
    usuario_asignado: "Juan Pérez",
    ministerio: "Ministerio de Educación",
    descripcion: "Capacitación docente en Quetzaltenango",
    presupuesto: "2500.00",
    gastado: "850.00",
    fecha_creacion: "28/08/2025",
    fecha_vencimiento: "15/09/2025",
    estado: "activo",
  },
  {
    id: "MS-2025-002",
    usuario_asignado: "María González",
    ministerio: "Ministerio de Salud",
    descripcion: "Supervisión hospitales regionales",
    presupuesto: "3200.00",
    gastado: "1200.00",
    fecha_creacion: "25/08/2025",
    fecha_vencimiento: "10/09/2025",
    estado: "activo",
  },
];

const SAMPLE_HISTORICAL_TICKETS = [
  {
    id: "ME-2024-015",
    usuario_asignado: "Juan Pérez",
    ministerio: "Ministerio de Educación",
    descripcion: "Evaluación centros educativos zona 1",
    presupuesto: "1800.00",
    gastado: "1800.00",
    fecha_creacion: "15/12/2024",
    fecha_vencimiento: "31/12/2024",
    fecha_completado: "28/12/2024",
    estado: "completado",
  },
  {
    id: "MS-2024-028",
    usuario_asignado: "María González",
    ministerio: "Ministerio de Salud",
    descripcion: "Inspección clínicas rurales",
    presupuesto: "2200.00",
    gastado: "2150.00",
    fecha_creacion: "10/11/2024",
    fecha_vencimiento: "30/11/2024",
    fecha_completado: "25/11/2024",
    estado: "completado",
  },
];

/* ====================== Estado global ====================== */
let appState = {
  isDark: true,
  showProfile: false,
  showSidebar: false,  // NUEVO: Estado del sidebar
  activeTab: "dashboard",
  users: [...SAMPLE_USERS],
  tickets: [...SAMPLE_ADMIN_TICKETS],
  historicalTickets: [...SAMPLE_HISTORICAL_TICKETS],
  loading: false,
  creating: false,
  ticketForm: {
    usuario_id: "",
    ministerio_id: "",
    descripcion: "",
    presupuesto: "",
    fecha_vencimiento: "",
    moneda: "Q",
  },
};

/* ====================== Utilidades ====================== */
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = "notification";

  const colors = {
    success: { bg: "rgba(16, 185, 129, 0.2)", border: "rgba(16, 185, 129, 0.3)", text: "#6ee7b7" },
    error: { bg: "rgba(239, 68, 68, 0.2)", border: "rgba(239, 68, 68, 0.3)", text: "#fca5a5" },
    info: { bg: "rgba(59, 130, 246, 0.2)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa" },
  };

  const color = colors[type] || colors.success;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${color.bg};
    border: 1px solid ${color.border};
    color: ${color.text};
    padding: 16px 20px;
    border-radius: 12px;
    z-index: 1000;
    backdrop-filter: blur(8px);
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}

function formatCurrency(amount) {
  return parseFloat(amount || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function generateTicketId(ministerioCode) {
  const ticketCount = appState.tickets.filter((t) => t.id.startsWith(ministerioCode)).length + 1;
  return `${ministerioCode}-2025-${String(ticketCount).padStart(3, "0")}`;
}

/* ====================== Tema ====================== */
function updateTheme() {
  const body = document.body;
  const moonIcon = document.getElementById("moonIcon");
  const sunIcon = document.getElementById("sunIcon");

  if (appState.isDark) {
    body.className = "dark-theme";
    if (moonIcon) moonIcon.classList.remove("hidden");
    if (sunIcon) sunIcon.classList.add("hidden");
  } else {
    body.className = "light-theme";
    if (moonIcon) moonIcon.classList.add("hidden");
    if (sunIcon) sunIcon.classList.remove("hidden");
  }
}

/* ====================== SIDEBAR FUNCTIONS ====================== */
function openSidebar() {
  appState.showSidebar = true;
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  
  if (sidebar) sidebar.classList.remove("hidden");
  if (overlay) overlay.classList.remove("hidden");
  
  // Evitar scroll del fondo
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  appState.showSidebar = false;
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  
  if (sidebar) {
    sidebar.classList.add("closing");
    setTimeout(() => {
      sidebar.classList.add("hidden");
      sidebar.classList.remove("closing");
    }, 300);
  }
  
  if (overlay) overlay.classList.add("hidden");
  
  // Restaurar scroll del fondo
  document.body.style.overflow = "";
}

function updateSidebarBadges() {
  const sidebarTicketCount = document.getElementById("sidebarTicketCount");
  const sidebarHistorialCount = document.getElementById("sidebarHistorialCount");
  
  if (sidebarTicketCount) sidebarTicketCount.textContent = appState.tickets.length;
  if (sidebarHistorialCount) sidebarHistorialCount.textContent = appState.historicalTickets.length;
}

function updateSidebarActiveState() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  navItems.forEach(item => {
    if (item.dataset.tab === appState.activeTab) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/* ====================== Stats y Dashboard ====================== */
function updateStats() {
  const totalTickets = document.getElementById("totalTickets");
  const activeTickets = document.getElementById("activeTickets");
  const totalUsers = document.getElementById("totalUsers");
  const totalBudget = document.getElementById("totalBudget");
  const ticketCount = document.getElementById("ticketCount");
  const historialCount = document.getElementById("historialCount");

  if (appState.loading) {
    if (totalTickets) totalTickets.textContent = "...";
    if (activeTickets) activeTickets.textContent = "...";
    if (totalUsers) totalUsers.textContent = "...";
    if (totalBudget) totalBudget.textContent = "...";
  } else {
    const activeCount = appState.tickets.filter((t) => t.estado === "activo").length;
    const budget = appState.tickets.reduce((sum, t) => sum + parseFloat(t.presupuesto), 0);

    if (totalTickets) totalTickets.textContent = appState.tickets.length;
    if (activeTickets) activeTickets.textContent = activeCount;
    if (totalUsers) totalUsers.textContent = appState.users.length;
    if (totalBudget) totalBudget.textContent = `Q${formatCurrency(budget)}`;
    if (ticketCount) ticketCount.textContent = appState.tickets.length;
    if (historialCount) historialCount.textContent = appState.historicalTickets.length;
  }
  
  // Actualizar badges del sidebar
  updateSidebarBadges();
}

function generateDashboardStats() {
  const totalTicketsCreated = appState.tickets.length + appState.historicalTickets.length;
  const totalBudgetAssigned = appState.tickets.reduce((sum, t) => sum + parseFloat(t.presupuesto), 0);
  const totalSpentAmount = [...appState.tickets, ...appState.historicalTickets].reduce(
    (sum, t) => sum + parseFloat(t.gastado),
    0
  );
  const avgTicketBudget = totalBudgetAssigned / (appState.tickets.length || 1);

  return {
    totalTicketsCreated,
    totalBudgetAssigned,
    totalSpentAmount,
    avgTicketBudget,
    activeTickets: appState.tickets.filter((t) => t.estado === "activo").length,
    completedTickets: appState.historicalTickets.length,
  };
}

function updateMinisterioStats() {
  const ministerioStats = document.getElementById("ministerioStats");
  if (!ministerioStats) return;

  const ministerios = ["ME", "MS", "MA", "EC"];
  const total = [...appState.tickets, ...appState.historicalTickets].length;

  ministerioStats.innerHTML = ministerios
    .map((codigo) => {
      const count = [...appState.tickets, ...appState.historicalTickets].filter((t) =>
        t.id.startsWith(codigo)
      ).length;
      const percentage = total > 0 ? (count / total) * 100 : 0;

      return `
        <div class="ministerio-item">
          <span class="ministerio-label">${codigo}</span>
          <div class="ministerio-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
            <span class="ministerio-count">${count}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function updateDashboard() {
  const stats = generateDashboardStats();

  const dashTotalTickets = document.getElementById("dashTotalTickets");
  const dashTotalSpent = document.getElementById("dashTotalSpent");
  const dashAvgTicket = document.getElementById("dashAvgTicket");
  const statusActive = document.getElementById("statusActive");
  const statusCompleted = document.getElementById("statusCompleted");

  if (dashTotalTickets) dashTotalTickets.textContent = stats.totalTicketsCreated;
  if (dashTotalSpent) dashTotalSpent.textContent = `Q${formatCurrency(stats.totalSpentAmount)}`;
  if (dashAvgTicket) dashAvgTicket.textContent = `Q${formatCurrency(stats.avgTicketBudget)}`;
  if (statusActive) statusActive.textContent = stats.activeTickets;
  if (statusCompleted) statusCompleted.textContent = stats.completedTickets;

  updateMinisterioStats();
}

/* ====================== Crear Ticket (form) ====================== */
function updateUserForm() {
  const usuarioSelect = document.getElementById("usuarioSelect");
  if (!usuarioSelect) return;

  usuarioSelect.innerHTML = '<option value="">Seleccionar usuario...</option>';

  appState.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.nombre} - ${user.cargo}`;
    usuarioSelect.appendChild(option);
  });
}

function hideMinisterioInfo() {
  const ministerioInfo = document.getElementById("ministerioInfo");
  if (ministerioInfo) ministerioInfo.classList.add("hidden");
}

function handleUserSelect(userId) {
  const user = appState.users.find((u) => u.id === userId);
  const userInfo = document.getElementById("userInfo");
  const userEmail = document.getElementById("userEmail");
  const userCargo = document.getElementById("userCargo");
  const userMinisterios = document.getElementById("userMinisterios");
  const ministerioSelect = document.getElementById("ministerioSelect");

  appState.ticketForm.usuario_id = userId;
  appState.ticketForm.ministerio_id = "";

  if (user && userInfo) {
    userInfo.classList.remove("hidden");
    if (userEmail) userEmail.textContent = user.email;
    if (userCargo) userCargo.textContent = user.cargo;
    if (userMinisterios) userMinisterios.textContent = user.ministerios_asignados.length;

    if (ministerioSelect) {
      ministerioSelect.disabled = false;
      ministerioSelect.innerHTML = '<option value="">Seleccionar ministerio...</option>';

      user.ministerios_asignados.forEach((ministerio) => {
        const option = document.createElement("option");
        option.value = ministerio.id;
        option.textContent = `${ministerio.nombre} (${ministerio.codigo})`;
        ministerioSelect.appendChild(option);
      });
    }
  } else if (userInfo) {
    userInfo.classList.add("hidden");
    if (ministerioSelect) {
      ministerioSelect.disabled = true;
      ministerioSelect.innerHTML = '<option value="">Primero selecciona un usuario</option>';
    }
  }

  hideMinisterioInfo();
}

function handleMinisterioSelect(ministerioId) {
  const user = appState.users.find((u) => u.id === appState.ticketForm.usuario_id);
  const ministerio = user?.ministerios_asignados.find((m) => m.id === ministerioId);
  const ministerioInfo = document.getElementById("ministerioInfo");
  const generatedId = document.getElementById("generatedId");

  appState.ticketForm.ministerio_id = ministerioId;

  if (ministerio && ministerioInfo) {
    ministerioInfo.classList.remove("hidden");
    if (generatedId) generatedId.textContent = generateTicketId(ministerio.codigo);
  } else if (ministerioInfo) {
    ministerioInfo.classList.add("hidden");
  }
}

function updateCreateButton() {
  const createBtn = document.getElementById("createTicketBtn");
  const createBtnText = document.getElementById("createBtnText");
  const createIcon = document.getElementById("createIcon");
  const createLoadingIcon = document.getElementById("createLoadingIcon");

  if (!createBtn) return;

  const isValid =
    appState.ticketForm.usuario_id &&
    appState.ticketForm.ministerio_id &&
    appState.ticketForm.descripcion &&
    appState.ticketForm.presupuesto &&
    appState.ticketForm.fecha_vencimiento;

  createBtn.disabled = !isValid || appState.creating;

  if (appState.creating) {
    if (createBtnText) createBtnText.textContent = "Creando...";
    if (createIcon) createIcon.classList.add("hidden");
    if (createLoadingIcon) createLoadingIcon.classList.remove("hidden");
  } else {
    if (createBtnText) createBtnText.textContent = "Crear Ticket";
    if (createIcon) createIcon.classList.remove("hidden");
    if (createLoadingIcon) createLoadingIcon.classList.add("hidden");
  }
}

async function createTicket() {
  if (
    !appState.ticketForm.usuario_id ||
    !appState.ticketForm.ministerio_id ||
    !appState.ticketForm.descripcion ||
    !appState.ticketForm.presupuesto ||
    !appState.ticketForm.fecha_vencimiento
  ) {
    showNotification("Por favor completa todos los campos requeridos", "error");
    return;
  }

  appState.creating = true;
  updateCreateButton();

  try {
    const selectedUser = appState.users.find((u) => u.id === appState.ticketForm.usuario_id);
    const selectedMinisterio = selectedUser?.ministerios_asignados.find(
      (m) => m.id === appState.ticketForm.ministerio_id
    );

    if (!selectedUser || !selectedMinisterio) throw new Error("Usuario o ministerio no encontrado");

    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const newTicketId = generateTicketId(selectedMinisterio.codigo);

    const newTicket = {
      id: newTicketId,
      usuario_asignado: selectedUser.nombre,
      ministerio: selectedMinisterio.nombre,
      descripcion: appState.ticketForm.descripcion,
      presupuesto: appState.ticketForm.presupuesto,
      gastado: "0.00",
      fecha_creacion: new Date().toLocaleDateString("es-GT"),
      fecha_vencimiento: appState.ticketForm.fecha_vencimiento,
      estado: "activo",
    };

    appState.tickets.push(newTicket);

    clearTicketForm();
    updateStats();
    updateDashboard();
    updateTicketsTab();

    showNotification(`Ticket ${newTicketId} creado exitosamente para ${selectedMinisterio.nombre}!`, "success");
  } catch (err) {
    console.error("Error creando ticket:", err);
    showNotification("Error al crear el ticket. Intenta nuevamente.", "error");
  } finally {
    appState.creating = false;
    updateCreateButton();
  }
}

function clearTicketForm() {
  appState.ticketForm = {
    usuario_id: "",
    ministerio_id: "",
    descripcion: "",
    presupuesto: "",
    fecha_vencimiento: "",
    moneda: "Q",
  };

  const form = document.getElementById("ticketForm");
  if (form) form.reset();

  const usuarioSelect = document.getElementById("usuarioSelect");
  const ministerioSelect = document.getElementById("ministerioSelect");
  const monedaSelect = document.getElementById("monedaSelect");

  if (usuarioSelect) usuarioSelect.value = "";
  if (ministerioSelect) {
    ministerioSelect.value = "";
    ministerioSelect.disabled = true;
    ministerioSelect.innerHTML = '<option value="">Primero selecciona un usuario</option>';
  }
  if (monedaSelect) monedaSelect.value = "Q";

  hideMinisterioInfo();
  const userInfo = document.getElementById("userInfo");
  if (userInfo) userInfo.classList.add("hidden");
}

/* ====================== Gestión de Tickets ====================== */
function createTicketCard(ticket) {
  const presupuesto = parseFloat(ticket.presupuesto || 0);
  const gastado = parseFloat(ticket.gastado || 0);

  const usedRatio = presupuesto > 0 ? gastado / presupuesto : 0;
  const usedPct = isFinite(usedRatio) ? (usedRatio * 100) : 0;

  const available = Math.max(0, presupuesto - gastado);
  const excess = Math.max(0, gastado - presupuesto);
  const excessRatio = presupuesto > 0 ? excess / presupuesto : 0; // % relativo al presupuesto
  const excessPct = isFinite(excessRatio) ? (excessRatio * 100) : 0;

  return `
    <div class="ticket-card">
      <div class="ticket-header">
        <div>
          <h3 class="ticket-title">${ticket.id}</h3>
          <p class="ticket-ministry">${ticket.ministerio}</p>
          <p class="ticket-assigned">Asignado a: ${ticket.usuario_asignado}</p>
        </div>
        <span class="ticket-status ${ticket.estado === "activo" ? "status-active" : "status-completed"}">
          ${ticket.estado === "activo" ? "Activo" : "Completado"}
        </span>
      </div>

      <p class="ticket-description">${ticket.descripcion}</p>

      <div class="ticket-budget">
        <div class="budget-row">
          <span class="budget-label">Presupuesto</span>
          <span class="budget-amount budget-total">Q${formatCurrency(presupuesto)}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">Gastado</span>
          <span class="budget-amount budget-spent">Q${formatCurrency(gastado)}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">${excess > 0 ? "Exceso" : "Disponible"}</span>
          <span class="budget-amount ${excess > 0 ? "savings-negative" : "budget-available"}">
            ${excess > 0 ? `Q${formatCurrency(excess)}` : `Q${formatCurrency(available)}`}
          </span>
        </div>

        <!-- Barra principal: uso (máx 100%) -->
        <div class="budget-progress" title="Uso del presupuesto">
          <div class="budget-fill" style="width: ${Math.min(usedPct, 100)}%"></div>
        </div>
        <p class="budget-percentage">
          ${isFinite(usedPct) ? Math.min(usedPct, 100).toFixed(1) : "0.0"}% utilizado
        </p>

        <!-- Barra de exceso: sólo si gastó más del presupuesto -->
        ${excess > 0 ? `
          <div class="excess-progress" title="Exceso sobre el presupuesto">
            <div class="excess-fill" style="width: ${Math.min(excessPct, 100)}%"></div>
          </div>
          <p class="excess-text">Exceso: Q${formatCurrency(excess)} (${excessPct.toFixed(1)}%)</p>
        ` : ``}
      </div>

      <div class="ticket-dates">
        <span>Creado: ${ticket.fecha_creacion}</span>
        <span>Vence: ${ticket.fecha_vencimiento}</span>
      </div>

      <div class="ticket-actions">
        <button class="action-btn secondary" onclick="editTicket('${ticket.id}')">Editar</button>
        <button class="action-btn primary" onclick="viewExpenses('${ticket.id}')">Ver Gastos</button>
        <button class="action-btn danger" onclick="deleteTicket('${ticket.id}')">Eliminar</button>
      </div>
    </div>
  `;
}

function updateTicketsTab() {
  const noTickets = document.getElementById("noTickets");
  const ticketsContainer = document.getElementById("ticketsContainer");

  if (appState.tickets.length === 0) {
    if (noTickets) noTickets.classList.remove("hidden");
    if (ticketsContainer) ticketsContainer.classList.add("hidden");
    return;
  }

  if (noTickets) noTickets.classList.add("hidden");
  if (ticketsContainer) {
    ticketsContainer.classList.remove("hidden");
    ticketsContainer.innerHTML = appState.tickets.map((t) => createTicketCard(t)).join("");
  }
}

/* ====================== Historial ====================== */
function createHistorialCard(ticket) {
  const presupuesto = parseFloat(ticket.presupuesto || 0);
  const gastado = parseFloat(ticket.gastado || 0);

  const usedRatio = presupuesto > 0 ? gastado / presupuesto : 0;
  const usedPct = isFinite(usedRatio) ? (usedRatio * 100) : 0;

  const difference = presupuesto - gastado; // + ahorro, - exceso
  const isUnderBudget = difference > 0;

  const excess = Math.max(0, -difference); // gastado - presupuesto
  const excessRatio = presupuesto > 0 ? excess / presupuesto : 0;
  const excessPct = isFinite(excessRatio) ? (excessRatio * 100) : 0;

  return `
    <div class="historical-card">
      <div class="ticket-header">
        <div>
          <h3 class="ticket-title">${ticket.id}</h3>
          <p class="ticket-ministry">${ticket.ministerio}</p>
          <p class="ticket-assigned">Usuario: ${ticket.usuario_asignado}</p>
        </div>
        <span class="ticket-status status-completed">Completado</span>
      </div>

      <p class="ticket-description">${ticket.descripcion}</p>

      <div class="ticket-budget">
        <div class="budget-row">
          <span class="budget-label">Presupuesto asignado</span>
          <span class="budget-amount budget-total">Q${formatCurrency(presupuesto)}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">Total gastado</span>
          <span class="budget-amount budget-spent">Q${formatCurrency(gastado)}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">${isUnderBudget ? "Ahorro" : "Exceso"}</span>
          <span class="budget-amount ${isUnderBudget ? "savings-positive" : "savings-negative"}">
            Q${formatCurrency(Math.abs(difference))}
          </span>
        </div>

        <!-- Barra principal (hasta 100%) -->
        <div class="budget-progress" title="Uso del presupuesto">
          <div class="budget-fill" style="width: ${Math.min(usedPct, 100)}%"></div>
        </div>
        <p class="budget-percentage">${Math.min(usedPct, 100).toFixed(1)}% del presupuesto</p>

        <!-- Barra de exceso -->
        ${excess > 0 ? `
          <div class="excess-progress" title="Exceso sobre el presupuesto">
            <div class="excess-fill" style="width: ${Math.min(excessPct, 100)}%"></div>
          </div>
          <p class="excess-text">Exceso: Q${formatCurrency(excess)} (${excessPct.toFixed(1)}%)</p>
        ` : ``}
      </div>

      <div class="historical-dates">
        <div class="date-item">
          <span class="date-label">Creado</span>
          <span class="date-value">${ticket.fecha_creacion}</span>
        </div>
        <div class="date-item">
          <span class="date-label">Vencía</span>
          <span class="date-value">${ticket.fecha_vencimiento}</span>
        </div>
        <div class="date-item">
          <span class="date-label">Completado</span>
          <span class="date-value date-completed">${ticket.fecha_completado}</span>
        </div>
      </div>

      <div class="ticket-actions">
        <button class="action-btn primary" onclick="viewReport('${ticket.id}')">Ver Reporte</button>
        <button class="action-btn secondary" onclick="exportTicket('${ticket.id}')">Exportar</button>
      </div>
    </div>
  `;
}

function updateHistorialTab() {
  const noHistorial = document.getElementById("noHistorial");
  const historialContainer = document.getElementById("historialContainer");
  const ministerioFilter = document.getElementById("ministerioFilter");
  const monthFilter = document.getElementById("monthFilter");

  let list = [...appState.historicalTickets];

  // Filtro por ministerio (por código al inicio del ID)
  if (ministerioFilter && ministerioFilter.value) {
    const code = ministerioFilter.value;
    list = list.filter((t) => t.id.startsWith(code));
  }

  // Filtro por mes (YYYY-MM) comparando fecha_completado
  if (monthFilter && monthFilter.value) {
    const [year, month] = monthFilter.value.split("-");
    list = list.filter((t) => {
      // t.fecha_completado en dd/mm/yyyy -> convertir
      const [d, m, y] = (t.fecha_completado || "").split("/");
      return y === year && m === month;
    });
  }

  if (!list.length) {
    if (noHistorial) noHistorial.classList.remove("hidden");
    if (historialContainer) historialContainer.classList.add("hidden");
    return;
  }

  if (noHistorial) noHistorial.classList.add("hidden");
  if (historialContainer) {
    historialContainer.classList.remove("hidden");
    historialContainer.innerHTML = list.map((t) => createHistorialCard(t)).join("");
  }
}

/* ====================== Acciones ====================== */
async function deleteTicket(ticketId) {
  if (!confirm("¿Estás seguro de eliminar este ticket?")) return;

  try {
    appState.tickets = appState.tickets.filter((t) => t.id !== ticketId);
    updateStats();
    updateDashboard();
    updateTicketsTab();
    showNotification("Ticket eliminado exitosamente", "success");
  } catch (error) {
    console.error("Error eliminando ticket:", error);
    showNotification("Error al eliminar el ticket", "error");
  }
}

function editTicket(ticketId) {
  openEditModal(ticketId);
}

function viewExpenses(ticketId) {
  console.log(`Ver gastos del ticket: ${ticketId}`);
  showNotification("Vista de gastos próximamente", "info");
}

function viewReport(ticketId) {
  console.log(`Ver reporte detallado del ticket: ${ticketId}`);
  showNotification("Reporte detallado próximamente", "info");
}

function exportTicket(ticketId) {
  console.log(`Exportar ticket: ${ticketId}`);
  showNotification("Exportación próximamente", "info");
}

function handleLogout() {
  if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
    showNotification("Cerrando sesión...", "info");
    setTimeout(() => {
      console.log("Redirigiendo al login...");
      // window.location.href = 'login.html';
    }, 1000);
  }
}

/* ====================== Tabs ====================== */
function switchTab(tabName) {
  appState.activeTab = tabName;

  // Botones principales
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    if (btn.dataset.tab === tabName) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  // Contenidos
  const tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach((content) => {
    if (content.id === `${tabName}-tab`) content.classList.add("active");
    else content.classList.remove("active");
  });

  // Actualizar estado activo del sidebar
  updateSidebarActiveState();

  // Carga específica
  if (tabName === "dashboard") {
    updateDashboard();
  } else if (tabName === "crear") {
    updateUserForm();
    updateCreateButton();
  } else if (tabName === "gestionar") {
    updateTicketsTab();
  } else if (tabName === "historial") {
    updateHistorialTab();
  }

  // Cerrar sidebar en móvil al cambiar tab
  if (window.innerWidth <= 768 && appState.showSidebar) {
    closeSidebar();
  }
}

/* ====================== Carga Inicial ====================== */
async function loadAdminData() {
  appState.loading = true;
  updateStats();

  try {
    // Simular carga desde API
    await new Promise((r) => setTimeout(r, 800));

    // En producción: reemplazar con fetch real para users, tickets e historial
    appState.users = [...SAMPLE_USERS];
    appState.tickets = [...SAMPLE_ADMIN_TICKETS];
    appState.historicalTickets = [...SAMPLE_HISTORICAL_TICKETS];
  } catch (e) {
    console.error("Error cargando datos:", e);
    showNotification("No se pudieron cargar los datos iniciales", "error");
  } finally {
    appState.loading = false;
    updateStats();
    updateDashboard();
    updateTicketsTab();
    updateHistorialTab();
    updateSidebarActiveState();
  }
}

/* =======================================================================
   MODAL DE EDICIÓN (presupuesto + fechas)
   ======================================================================= */

/* ===== Utilidades de fecha: dd/mm/yyyy <-> yyyy-mm-dd ===== */
function ddmmyyyy_to_iso(dmy) {
  // "28/08/2025" -> "2025-08-28"
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

function iso_to_ddmmyyyy(iso) {
  // "2025-08-28" -> "28/08/2025"
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`;
}

/* ===== Estado local para edición ===== */
let editingTicketId = null;

/* ===== Apertura del modal con datos ===== */
function openEditModal(ticketId) {
  const t = appState.tickets.find(x => x.id === ticketId);
  if (!t) {
    showNotification("No se encontró el ticket a editar", "error");
    return;
  }
  editingTicketId = ticketId;

  // Rellena los campos
  const $id = document.getElementById("editTicketId");
  const $pres = document.getElementById("editPresupuesto");
  const $fCre = document.getElementById("editFechaCreacion");
  const $fVen = document.getElementById("editFechaVencimiento");

  if ($id) $id.textContent = t.id;
  if ($pres) $pres.value = parseFloat(t.presupuesto || 0).toFixed(2);
  if ($fCre) $fCre.value = ddmmyyyy_to_iso(t.fecha_creacion);
  if ($fVen) $fVen.value = ddmmyyyy_to_iso(t.fecha_vencimiento);

  // Muestra modal
  const backdrop = document.getElementById("editModalBackdrop");
  if (backdrop) backdrop.classList.remove("hidden");
  // Evita scroll de fondo
  document.body.style.overflow = "hidden";
}

/* ===== Cierre del modal ===== */
function closeEditModal() {
  const backdrop = document.getElementById("editModalBackdrop");
  if (backdrop) backdrop.classList.add("hidden");
  document.body.style.overflow = "";
  editingTicketId = null;
  // Reset simple del form
  const form = document.getElementById("editForm");
  if (form) form.reset();
  const $id = document.getElementById("editTicketId");
  if ($id) $id.textContent = "";
}

/* ===== Guardar cambios ===== */
function saveEditModal(e) {
  e.preventDefault();
  if (!editingTicketId) return;

  const pres = document.getElementById("editPresupuesto")?.value;
  const fCre = document.getElementById("editFechaCreacion")?.value;     // yyyy-mm-dd
  const fVen = document.getElementById("editFechaVencimiento")?.value;  // yyyy-mm-dd

  // Validaciones básicas
  const presNum = parseFloat(pres);
  if (isNaN(presNum) || presNum < 0) {
    showNotification("El presupuesto debe ser un número válido ≥ 0", "error");
    return;
  }
  if (!fCre || !fVen) {
    showNotification("Completa ambas fechas", "error");
    return;
  }
  if (new Date(fVen) < new Date(fCre)) {
    showNotification("La fecha de vencimiento no puede ser anterior a la fecha de creación", "error");
    return;
  }

  // Actualiza estado
  const idx = appState.tickets.findIndex(x => x.id === editingTicketId);
  if (idx === -1) {
    showNotification("No se pudo actualizar el ticket", "error");
    return;
  }

  appState.tickets[idx] = {
    ...appState.tickets[idx],
    presupuesto: presNum.toFixed(2),
    fecha_creacion: iso_to_ddmmyyyy(fCre),
    fecha_vencimiento: iso_to_ddmmyyyy(fVen),
  };

  // Refresca UI
  updateStats();
  updateDashboard();
  updateTicketsTab();

  closeEditModal();
  showNotification("Cambios guardados correctamente", "success");
}

/* ====================== Wiring (DOMContentLoaded) ====================== */
document.addEventListener("DOMContentLoaded", () => {
  // ===== SIDEBAR WIRING =====
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", openSidebar);
  }

  if (sidebarClose) {
    sidebarClose.addEventListener("click", closeSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }

  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener("click", handleLogout);
  }

  // Navegación desde sidebar
  document.querySelectorAll('.nav-item[data-tab]').forEach((item) => {
    item.addEventListener("click", () => {
      const tabName = item.dataset.tab;
      switchTab(tabName);
    });
  });

  // Cerrar sidebar con tecla Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && appState.showSidebar) {
      closeSidebar();
    }
  });

  // ===== TABS PRINCIPALES =====
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // ===== TEMA =====
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      appState.isDark = !appState.isDark;
      updateTheme();
    });
  }

  // ===== PERFIL =====
  const profileToggle = document.getElementById("profileToggle");
  const profileDropdown = document.getElementById("profileDropdown");
  if (profileToggle && profileDropdown) {
    profileToggle.addEventListener("click", () => {
      profileDropdown.classList.toggle("hidden");
    });
    // Cerrar al hacer click fuera
    document.addEventListener("click", (e) => {
      if (!profileDropdown.contains(e.target) && !profileToggle.contains(e.target)) {
        profileDropdown.classList.add("hidden");
      }
    });
  }

  // ===== LOGOUT =====
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  // ===== FORMULARIO CREAR TICKET =====
  const ticketForm = document.getElementById("ticketForm");
  if (ticketForm) {
    ticketForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // Tomar valores actuales del form al estado
      const usuarioSelect = document.getElementById("usuarioSelect");
      const ministerioSelect = document.getElementById("ministerioSelect");
      const descripcionInput = document.getElementById("descripcionInput");
      const presupuestoInput = document.getElementById("presupuestoInput");
      const fechaVencimientoInput = document.getElementById("fechaVencimientoInput");
      const monedaSelect = document.getElementById("monedaSelect");

      appState.ticketForm.usuario_id = usuarioSelect?.value || "";
      appState.ticketForm.ministerio_id = ministerioSelect?.value || "";
      appState.ticketForm.descripcion = descripcionInput?.value?.trim() || "";
      appState.ticketForm.presupuesto = presupuestoInput?.value || "";
      appState.ticketForm.fecha_vencimiento = fechaVencimientoInput?.value || "";
      appState.ticketForm.moneda = monedaSelect?.value || "Q";

      createTicket();
    });
  }

  // Selects e inputs que afectan validez del botón crear
  const usuarioSelect = document.getElementById("usuarioSelect");
  if (usuarioSelect) {
    usuarioSelect.addEventListener("change", (e) => {
      handleUserSelect(e.target.value);
      updateCreateButton();
    });
  }

  const ministerioSelect = document.getElementById("ministerioSelect");
  if (ministerioSelect) {
    ministerioSelect.addEventListener("change", (e) => {
      handleMinisterioSelect(e.target.value);
      updateCreateButton();
    });
  }

  ["descripcionInput", "presupuestoInput", "fechaVencimientoInput"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateCreateButton);
  });

  // ===== FILTROS DE HISTORIAL =====
  const ministerioFilter = document.getElementById("ministerioFilter");
  if (ministerioFilter) ministerioFilter.addEventListener("change", updateHistorialTab);

  const monthFilter = document.getElementById("monthFilter");
  if (monthFilter) monthFilter.addEventListener("change", updateHistorialTab);

  // ===== MODAL DE EDICIÓN =====
  const editForm = document.getElementById("editForm");
  const editCloseBtn = document.getElementById("editCloseBtn");
  const editCancelBtn = document.getElementById("editCancelBtn");
  const editModalBackdrop = document.getElementById("editModalBackdrop");

  if (editForm) editForm.addEventListener("submit", saveEditModal);
  if (editCloseBtn) editCloseBtn.addEventListener("click", closeEditModal);
  if (editCancelBtn) editCancelBtn.addEventListener("click", closeEditModal);
  if (editModalBackdrop) {
    editModalBackdrop.addEventListener("click", (e) => {
      if (e.target === editModalBackdrop) closeEditModal();
    });
  }

  // ===== INICIALIZACIÓN =====
  updateTheme();
  loadAdminData();
});
