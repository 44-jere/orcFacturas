/* =========================================================================
   Panel Administrador – Automatix Solutions
   Archivo: admin-script.js (SIN MODO DEMO)
   ========================================================================= */

/* ====================== Estado global ====================== */
let appState = {
  isDark: true,
  showProfile: false,
  showSidebar: false,
  // Pestaña inicial (se eliminó "dashboard")
  activeTab: "crear",
  users: [],                 // SIN DEMO
  tickets: [],               // SIN DEMO
  historicalTickets: [],     // SIN DEMO
  loading: false,
  creating: false,
  ticketForm: {
    usuario_id: "",
    ministerio_id: "",
    descripcion: "",
    presupuesto: "",
    fecha_inicio: "",
    fecha_vencimiento: "",
    moneda: "Q",
  },

  /* ====== NUEVO: selección múltiple en Crear Ticket ====== */
  currentUserCandidateId: "",     // id del usuario actualmente “seleccionado” (antes de agregar a lista)
  selectedUsersIds: [],           // ids confirmados (máx 5)
};

/* ====== Filtros Gestionar ====== */
let gestCriteria = { mode: "", nameQuery: "", idQuery: "", from: "", to: "" };

/* ====== Filtros Historial (se mantienen) ====== */
let histSearchActive = false;
let histCriteria = { ministerio: "", month: "", from: "", to: "", user: "" };

/* ====================== Utilidades ====================== */
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

/* === ID ENTERO AUTOINCREMENTAL para tickets === */
function getNextTicketId() {
  const all = [...appState.tickets, ...appState.historicalTickets];
  const maxId = all.reduce((mx, t) => {
    const n = Number(t?.id);
    return Number.isFinite(n) ? Math.max(mx, n) : mx;
  }, 0);
  return maxId + 1;
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

/* ====================== SIDEBAR ====================== */
function openSidebar() {
  appState.showSidebar = true;
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.remove("hidden");
  if (overlay) overlay.classList.remove("hidden");
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
    if (item.dataset.tab === appState.activeTab) item.classList.add('active');
    else item.classList.remove('active');
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
    const budget = appState.tickets.reduce((sum, t) => sum + parseFloat(t.presupuesto || 0), 0);

    if (totalTickets) totalTickets.textContent = appState.tickets.length;
    if (activeTickets) activeTickets.textContent = activeCount;
    if (totalUsers) totalUsers.textContent = appState.users.length;
    if (totalBudget) totalBudget.textContent = `Q${formatCurrency(budget)}`;
    if (ticketCount) ticketCount.textContent = appState.tickets.length;
    if (historialCount) historialCount.textContent = appState.historicalTickets.length;
  }
  updateSidebarBadges();
}

function generateDashboardStats() {
  const totalTicketsCreated = appState.tickets.length + appState.historicalTickets.length;
  const totalBudgetAssigned = appState.tickets.reduce((sum, t) => sum + parseFloat(t.presupuesto || 0), 0);
  const totalSpentAmount = [...appState.tickets, ...appState.historicalTickets].reduce(
    (sum, t) => sum + parseFloat(t.gastado || 0),
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
        String(t.id).startsWith(codigo)
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
  // Poblamos el datalist SOLO para el modo "Nombre"
  const dl = document.getElementById("usuarioDatalist");
  if (dl) {
    dl.innerHTML = "";
    appState.users.forEach((user) => {
      const opt = document.createElement("option");
      opt.value = `${user.nombre} - ${user.cargo}`;
      opt.setAttribute("data-id", user.id);
      dl.appendChild(opt);
    });
  }

  // reset campos de usuario en crear (solo inputs; la lista confirmada se mantiene)
  const hiddenId = document.getElementById("usuarioSelect");
  const inputNombre = document.getElementById("usuarioSearchInput");
  const inputId = document.getElementById("usuarioIdInput");

  if (hiddenId) hiddenId.value = "";
  if (inputNombre) inputNombre.value = "";
  if (inputId) inputId.value = "";

  const userInfo = document.getElementById("userInfo");
  if (userInfo) userInfo.classList.add("hidden");
  appState.ticketForm.usuario_id = "";
  appState.currentUserCandidateId = "";
  renderSelectedUsersBox(); // refrescar UI
}

function hideMinisterioInfo() {
  const ministerioInfo = document.getElementById("ministerioInfo");
  if (ministerioInfo) ministerioInfo.classList.add("hidden");
}

function handleUserSelect(userId) {
  const user = appState.users.find((u) => String(u.id) === String(userId));
  const userInfo = document.getElementById("userInfo");
  const userEmail = document.getElementById("userEmail");
  const userCargo = document.getElementById("userCargo");
  const userMinisterios = document.getElementById("userMinisterios");
  const ministerioSelect = document.getElementById("ministerioSelect");

  appState.ticketForm.usuario_id = userId;

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

/* === Buscador por nombre (progresivo) === */
function resolveUserFromInput(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const matches = appState.users.filter(u =>
    (u.nombre || "").toLowerCase().includes(lower) ||
    (u.email || "").toLowerCase().includes(lower) ||
    (u.cargo || "").toLowerCase().includes(lower)
  );
  if (matches.length === 1) return matches[0];
  const exact = appState.users.find(u => `${u.nombre} - ${u.cargo}`.toLowerCase() === lower);
  return exact || null;
}

function onUserSearchInput() {
  const input = document.getElementById("usuarioSearchInput");
  const hiddenId = document.getElementById("usuarioSelect");
  if (!input || !hiddenId) return;

  const selected = resolveUserFromInput(input.value.trim());
  if (selected) {
    hiddenId.value = selected.id;
    handleUserSelect(selected.id);
  } else {
    hiddenId.value = "";
    handleUserSelect("");
  }
  updateCreateButton();
}

/* === NUEVO: Enter en buscador por nombre → mostrar recuadro y bloquear === */
function onUserSearchEnter(e) {
  if (e.key !== "Enter") return;
  const hiddenId = document.getElementById("usuarioSelect");
  const uid = hiddenId?.value;
  if (!uid) {
    showNotification("Selecciona un usuario válido de la lista", "error");
    return;
  }
  showSelectedUserBox(uid);
}

/* === Buscador por ID (entero) === */
function onUserIdSearchClick() {
  const inp = document.getElementById("usuarioIdInput");
  const hiddenId = document.getElementById("usuarioSelect");
  if (!inp || !hiddenId) return;

  const raw = inp.value?.trim();
  const idNum = Number(raw);
  if (!Number.isInteger(idNum)) {
    showNotification("El ID debe ser un número entero", "error");
    return;
  }

  const user = appState.users.find(u => Number(u.id) === idNum);
  if (!user) {
    showNotification("No se encontró un usuario con ese ID", "error");
    hiddenId.value = "";
    handleUserSelect("");
    updateCreateButton();
    return;
  }

  hiddenId.value = user.id;
  handleUserSelect(user.id);
  updateCreateButton();

  /* Mostrar recuadro y bloquear */
  showSelectedUserBox(user.id);
}

/* ====================== NUEVO: Recuadro selección & lista ====================== */
function lockUserSelectionFields(lock = true) {
  const modeSel = document.getElementById("crearUserSearchMode");
  const nameInp = document.getElementById("usuarioSearchInput");
  const idInp = document.getElementById("usuarioIdInput");
  const idBtn = document.getElementById("usuarioIdSearchBtn");

  if (modeSel) modeSel.disabled = lock;
  if (nameInp) nameInp.disabled = lock;
  if (idInp) idInp.disabled = lock;
  if (idBtn) idBtn.disabled = lock;
}

function getUserByIdSafe(id) {
  return appState.users.find(u => String(u.id) === String(id)) || null;
}

function showSelectedUserBox(userId) {
  const user = getUserByIdSafe(userId);
  if (!user) {
    showNotification("Usuario no válido", "error");
    return;
  }
  appState.currentUserCandidateId = String(user.id);

  const box = document.getElementById("selectedUsersBox");
  const boxDetail = document.getElementById("selectedUserDetail");
  const addBtn = document.getElementById("addUserToListBtn");
  const addMoreBtn = document.getElementById("addMoreUsersBtn");
  const changeBtn = document.getElementById("changeUserBtn");

  if (boxDetail) {
    boxDetail.innerHTML = `
      <p class="user-detail"><strong>Nombre:</strong> ${user.nombre}</p>
      <p class="user-detail"><strong>Cargo:</strong> ${user.cargo}</p>
      <p class="user-detail"><strong>ID:</strong> ${user.id}</p>
    `;
  }

  if (box) box.classList.remove("hidden");

  // bloquear campos de asignación
  lockUserSelectionFields(true);

  // Habilitar botones
  if (addBtn) addBtn.disabled = false;
  if (addMoreBtn) addMoreBtn.disabled = appState.selectedUsersIds.length >= 5;
  if (changeBtn) changeBtn.disabled = false;

  renderSelectedUsersList();
}

function renderSelectedUsersList() {
  const listEl = document.getElementById("selectedUsersList");
  const counterEl = document.getElementById("selectedUsersCounter");
  if (!listEl || !counterEl) return;

  const items = appState.selectedUsersIds.map((uid, idx) => {
    const u = getUserByIdSafe(uid);
    const label = u ? `${u.nombre} (${u.cargo}) - ID ${u.id}` : `Usuario ${uid}`;
    return `<li class="selected-user-item">${idx + 1}. ${label}</li>`;
  });

  listEl.innerHTML = items.join("") || `<li class="selected-user-item empty">No hay usuarios en la lista</li>`;
  counterEl.textContent = `${appState.selectedUsersIds.length}/5 seleccionados`;
}

function renderSelectedUsersBox() {
  const box = document.getElementById("selectedUsersBox");
  if (!box) return;

  if (!appState.currentUserCandidateId && appState.selectedUsersIds.length === 0) {
    box.classList.add("hidden");
    // desbloquear campos si no hay nada seleccionado
    lockUserSelectionFields(false);
    return;
  }
  box.classList.remove("hidden");
  renderSelectedUsersList();
}

/* Confirmar candidato → agregar a la lista (máx 5) */
function addCurrentCandidateToList() {
  const uid = appState.currentUserCandidateId;
  if (!uid) {
    showNotification("No hay usuario seleccionado para agregar", "error");
    return;
  }
  if (appState.selectedUsersIds.includes(uid)) {
    showNotification("Ese usuario ya está en la lista", "info");
    return;
  }
  if (appState.selectedUsersIds.length >= 5) {
    showNotification("Máximo 5 usuarios", "error");
    return;
  }
  appState.selectedUsersIds.push(uid);
  renderSelectedUsersList();

  // Permitir agregar más
  const addMoreBtn = document.getElementById("addMoreUsersBtn");
  if (addMoreBtn) addMoreBtn.disabled = appState.selectedUsersIds.length >= 5;
}

/* Cambiar usuario actual (solo desbloquea para seleccionar a otro, conserva lista) */
function changeUserSelection() {
  appState.currentUserCandidateId = "";
  const detail = document.getElementById("selectedUserDetail");
  if (detail) detail.innerHTML = `<p class="user-detail">Selecciona un usuario por nombre o ID.</p>`;
  lockUserSelectionFields(false);

  // limpiar inputs de búsqueda para evitar confusión
  const hiddenId = document.getElementById("usuarioSelect");
  const inputNombre = document.getElementById("usuarioSearchInput");
  const inputId = document.getElementById("usuarioIdInput");
  if (hiddenId) hiddenId.value = "";
  if (inputNombre) inputNombre.value = "";
  if (inputId) inputId.value = "";
}

/* Agregar otro usuario: habilita campos para seleccionar otro, sin borrar la lista */
function addAnotherUser() {
  if (appState.selectedUsersIds.length >= 5) {
    showNotification("Límite alcanzado (máx 5)", "error");
    return;
  }
  changeUserSelection();
}

/* ====================== Gestión de selección de modo (Crear) ====================== */
function renderCrearUserFields() {
  const modeSelect = document.getElementById("crearUserSearchMode");
  const fieldsBox = document.getElementById("crearUserModeFields");
  if (!modeSelect || !fieldsBox) return;

  const mode = modeSelect.value || "nombre";

  if (mode === "nombre") {
    fieldsBox.innerHTML = `
      <input
        id="usuarioSearchInput"
        class="form-input"
        type="text"
        placeholder="Buscar usuario por nombre, email o cargo..."
        list="usuarioDatalist"
        autocomplete="off"
        required
      />
      <input type="hidden" id="usuarioSelect" value="" />
    `;
    const userSearch = document.getElementById("usuarioSearchInput");
    if (userSearch) {
      userSearch.addEventListener("input", onUserSearchInput);
      userSearch.addEventListener("keydown", onUserSearchEnter); // NUEVO: Enter → recuadro
    }
  } else if (mode === "id") {
    fieldsBox.innerHTML = `
      <div class="filters-row" style="gap:.5rem;margin-bottom:0;">
        <input id="usuarioIdInput" class="form-input" type="number" placeholder="ID (entero)" />
        <button id="usuarioIdSearchBtn" class="pagination-btn" type="button">Buscar</button>
      </div>
      <input type="hidden" id="usuarioSelect" value="" />
    `;
    const btn = document.getElementById("usuarioIdSearchBtn");
    if (btn) btn.addEventListener("click", onUserIdSearchClick);
  }

  // Si ya hay un candidato o lista, mantener recuadro visible y bloquear si corresponde
  renderSelectedUsersBox();
  lockUserSelectionFields(!!appState.currentUserCandidateId);
}

function handleMinisterioSelect(ministerioId) {
  const user = appState.users.find((u) => u.id === appState.ticketForm.usuario_id);
  const ministerio = user?.ministerios_asignados.find((m) => m.id === ministerioId);
  const ministerioInfo = document.getElementById("ministerioInfo");
  const generatedId = document.getElementById("generatedId");

  appState.ticketForm.ministerio_id = ministerioId;

  if (ministerio && ministerioInfo) {
    ministerioInfo.classList.remove("hidden");
    if (generatedId) generatedId.textContent = ""; // IDs de tickets ahora son enteros
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

  const anyUser =
    appState.selectedUsersIds.length > 0 ||
    appState.ticketForm.usuario_id ||
    appState.currentUserCandidateId;

  const isValid =
    anyUser &&
    appState.ticketForm.descripcion &&
    appState.ticketForm.presupuesto &&
    appState.ticketForm.fecha_inicio &&
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
  const anyUser =
    appState.selectedUsersIds.length > 0
      ? true
      : (appState.currentUserCandidateId || appState.ticketForm.usuario_id);

  if (
    !anyUser ||
    !appState.ticketForm.descripcion ||
    !appState.ticketForm.presupuesto ||
    !appState.ticketForm.fecha_inicio ||
    !appState.ticketForm.fecha_vencimiento
  ) {
    showNotification("Por favor completa todos los campos requeridos", "error");
    return;
  }

  appState.creating = true;
  updateCreateButton();

  try {
    // Determinar a quiénes crearles ticket:
    let targetUserIds = [];
    if (appState.selectedUsersIds.length > 0) {
      targetUserIds = [...appState.selectedUsersIds];
    } else if (appState.currentUserCandidateId) {
      targetUserIds = [appState.currentUserCandidateId];
    } else if (appState.ticketForm.usuario_id) {
      targetUserIds = [appState.ticketForm.usuario_id];
    }

    const createdIds = [];

    for (const uid of targetUserIds) {
      const selectedUser = appState.users.find((u) => String(u.id) === String(uid));
      if (!selectedUser) continue;

      const newTicketId = getNextTicketId();
      const newTicket = {
        id: newTicketId,
        usuario_asignado: selectedUser.nombre,
        ministerio: "",
        descripcion: appState.ticketForm.descripcion,
        presupuesto: appState.ticketForm.presupuesto,
        gastado: "0.00",
        fecha_creacion: new Date().toLocaleDateString("es-GT"),
        fecha_inicio: appState.ticketForm.fecha_inicio,
        fecha_vencimiento: appState.ticketForm.fecha_vencimiento,
        estado: "activo",
      };
      appState.tickets.push(newTicket);
      createdIds.push(newTicketId);
    }

    clearTicketForm();
    updateStats();
    updateDashboard();
    updateTicketsTab();

    if (createdIds.length === 1) {
      showNotification(`Ticket ${createdIds[0]} creado exitosamente!`, "success");
    } else {
      showNotification(`Se crearon ${createdIds.length} tickets: ${createdIds.join(", ")}`, "success");
    }
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
    fecha_inicio: "",
    fecha_vencimiento: "",
    moneda: "Q",
  };

  // limpiar selección múltiple
  appState.currentUserCandidateId = "";
  appState.selectedUsersIds = [];

  const form = document.getElementById("ticketForm");
  if (form) form.reset();

  // Reinicio de inputs dinámicos
  const hiddenId = document.getElementById("usuarioSelect");
  const inputNombre = document.getElementById("usuarioSearchInput");
  const inputId = document.getElementById("usuarioIdInput");
  if (hiddenId) hiddenId.value = "";
  if (inputNombre) inputNombre.value = "";
  if (inputId) inputId.value = "";

  // Recuadro
  renderSelectedUsersBox();

  const ministerioSelect = document.getElementById("ministerioSelect");
  const monedaSelect = document.getElementById("monedaSelect");

  if (ministerioSelect) {
    ministerioSelect.value = "";
    ministerioSelect.disabled = true;
    ministerioSelect.innerHTML = '<option value="">Primero selecciona un usuario</option>';
  }
  if (monedaSelect) monedaSelect.value = "Q";

  hideMinisterioInfo();
  const userInfo = document.getElementById("userInfo");
  if (userInfo) userInfo.classList.add("hidden");

  // desbloquear campos de usuario
  lockUserSelectionFields(false);
}

/* ====================== Gestión de Tickets ====================== */
function createTicketCard(ticket) {
  const presupuesto = parseFloat(ticket.presupuesto || 0);
  const gastado = parseFloat(ticket.gastado || 0);

  const usedRatio = presupuesto > 0 ? gastado / presupuesto : 0;
  const usedPct = isFinite(usedRatio) ? (usedRatio * 100) : 0;

  const available = Math.max(0, presupuesto - gastado);
  const excess = Math.max(0, gastado - presupuesto);
  const excessRatio = presupuesto > 0 ? excess / presupuesto : 0;
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

        <div class="budget-progress" title="Uso del presupuesto">
          <div class="budget-fill" style="width: ${Math.min(usedPct, 100)}%"></div>
        </div>
        <p class="budget-percentage">
          ${isFinite(usedPct) ? Math.min(usedPct, 100).toFixed(1) : "0.0"}% utilizado
        </p>

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

  let list = [...appState.tickets];

  // ===== Lógica de filtro Gestionar =====
  const mode = (gestCriteria.mode || "").trim();

  // Rango de fechas (opcional) integrado en modos que lo usan
  const from = gestCriteria.from ? new Date(gestCriteria.from) : null;
  const to = gestCriteria.to ? new Date(gestCriteria.to) : null;
  let end = null;
  if (to) {
    end = new Date(to);
    end.setHours(23,59,59,999);
  }

  if (mode === "nombre") {
    const q = (gestCriteria.nameQuery || "").toLowerCase();
    if (q) {
      list = list.filter(t => (t.usuario_asignado || "").toLowerCase().includes(q));
    }
    // aplicar fecha si viene
    if (from || end) {
      list = list.filter(t => {
        const dt = ddmmy_to_Date(t.fecha_creacion);
        if (!dt) return false;
        if (from && dt < from) return false;
        if (end && dt > end) return false;
        return true;
      });
    }
  } else if (mode === "id") {
    const idQ = parseInt(gestCriteria.idQuery, 10);
    if (!isNaN(idQ)) {
      list = list.filter(t => {
        const n = Number(t.id);
        return Number.isFinite(n) && n === idQ;
      });
    } else {
      list = [];
    }
    // aplicar fecha si viene
    if (from || end) {
      list = list.filter(t => {
        const dt = ddmmy_to_Date(t.fecha_creacion);
        if (!dt) return false;
        if (from && dt < from) return false;
        if (end && dt > end) return false;
        return true;
      });
    }
  } else if (mode === "id-ticket") {
    const idQ = parseInt(gestCriteria.idQuery, 10);
    if (!isNaN(idQ)) {
      list = list.filter(t => {
        const n = Number(t.id);
        return Number.isFinite(n) && n === idQ;
      });
    } else {
      list = [];
    }
    // IMPORTANTE: En "ID Ticket" NO se aplican filtros de fecha.
  } else {
    // modo vacío: sin filtros adicionales
  }

  if (list.length === 0) {
    if (noTickets) noTickets.classList.remove("hidden");
    if (ticketsContainer) ticketsContainer.classList.add("hidden");
    return;
  }

  if (noTickets) noTickets.classList.add("hidden");
  if (ticketsContainer) {
    ticketsContainer.classList.remove("hidden");
    ticketsContainer.innerHTML = list.map((t) => createTicketCard(t)).join("");
  }
}

/* ====================== Historial ====================== */
function ddmmy_to_Date(ddmmyyyy) {
  if (!ddmmyyyy) return null;
  const [d, m, y] = ddmmyyyy.split("/");
  if (!d || !m || !y) return null;
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function createHistorialCard(ticket) {
  const presupuesto = parseFloat(ticket.presupuesto || 0);
  const gastado = parseFloat(ticket.gastado || 0);

  const usedRatio = presupuesto > 0 ? gastado / presupuesto : 0;
  const usedPct = isFinite(usedRatio) ? (usedRatio * 100) : 0;

  const difference = presupuesto - gastado; // + ahorro, - exceso
  const isUnderBudget = difference > 0;

  const excess = Math.max(0, -difference);
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
          <span class="budget-label">${difference > 0 ? "Ahorro" : "Exceso"}</span>
          <span class="budget-amount ${difference > 0 ? "savings-positive" : "savings-negative"}">
            Q${formatCurrency(Math.abs(difference))}
          </span>
        </div>

        <div class="budget-progress" title="Uso del presupuesto">
          <div class="budget-fill" style="width: ${Math.min(usedPct, 100)}%"></div>
        </div>
        <p class="budget-percentage">${Math.min(usedPct, 100).toFixed(1)}% del presupuesto</p>

        ${difference < 0 ? `
          <div class="excess-progress" title="Exceso sobre el presupuesto">
            <div class="excess-fill" style="width: ${Math.min((Math.abs(difference)/presupuesto)*100, 100)}%"></div>
          </div>
          <p class="excess-text">Exceso: Q${formatCurrency(Math.abs(difference))} (${((Math.abs(difference)/presupuesto)*100).toFixed(1)}%)</p>
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
        <button class="action-btn primary" onclick="viewDetails('${ticket.id}')">Ver Detalles</button>
        <button class="action-btn secondary" onclick="openReopenModal('${ticket.id}')">Reabrir</button>
      </div>
    </div>
  `;
}

function updateHistorialTab() {
  const noHistorial = document.getElementById("noHistorial");
  const historialContainer = document.getElementById("historialContainer");

  let list = [...appState.historicalTickets];

  if (histSearchActive) {
    const { ministerio, month, from, to, user } = histCriteria;

    if (ministerio) {
      list = list.filter((t) => String(t.id).startsWith(ministerio));
    }

    if (month) {
      const [year, mm] = month.split("-");
      list = list.filter((t) => {
        const [d, m, y] = (t.fecha_completado || "").split("/");
        return y === year && m === mm;
      });
    }

    if (from || to) {
      const fromDt = from ? new Date(from) : null;
      const toDt = to ? new Date(to) : null;
      list = list.filter((t) => {
        const dt = ddmmy_to_Date(t.fecha_completado);
        if (!dt) return false;
        if (fromDt && dt < fromDt) return false;
        if (toDt) {
          const end = new Date(toDt);
          end.setHours(23, 59, 59, 999);
          if (dt > end) return false;
        }
        return true;
      });
    }

    if (user) {
      const u = user.toLowerCase();
      list = list.filter(t => (t.usuario_asignado || "").toLowerCase().includes(u));
    }
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
    appState.tickets = appState.tickets.filter((t) => String(t.id) !== String(ticketId));
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

function viewDetails(ticketId) {
  console.log(`Ver detalles del ticket: ${ticketId}`);
  showNotification("Vista de detalles próximamente", "info");
}

/* ===== Reabrir Ticket (historial) ===== */
let reopeningTicketId = null;

function openReopenModal(ticketId) {
  reopeningTicketId = ticketId;
  const span = document.getElementById("reopenTicketId");
  if (span) span.textContent = ticketId;

  const modal = document.getElementById("reopenModalBackdrop");
  if (modal) modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReopenModal() {
  const modal = document.getElementById("reopenModalBackdrop");
  if (modal) modal.classList.add("hidden");
  document.body.style.overflow = "";
  reopeningTicketId = null;
  const form = document.getElementById("reopenForm");
  if (form) form.reset();
  const span = document.getElementById("reopenTicketId");
  if (span) span.textContent = "";
}

function reopenTicketSubmit(e) {
  e.preventDefault();
  if (!reopeningTicketId) return;

  const vencIso = document.getElementById("reopenFechaVenc")?.value;
  const reason = document.getElementById("reopenReason")?.value?.trim();

  if (!vencIso || !reason) {
    showNotification("Completa la nueva fecha de vencimiento y la razón de reapertura", "error");
    return;
  }

  const idx = appState.historicalTickets.findIndex(t => String(t.id) === String(reopeningTicketId));
  if (idx === -1) {
    showNotification("No se encontró el ticket en historial", "error");
    return;
  }

  const t = appState.historicalTickets[idx];
  const reopened = {
    ...t,
    fecha_vencimiento: iso_to_ddmmyyyy(vencIso),
    fecha_completado: undefined,
    estado: "activo",
  };

  appState.historicalTickets.splice(idx, 1);
  appState.tickets.push(reopened);

  closeReopenModal();
  updateStats();
  updateDashboard();
  updateTicketsTab();
  updateHistorialTab();

  showNotification(`Ticket ${reopeningTicketId} reabierto`, "success");
}

function viewReport(ticketId) {
  console.log(`Ver reporte detallado del ticket: ${ticketId}`);
  showNotification("Reporte detallado próximamente", "info");
}

function exportTicket(ticketId) {
  console.log(`Exportar ticket: ${ticketId}`);
  showNotification("Exportación próximamente", "info");
}

async function handleLogout() {
  if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
    showNotification("Cerrando sesión...", "info");
    await fetch("/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include"
    });
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

  updateSidebarActiveState();

  if (tabName === "crear") {
    renderCrearUserFields();   // muestra el modo elegido y respeta recuadro si ya existía
    updateUserForm();
    updateCreateButton();
  } else if (tabName === "gestionar") {
    populateUserFilters();
    setupGestionarDynamicFields();
    updateTicketsTab();
  } else if (tabName === "historial") {
    populateUserFilters();
    updateHistorialTab();
  }

  if (window.innerWidth <= 768 && appState.showSidebar) {
    closeSidebar();
  }
}

/* ====================== Carga Inicial (SIN DEMO) ====================== */
async function loadAdminData() {
  appState.loading = true;
  updateStats();

  try {
    // Carga real de API (opcional)
  } catch (e) {
    console.error("Error cargando datos:", e);
    showNotification("No se pudieron cargar los datos iniciales", "error");
  } finally {
    appState.loading = false;
    updateStats();
    updateDashboard();
    populateUserFilters();
    setupGestionarDynamicFields();
    renderCrearUserFields();
    updateUserForm();
    updateTicketsTab();
    updateHistorialTab();
    updateSidebarActiveState();
  }
}

/* =======================================================================
   MODAL DE EDICIÓN
   ======================================================================= */
function ddmmyyyy_to_iso(dmy) {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}
function iso_to_ddmmyyyy(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`;
}

let editingTicketId = null;

function openEditModal(ticketId) {
  const t = appState.tickets.find(x => String(x.id) === String(ticketId));
  if (!t) {
    showNotification("No se encontró el ticket a editar", "error");
    return;
  }
  editingTicketId = ticketId;

  const $id = document.getElementById("editTicketId");
  const $pres = document.getElementById("editPresupuesto");
  const $fCre = document.getElementById("editFechaCreacion");
  const $fVen = document.getElementById("editFechaVencimiento");

  if ($id) $id.textContent = t.id;
  if ($pres) $pres.value = parseFloat(t.presupuesto || 0).toFixed(2);
  if ($fCre) $fCre.value = ddmmyyyy_to_iso(t.fecha_creacion);
  if ($fVen) $fVen.value = ddmmyyyy_to_iso(t.fecha_vencimiento);

  const backdrop = document.getElementById("editModalBackdrop");
  if (backdrop) backdrop.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeEditModal() {
  const backdrop = document.getElementById("editModalBackdrop");
  if (backdrop) backdrop.classList.add("hidden");
  document.body.style.overflow = "";
  editingTicketId = null;
  const form = document.getElementById("editForm");
  if (form) form.reset();
  const $id = document.getElementById("editTicketId");
  if ($id) $id.textContent = "";
}

function saveEditModal(e) {
  e.preventDefault();
  if (!editingTicketId) return;

  const pres = document.getElementById("editPresupuesto")?.value;
  const fCre = document.getElementById("editFechaCreacion")?.value;
  const fVen = document.getElementById("editFechaVencimiento")?.value;

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

  const idx = appState.tickets.findIndex(x => String(x.id) === String(editingTicketId));
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

  updateStats();
  updateDashboard();
  updateTicketsTab();

  closeEditModal();
  showNotification("Cambios guardados correctamente", "success");
}

/* ====================== Filtros/Selects ====================== */
function populateUserFilters() {
  // Gestionar → opciones fijas "Buscar por"
  const gestUserFilter = document.getElementById("gestUserFilter");
  if (gestUserFilter) {
    const current = gestUserFilter.value || "";
    // Quitamos la opción "fecha" y solo dejamos Nombre / ID / ID Ticket
    gestUserFilter.innerHTML = `
      <option value="">Buscar por</option>
      <option value="nombre">Nombre</option>
      <option value="id">ID</option>
      <option value="id-ticket">ID Ticket</option>
    `;
    if ([...gestUserFilter.options].some(o => o.value === current)) {
      gestUserFilter.value = current;
    }
  }
  // Historial → buscador incremental ya usa input
}

function setupGestionarDynamicFields() {
  const modeSelect = document.getElementById("gestUserFilter");
  const fieldsBox = document.getElementById("gestModeFields");
  if (!modeSelect || !fieldsBox) return;

  renderGestionarFields();

  modeSelect.onchange = () => {
    gestCriteria = { mode: modeSelect.value, nameQuery: "", idQuery: "", from: "", to: "" };
    renderGestionarFields();
    updateTicketsTab();
  };
}

function renderGestionarFields() {
  const mode = gestCriteria.mode || "";
  const fieldsBox = document.getElementById("gestModeFields");
  if (!fieldsBox) return;

  // ====== INTEGRACIÓN DE FECHA EN NOMBRE / ID ======
  if (mode === "nombre") {
    fieldsBox.innerHTML = `
      <div class="filters-row" style="gap:.5rem;margin-bottom:0;">
        <input id="gestNameInput" class="filter-input" type="text" placeholder="Escribe un nombre..." />
        <input type="date" id="gestFromDate" class="filter-input" title="Desde">
        <input type="date" id="gestToDate" class="filter-input" title="Hasta">
        <button id="gestNameSearchBtn" class="pagination-btn" type="button">Buscar</button>
        <button id="gestNameClearBtn" class="pagination-btn" type="button">Borrar</button>
      </div>
    `;
    const inp  = document.getElementById("gestNameInput");
    const f1   = document.getElementById("gestFromDate");
    const f2   = document.getElementById("gestToDate");
    const btnS = document.getElementById("gestNameSearchBtn");
    const btnC = document.getElementById("gestNameClearBtn");

    if (inp) inp.value = gestCriteria.nameQuery || "";
    if (f1)  f1.value  = gestCriteria.from || "";
    if (f2)  f2.value  = gestCriteria.to || "";

    if (btnS) btnS.addEventListener("click", () => {
      gestCriteria.nameQuery = inp?.value || "";
      gestCriteria.from = f1?.value || "";
      gestCriteria.to   = f2?.value || "";
      updateTicketsTab();
    });

    if (btnC) btnC.addEventListener("click", () => {
      if (inp) inp.value = "";
      if (f1) f1.value = "";
      if (f2) f2.value = "";
      gestCriteria.nameQuery = "";
      gestCriteria.from = "";
      gestCriteria.to   = "";
      updateTicketsTab();
    });

  } else if (mode === "id") {
    fieldsBox.innerHTML = `
      <div class="filters-row" style="gap:.5rem;margin-bottom:0%;">
        <input id="gestIdInput" class="filter-input" type="number" placeholder="ID (entero)" />
        <input type="date" id="gestFromDate" class="filter-input" title="Desde">
        <input type="date" id="gestToDate" class="filter-input" title="Hasta">
        <button id="gestIdSearchBtn" class="pagination-btn" type="button">Buscar</button>
        <button id="gestIdClearBtn"  class="pagination-btn" type="button">Borrar</button>
      </div>
    `;
    const idInp = document.getElementById("gestIdInput");
    const f1    = document.getElementById("gestFromDate");
    const f2    = document.getElementById("gestToDate");
    const btnS  = document.getElementById("gestIdSearchBtn");
    const btnC  = document.getElementById("gestIdClearBtn");

    if (idInp) idInp.value = gestCriteria.idQuery || "";
    if (f1)    f1.value   = gestCriteria.from || "";
    if (f2)    f2.value   = gestCriteria.to || "";

    if (btnS) btnS.addEventListener("click", () => {
      gestCriteria.idQuery = idInp?.value || "";
      gestCriteria.from    = f1?.value    || "";
      gestCriteria.to      = f2?.value    || "";
      updateTicketsTab();
    });
    if (btnC) btnC.addEventListener("click", () => {
      if(idInp) idInp.value = "";
      if(f1) f1.value = "";
      if(f2) f2.value = "";
      gestCriteria.idQuery = "";
      gestCriteria.from    = "";
      gestCriteria.to      = "";
      updateTicketsTab();
    });

  } else if (mode === "id-ticket") {
    // *** SIN FECHAS: solo campo ID Ticket + botones Buscar y Borrar ***
    fieldsBox.innerHTML = `
      <div class="filters-row" style="gap:.5rem;margin-bottom:0;">
        <input id="gestIdInput" class="filter-input" type="number" placeholder="ID Ticket (entero)" />
        <button id="gestIdSearchBtn" class="pagination-btn" type="button">Buscar</button>
        <button id="gestIdClearBtn"  class="pagination-btn" type="button">Borrar</button>
      </div>
    `;
    const idInp = document.getElementById("gestIdInput");
    const btnS  = document.getElementById("gestIdSearchBtn");
    const btnC  = document.getElementById("gestIdClearBtn");

    if (idInp) idInp.value = gestCriteria.idQuery || "";

    if (btnS) btnS.addEventListener("click", () => {
      gestCriteria.idQuery = idInp?.value || "";
      // limpiar fechas por si quedaron de otro modo
      gestCriteria.from = "";
      gestCriteria.to   = "";
      updateTicketsTab();
    });
    if (btnC) btnC.addEventListener("click", () => {
      if(idInp) idInp.value = "";
      gestCriteria.idQuery = "";
      gestCriteria.from = "";
      gestCriteria.to   = "";
      updateTicketsTab();
    });

  } else {
    fieldsBox.innerHTML = "";
  }
}

/* ====================== Wiring (DOMContentLoaded) ====================== */
document.addEventListener("DOMContentLoaded", () => {
  // TABS
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // TEMA
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) themeToggle.addEventListener("click", () => { appState.isDark = !appState.isDark; updateTheme(); });

  // PERFIL
  const profileToggle = document.getElementById("profileToggle");
  const profileDropdown = document.getElementById("profileDropdown");
  if (profileToggle && profileDropdown) {
    profileToggle.addEventListener("click", () => profileDropdown.classList.toggle("hidden"));
    document.addEventListener("click", (e) => {
      if (!profileDropdown.contains(e.target) && !profileToggle.contains(e.target)) {
        profileDropdown.classList.add("hidden");
      }
    });
  }

  // LOGOUT
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  // FORM CREAR
  const ticketForm = document.getElementById("ticketForm");
  if (ticketForm) {
    ticketForm.addEventListener("submit", (e) => {
      e.preventDefault();
      appState.ticketForm.usuario_id        = document.getElementById("usuarioSelect")?.value || "";
      appState.ticketForm.ministerio_id     = document.getElementById("ministerioSelect")?.value || "";
      appState.ticketForm.descripcion       = document.getElementById("descripcionInput")?.value?.trim() || "";
      appState.ticketForm.presupuesto       = document.getElementById("presupuestoInput")?.value || "";
      appState.ticketForm.fecha_inicio      = document.getElementById("fechaInicioInput")?.value || "";
      appState.ticketForm.fecha_vencimiento = document.getElementById("fechaVencimientoInput")?.value || "";
      appState.ticketForm.moneda            = document.getElementById("monedaSelect")?.value || "Q";
      createTicket();
    });
  }

  // Selector de modo (Crear)
  const crearMode = document.getElementById("crearUserSearchMode");
  if (crearMode) {
    crearMode.addEventListener("change", () => {
      renderCrearUserFields();
      updateUserForm();
      updateCreateButton();
    });
  }

  // Listener para inputs que afectan validación
  ["descripcionInput","presupuestoInput","fechaInicioInput","fechaVencimientoInput"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateCreateButton);
  });

  /* ===== Botones del recuadro seleccionado ===== */
  const addBtn = document.getElementById("addUserToListBtn");
  if (addBtn) addBtn.addEventListener("click", addCurrentCandidateToList);

  const changeBtn = document.getElementById("changeUserBtn");
  if (changeBtn) changeBtn.addEventListener("click", changeUserSelection);

  const addMoreBtn = document.getElementById("addMoreUsersBtn");
  if (addMoreBtn) addMoreBtn.addEventListener("click", addAnotherUser);

  /* ===== Historial: Buscar/Borrar ===== */
  const histSearchBtn = document.getElementById("histSearchBtn");
  const histClearBtn  = document.getElementById("histClearBtn");

  if (histSearchBtn) {
    histSearchBtn.addEventListener("click", () => {
      const ministerio = document.getElementById("ministerioFilter")?.value || "";
      const month = document.getElementById("monthFilter")?.value || "";
      const from = document.getElementById("histFromDate")?.value || "";
      const to = document.getElementById("histToDate")?.value || "";
      const user = document.getElementById("histUserSearch")?.value || "";

      histCriteria = { ministerio, month, from, to, user };
      histSearchActive = true;
      updateHistorialTab();
    });
  }

  if (histClearBtn) {
    histClearBtn.addEventListener("click", () => {
      const ministerioFilter = document.getElementById("ministerioFilter");
      const monthFilter = document.getElementById("monthFilter");
      const histFromDate = document.getElementById("histFromDate");
      const histToDate = document.getElementById("histToDate");
      const histUserSearch = document.getElementById("histUserSearch");

      if (ministerioFilter) ministerioFilter.value = "";
      if (monthFilter) monthFilter.value = "";
      if (histFromDate) histFromDate.value = "";
      if (histToDate) histToDate.value = "";
      if (histUserSearch) histUserSearch.value = "";

      histCriteria = { ministerio: "", month: "", from: "", to: "", user: "" };
      histSearchActive = false;
      updateHistorialTab();
    });
  }

  // MODAL EDICIÓN
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

  // MODAL REABRIR (historial)
  const reopenForm = document.getElementById("reopenForm");
  const reopenCloseBtn = document.getElementById("reopenCloseBtn");
  const reopenCancelBtn = document.getElementById("reopenCancelBtn");
  const reopenModalBackdrop = document.getElementById("reopenModalBackdrop");

  if (reopenForm) reopenForm.addEventListener("submit", reopenTicketSubmit);
  if (reopenCloseBtn) reopenCloseBtn.addEventListener("click", closeReopenModal);
  if (reopenCancelBtn) reopenCancelBtn.addEventListener("click", closeReopenModal);
  if (reopenModalBackdrop) {
    reopenModalBackdrop.addEventListener("click", (e) => {
      if (e.target === reopenModalBackdrop) closeReopenModal();
    });
  }

  // INIT
  updateTheme();
  loadAdminData();
});
