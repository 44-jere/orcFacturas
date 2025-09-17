/* =========================================================================
   Panel Administrador – Automatix Solutions
   Archivo: admin-script.js (SIN MODO DEMO)
   ========================================================================= */

/* ====================== Tema (detectar desde LocalStorage/DOM) ====================== */
function getInitialIsDark() {
  // Respeta el valor persistido por la otra página:
  try {
    const t = localStorage.getItem("automatix.theme");
    if (t === "light") return false;
    if (t === "dark") return true;
  } catch (e) {}
  // Fallback: clase aplicada por el anti-flash en <html>
  return document.documentElement.classList.contains("dark-theme");
}

/* ====================== Estado global ====================== */
let appState = {
  isDark: getInitialIsDark(), // ← inicializado según localStorage / clase del documento
  showProfile: false,
  showSidebar: false,
  // Pestaña inicial (se eliminó "dashboard")
  activeTab: "crear",
  users: [], // SIN DEMO
  tickets: [], // SIN DEMO
  historicalTickets: [], // SIN DEMO
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
  currentUserCandidateId: "", // id del usuario actualmente "seleccionado" (antes de agregar a lista)
  selectedUsersIds: [], // ids confirmados (máx 5)

  /* ====== NUEVO: total de usuarios desde API ====== */
  usersTotal: null, // se pobla con GET /admin/subordinados (campo "total")

  /* ====== NUEVO: búsqueda incremental ====== */
  searchTimeout: null,
  gestSearchTimeout: null, // debounce para "Gestionar → Nombre"
  histSearchTimeout: null, // debounce para "Historial → Nombre"            // timeout para debounce de búsqueda
  searchResults: [], // resultados de búsqueda incremental
};

/* ====== Filtros Gestionar ====== */
let gestCriteria = { mode: "", nameQuery: "", idQuery: "", from: "", to: "" };

/* ====== NUEVO: Filtros Historial (sistema igual a Gestionar) ====== */
let histAdvCriteria = {
  mode: "",
  nameQuery: "",
  idQuery: "",
  from: "",
  to: "",
};

/* ====================== Utilidades ====================== */
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = "notification";

  const colors = {
    success: {
      bg: "rgba(16, 185, 129, 0.2)",
      border: "rgba(16, 185, 129, 0.3)",
      text: "#6ee7b7",
    },
    error: {
      bg: "rgba(239, 68, 68, 0.2)",
      border: "rgba(239, 68, 68, 0.3)",
      text: "#fca5a5",
    },
    info: {
      bg: "rgba(59, 130, 246, 0.2)",
      border: "rgba(59, 130, 246, 0.3)",
      text: "#60a5fa",
    },
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
  // Re-resolver desde LocalStorage/clase HTML para que el tema SIEMPRE coincida
  appState.isDark = getInitialIsDark();

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

  // Re-render donde dependemos del tema (lista de usuarios en crear)
  renderSelectedUsersBox();
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
  const sidebarHistorialCount = document.getElementById(
    "sidebarHistorialCount"
  );
  if (sidebarTicketCount)
    sidebarTicketCount.textContent = appState.tickets.length;
  if (sidebarHistorialCount)
    sidebarHistorialCount.textContent = appState.historicalTickets.length;
}

function updateSidebarActiveState() {
  const navItems = document.querySelectorAll(".nav-item[data-tab]");
  navItems.forEach((item) => {
    if (item.dataset.tab === appState.activeTab) item.classList.add("active");
    else item.classList.remove("active");
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
    const activeCount = appState.tickets.filter(
      (t) => t.estado === "activo"
    ).length;
    const budget = appState.tickets.reduce(
      (sum, t) => sum + parseFloat(t.presupuesto || 0),
      0
    );

    if (totalTickets) totalTickets.textContent = appState.tickets.length;
    if (activeTickets) activeTickets.textContent = activeCount;

    // ===== ÚNICO CAMBIO: usar valor "total" del endpoint si está disponible =====
    const usersTotalValue =
      typeof appState.usersTotal === "number"
        ? appState.usersTotal
        : appState.users.length;
    if (totalUsers) totalUsers.textContent = usersTotalValue;

    if (totalBudget) totalBudget.textContent = `Q${formatCurrency(budget)}`;
    if (ticketCount) ticketCount.textContent = appState.tickets.length;
    if (historialCount)
      historialCount.textContent = appState.historicalTickets.length;
  }
  updateSidebarBadges();
}

function generateDashboardStats() {
  const totalTicketsCreated =
    appState.tickets.length + appState.historicalTickets.length;
  const totalBudgetAssigned = appState.tickets.reduce(
    (sum, t) => sum + parseFloat(t.presupuesto || 0),
    0
  );
  const totalSpentAmount = [
    ...appState.tickets,
    ...appState.historicalTickets,
  ].reduce((sum, t) => sum + parseFloat(t.gastado || 0), 0);
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
      const count = [...appState.tickets, ...appState.historicalTickets].filter(
        (t) => String(t.id).startsWith(codigo)
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

  if (dashTotalTickets)
    dashTotalTickets.textContent = stats.totalTicketsCreated;
  if (dashTotalSpent)
    dashTotalSpent.textContent = `Q${formatCurrency(stats.totalSpentAmount)}`;
  if (dashAvgTicket)
    dashAvgTicket.textContent = `Q${formatCurrency(stats.avgTicketBudget)}`;
  if (statusActive) statusActive.textContent = stats.activeTickets;
  if (statusCompleted) statusCompleted.textContent = stats.completedTickets;

  updateMinisterioStats();
}

/* ====================== BÚSQUEDA INCREMENTAL API ====================== */
async function searchUsersIncremental(query) {
  if (!query || query.length < 2) {
    appState.searchResults = [];
    return [];
  }

  try {
    // ▶️ Usar /buscarUsuario con parámetro ?nombre=
    const response = await fetch(
      `http://localhost:8080/admin/subordinados/buscarUsuario?nombre=${encodeURIComponent(
        query
      )}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      }
    );

    if (response.ok) {
      const data = await response.json();
      appState.searchResults = data.items || [];
      return appState.searchResults;
    } else {
      console.error("Error en búsqueda incremental:", response.status);
      return [];
    }
  } catch (error) {
    console.error("Error en búsqueda incremental:", error);
    return [];
  }
}

async function searchUserById(userId) {
  if (!userId || isNaN(parseInt(userId))) {
    return null;
  }

  try {
    const response = await fetch(
      `http://localhost:8080/admin/subordinados/buscarUsuario?id=${encodeURIComponent(
        userId
      )}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.items && data.items.length > 0 ? data.items[0] : null;
    } else {
      console.error("Error en búsqueda por ID:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Error en búsqueda por ID:", error);
    return null;
  }
}

/* ====================== Normalización y match por prefijos (tokens) ====================== */
/* — NO cambia nada de UX. Solo utilidades para que “empleado a” filtre a “Empleado Ana”, etc. */
function norm(s) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokensPrefixMatch(query, name) {
  const qTokens = norm(query).split(/\s+/).filter(Boolean);
  const nTokens = norm(name).split(/\s+/).filter(Boolean);
  if (!qTokens.length) return true;
  // cada token del query debe ser prefijo del token correspondiente del nombre
  for (let i = 0; i < qTokens.length; i++) {
    if (i >= nTokens.length) return false;
    if (!nTokens[i].startsWith(qTokens[i])) return false;
  }
  return true;
}

/* ====================== Crear Ticket (form) ====================== */
function updateUserForm() {
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

function handleUserSelect(userId, userData = null) {
  let user = userData;
  if (!user && userId) {
    // Si no se proporciona userData, buscar en searchResults
    user = appState.searchResults.find(
      (u) => String(u.id_usuario) === String(userId)
    );
  }

  const userInfo = document.getElementById("userInfo");
  const userEmail = document.getElementById("userEmail");
  const userCargo = document.getElementById("userCargo");
  const userMinisterios = document.getElementById("userMinisterios");
  const ministerioSelect = document.getElementById("ministerioSelect");

  appState.ticketForm.usuario_id = userId;

  if (user && userInfo) {
    userInfo.classList.remove("hidden");
    if (userEmail) userEmail.textContent = user.correo;
    if (userCargo) userCargo.textContent = user.rol;
    if (userMinisterios) userMinisterios.textContent = user.ministerio;

    if (ministerioSelect) {
      ministerioSelect.disabled = false;
      ministerioSelect.innerHTML =
        '<option value="">Seleccionar ministerio...</option>';

      // Como la API devuelve solo un ministerio por usuario, agregamos esa opción
      const option = document.createElement("option");
      option.value = user.id_usuario; // Usamos el id del usuario como valor temporal
      option.textContent = user.ministerio;
      ministerioSelect.appendChild(option);
    }
  } else if (userInfo) {
    userInfo.classList.add("hidden");
    if (ministerioSelect) {
      ministerioSelect.disabled = true;
      ministerioSelect.innerHTML =
        '<option value="">Primero selecciona un usuario</option>';
    }
  }

  hideMinisterioInfo();
}

/* === Helper genérico para dropdown incremental en otros módulos === */
function createIncrementalDropdown(
  dropdownId,
  results,
  inputElement,
  onSelect
) {
  // Remover dropdown existente con ese id
  const existing = document.getElementById(dropdownId);
  if (existing) existing.remove();

  if (!results || results.length === 0) return;

  const dropdown = document.createElement("div");
  dropdown.id = dropdownId;
  dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 6px;
    background: ${
      appState.isDark ? "rgba(17, 24, 39, 0.98)" : "rgba(255, 255, 255, 0.98)"
    };
    color: ${appState.isDark ? "#e5e7eb" : "#111827"};
    border: 1px solid ${
      appState.isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(17, 24, 39, 0.12)"
    };
    border-radius: 10px;
    max-height: 240px;
    overflow-y: auto;
    z-index: 2000;
    box-shadow: 0 10px 24px rgba(0,0,0,0.25);
    backdrop-filter: blur(6px);
  `;

  results.forEach((user) => {
    const option = document.createElement("div");
    option.style.cssText = `
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
      transition: background-color 0.2s;
    `;
    option.textContent = user.nombre;

    option.addEventListener("mouseenter", () => {
      option.style.backgroundColor = "var(--hover-bg)";
    });
    option.addEventListener("mouseleave", () => {
      option.style.backgroundColor = "transparent";
    });
    option.addEventListener("click", () => {
      onSelect(user);
      dropdown.remove();
    });

    dropdown.appendChild(option);
  });

  // Posicionar y adjuntar
  const inputContainer = inputElement.parentElement;
  inputContainer.style.position = "relative";
  inputContainer.appendChild(dropdown);

  // Cerrar al hacer clic fuera
  setTimeout(() => {
    document.addEventListener("click", function close(e) {
      if (!dropdown.contains(e.target) && e.target !== inputElement) {
        dropdown.remove();
        document.removeEventListener("click", close);
      }
    });
  }, 0);
}

/* === *** NUEVO: Dropdown incremental específico para “Crear → Nombre” *** === */
function createUserDropdown(results, inputElement) {
  // Quitar el dropdown previo
  const existing = document.getElementById("userSearchDropdown");
  if (existing) existing.remove();

  if (!results || results.length === 0) return;

  const dropdown = document.createElement("div");
  dropdown.id = "userSearchDropdown";
  dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 6px;
    background: ${
      appState.isDark ? "rgba(17, 24, 39, 0.98)" : "rgba(255, 255, 255, 0.98)"
    };
    color: ${appState.isDark ? "#e5e7eb" : "#111827"};
    border: 1px solid ${
      appState.isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(17, 24, 39, 0.12)"
    };
    border-radius: 10px;
    max-height: 240px;
    overflow-y: auto;
    z-index: 2000;
    box-shadow: 0 10px 24px rgba(0,0,0,0.25);
    backdrop-filter: blur(6px);
  `;

  results.forEach((user) => {
    const option = document.createElement("div");
    option.style.cssText = `
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
      transition: background-color 0.2s;
    `;
    option.textContent = user.nombre;

    option.addEventListener("mouseenter", () => {
      option.style.backgroundColor = "var(--hover-bg)";
    });
    option.addEventListener("mouseleave", () => {
      option.style.backgroundColor = "transparent";
    });
    option.addEventListener("click", () => {
      const hiddenId = document.getElementById("usuarioSelect");
      if (inputElement) inputElement.value = user.nombre || "";
      if (hiddenId) hiddenId.value = user.id_usuario || "";
      handleUserSelect(user.id_usuario, user);
      updateCreateButton();

      // ➕ Mostrar también el recuadro de “Usuario seleccionado” (sin bloquear campos)
      showSelectedUserBox(user.id_usuario);

      dropdown.remove();
    });

    dropdown.appendChild(option);
  });

  // Posicionar y adjuntar
  const inputContainer = inputElement.parentElement;
  inputContainer.style.position = "relative";
  inputContainer.appendChild(dropdown);

  // Cerrar al hacer clic fuera
  setTimeout(() => {
    document.addEventListener("click", function close(e) {
      if (!dropdown.contains(e.target) && e.target !== inputElement) {
        dropdown.remove();
        document.removeEventListener("click", close);
      }
    });
  }, 0);
}

/* === Gestionar → Nombre: input incremental === */
async function onGestNameInput() {
  const input = document.getElementById("gestNameInput");
  if (!input) return;
  const query = input.value.trim();

  if (appState.gestSearchTimeout) clearTimeout(appState.gestSearchTimeout);

  if (!query) {
    const dd = document.getElementById("gestNameDropdown");
    if (dd) dd.remove();
    gestCriteria.nameQuery = "";
    updateTicketsTab();
    return;
  }

  appState.gestSearchTimeout = setTimeout(async () => {
    const raw = await searchUsersIncremental(query);
    // === filtro progresivo por tokens (prefijos)
    const filtered = raw.filter((u) => tokensPrefixMatch(query, u.nombre));
    createIncrementalDropdown("gestNameDropdown", filtered, input, (user) => {
      input.value = user.nombre;
      gestCriteria.nameQuery = user.nombre; // usamos el nombre seleccionado
      updateTicketsTab();
    });
  }, 300);
}

/* === Historial → Nombre: input incremental === */
async function onHistNameInput() {
  const input = document.getElementById("histNameInputAdv");
  if (!input) return;
  const query = input.value.trim();

  if (appState.histSearchTimeout) clearTimeout(appState.histSearchTimeout);

  if (!query) {
    const dd = document.getElementById("histNameDropdown");
    if (dd) dd.remove();
    histAdvCriteria.nameQuery = "";
    updateHistorialTab();
    return;
  }

  appState.histSearchTimeout = setTimeout(async () => {
    const raw = await searchUsersIncremental(query);
    // === filtro progresivo por tokens (prefijos)
    const filtered = raw.filter((u) => tokensPrefixMatch(query, u.nombre));
    createIncrementalDropdown("histNameDropdown", filtered, input, (user) => {
      input.value = user.nombre;
      histAdvCriteria.nameQuery = user.nombre; // usamos el nombre seleccionado
      updateHistorialTab();
    });
  }, 300);
}

async function onUserSearchInput() {
  const input = document.getElementById("usuarioSearchInput");
  const hiddenId = document.getElementById("usuarioSelect");
  if (!input || !hiddenId) return;

  const query = input.value.trim();

  // Limpiar timeout anterior
  if (appState.searchTimeout) {
    clearTimeout(appState.searchTimeout);
  }

  // Si el input está vacío, limpiar todo
  if (!query) {
    hiddenId.value = "";
    handleUserSelect("");
    const dropdown = document.getElementById("userSearchDropdown");
    if (dropdown) dropdown.remove();
    updateCreateButton();
    return;
  }

  // Debounce la búsqueda
  appState.searchTimeout = setTimeout(async () => {
    const raw = await searchUsersIncremental(query);
    // === filtro progresivo por tokens (prefijos) para “Crear”
    const results = raw.filter((u) => tokensPrefixMatch(query, u.nombre));
    createUserDropdown(results, input);
  }, 300);
}

/* === NUEVO: Enter en buscador por nombre → mostrar recuadro (sin bloquear) === */
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
async function onUserIdSearchClick() {
  const inp = document.getElementById("usuarioIdInput");
  const hiddenId = document.getElementById("usuarioSelect");
  if (!inp || !hiddenId) return;

  const raw = inp.value?.trim();
  const idNum = Number(raw);
  if (!Number.isInteger(idNum)) {
    showNotification("El ID debe ser un número entero", "error");
    return;
  }

  const user = await searchUserById(idNum);
  if (!user) {
    showNotification("No se encontró un usuario con ese ID", "error");
    hiddenId.value = "";
    handleUserSelect("");
    updateCreateButton();
    return;
  }

  hiddenId.value = user.id_usuario;
  handleUserSelect(user.id_usuario, user);

  // guardar en cache para que el recuadro lo encuentre
  appState.searchResults = [
    user,
    ...appState.searchResults.filter(
      (u) => String(u.id_usuario) !== String(user.id_usuario)
    ),
  ];

  updateCreateButton();

  /* Mostrar recuadro (no bloquear campos) */
  showSelectedUserBox(user.id_usuario);
}

/* ====================== NUEVO: Recuadro selección & lista ====================== */
function lockUserSelectionFields(lock = true) {
  // ⚠️ Ya no bloqueamos campos: mantenemos la función por compatibilidad, pero sin efectos.
  const modeSel = document.getElementById("crearUserSearchMode");
  const nameInp = document.getElementById("usuarioSearchInput");
  const idInp = document.getElementById("usuarioIdInput");
  const idBtn = document.getElementById("usuarioIdSearchBtn");
  // sin-op para no bloquear; dejamos los elementos habilitados
  if (modeSel) modeSel.disabled = false;
  if (nameInp) nameInp.disabled = false;
  if (idInp) idInp.disabled = false;
  if (idBtn) idBtn.disabled = false;
}

function getUserByIdSafe(id) {
  // Buscar primero en searchResults (datos más recientes de la API)
  const fromSearch = appState.searchResults.find(
    (u) => String(u.id_usuario) === String(id)
  );
  if (fromSearch) return fromSearch;

  // Fallback a users (si existe)
  return appState.users.find((u) => String(u.id) === String(id)) || null;
}

function showSelectedUserBox(userId) {
  const user = getUserByIdSafe(userId);
  if (!user) {
    showNotification("Usuario no válido", "error");
    return;
  }
  appState.currentUserCandidateId = String(user.id_usuario || user.id);

  const box = document.getElementById("selectedUserCard");
  const selectedUserName = document.getElementById("selectedUserName");
  const selectedUserCargo = document.getElementById("selectedUserCargo");
  const selectedUserId = document.getElementById("selectedUserId");

  if (selectedUserName) selectedUserName.textContent = user.nombre;
  if (selectedUserCargo) selectedUserCargo.textContent = user.rol || user.cargo;
  if (selectedUserId) selectedUserId.textContent = user.id_usuario || user.id;

  if (box) box.classList.remove("hidden");

  // ❌ Ya NO bloqueamos campos al seleccionar
  // lockUserSelectionFields(true);

  renderSelectedUsersList();
}

function removeUserFromList(uid) {
  const i = appState.selectedUsersIds.findIndex(
    (x) => String(x) === String(uid)
  );
  if (i !== -1) {
    appState.selectedUsersIds.splice(i, 1);
    renderSelectedUsersBox();
    const addMoreBtn = document.getElementById("addMoreUsersBtn");
    if (addMoreBtn) addMoreBtn.disabled = appState.selectedUsersIds.length >= 5;
  }
}

function clearSelectedUsersList() {
  appState.selectedUsersIds = [];
  renderSelectedUsersBox();
  const addMoreBtn = document.getElementById("addMoreUsersBtn");
  if (addMoreBtn) addMoreBtn.disabled = false;
}

function renderSelectedUsersList() {
  const listEl = document.getElementById("selectedUsersList");
  if (!listEl) return;

  // ====== Ajuste de estilo SOLO para la lista según el tema actual ======
  const isDark = appState.isDark;
  const cardBg = isDark ? "rgba(31,41,55,0.9)" : "#ddd6fe"; // oscuro vs violeta claro (violet-200)
  const borderCol = isDark ? "rgba(148,163,184,0.25)" : "#c4b5fd"; // slate-300-ish vs violet-300
  const trashColor = isDark ? "#ffffff" : "#4c1d95"; // blanco en dark, violeta oscuro en light

  const items = appState.selectedUsersIds.map((uid, idx) => {
    const u = getUserByIdSafe(uid);
    const nombre = u ? u.nombre : `Usuario ${uid}`;
    const cargo = u ? u.rol || u.cargo || "" : "";
    const idTxt = u ? u.id_usuario || u.id : uid;

    // Tarjeta de cada usuario + ícono de basurero (inline SVG)
    return `
      <li class="selected-user-item" style="
        display:flex;align-items:center;justify-content:space-between;
        padding:10px 12px;margin:8px 0;border:1px solid ${borderCol};
        border-radius:10px;background:${cardBg};
        backdrop-filter:blur(6px);
      ">
        <div style="display:flex;gap:10px;align-items:center;color:${
          isDark ? "#e5e7eb" : "#1f2937"
        };">
          <div style="
            width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;
            font-weight:600;border:1px solid ${borderCol}; color:${
      isDark ? "#e5e7eb" : "#1f2937"
    };
            background:${isDark ? "rgba(17,24,39,0.6)" : "#ede9fe"};
          ">${idx + 1}</div>
          <div>
            <div style="font-weight:600;">${nombre}</div>
            <div style="font-size:.85rem;opacity:.85;">${cargo} · ID ${idTxt}</div>
          </div>
        </div>
        <button title="Eliminar" onclick="removeUserFromList('${uid}')" style="
          background:transparent;border:none;cursor:pointer;padding:6px;border-radius:8px;color:${trashColor};
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </li>
    `;
  });

  listEl.innerHTML =
    items.join("") ||
    `<li class="selected-user-item empty">No hay usuarios en la lista</li>`;
}

function renderSelectedUsersBox() {
  const box = document.getElementById("selectedUserCard");
  const listBlock = document.getElementById("selectedUsersBlock");
  if (!box) return;

  if (
    !appState.currentUserCandidateId &&
    appState.selectedUsersIds.length === 0
  ) {
    box.classList.add("hidden");
    if (listBlock) listBlock.classList.add("hidden");
    // No bloqueo de campos
    lockUserSelectionFields(false);
    return;
  }

  box.classList.remove("hidden");

  if (appState.selectedUsersIds.length > 0) {
    if (listBlock) {
      listBlock.classList.remove("hidden");
      // pequeño “recuadro” visual para la lista (violeta claro en modo claro)
      listBlock.style.cssText = `
        margin-top:10px;padding:12px;border:1px solid ${
          appState.isDark ? "rgba(148,163,184,0.25)" : "#c4b5fd"
        };
        border-radius:12px;background:${
          appState.isDark ? "rgba(2,6,23,0.55)" : "#ede9fe"
        };
        box-shadow:0 8px 20px rgba(0,0,0,.15)
      `;
    }
    renderSelectedUsersList();
  } else {
    if (listBlock) listBlock.classList.add("hidden");
  }
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
  renderSelectedUsersBox();

  // Permitir agregar más
  const addMoreBtn = document.getElementById("addMoreUsersBtn");
  if (addMoreBtn) addMoreBtn.disabled = appState.selectedUsersIds.length >= 5;
}

/* Cambiar usuario actual (ya no se usa para bloquear, se mantiene por compatibilidad) */
function changeUserSelection() {
  appState.currentUserCandidateId = "";
  // No bloquear / desbloquear: sin-op
  // limpiar inputs de búsqueda para evitar confusión
  const hiddenId = document.getElementById("usuarioSelect");
  const inputNombre = document.getElementById("usuarioSearchInput");
  const inputId = document.getElementById("usuarioIdInput");
  if (hiddenId) hiddenId.value = "";
  if (inputNombre) inputNombre.value = "";
  if (inputId) inputId.value = "";

  // Ocultar el recuadro de usuario seleccionado pero mantener la lista
  const box = document.getElementById("selectedUserCard");
  if (box) box.classList.add("hidden");

  renderSelectedUsersBox();
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
        placeholder="Buscar usuario por nombre..."
        autocomplete="off"
        required
      />
      <input type="hidden" id="usuarioSelect" value="" />
    `;
    const userSearch = document.getElementById("usuarioSearchInput");
    if (userSearch) {
      userSearch.addEventListener("input", onUserSearchInput);
      userSearch.addEventListener("keydown", onUserSearchEnter); // Enter → recuadro
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

  // Mantener recuadro visible si corresponde (y NO bloquear campos)
  renderSelectedUsersBox();
  lockUserSelectionFields(false);
}

function handleMinisterioSelect(ministerioId) {
  const user = appState.users.find(
    (u) => u.id === appState.ticketForm.usuario_id
  );
  const ministerio = user?.ministerios_asignados.find(
    (m) => m.id === ministerioId
  );
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

  // === Lee valores actuales del DOM ===
  const desc = (
    document.getElementById("descripcionInput")?.value || ""
  ).trim();
  const presRaw = document.getElementById("presupuestoInput")?.value ?? "";
  const fi = document.getElementById("fechaInicioInput")?.value || "";
  const fv = document.getElementById("fechaVencimientoInput")?.value || "";
  const hiddenUid = document.getElementById("usuarioSelect")?.value || "";

  // si permites desc vacía, pon const hasDesc = true; (o deja la regla estricta)
  const hasDesc = true; // <- cambia a `(desc.length > 0)` si quieres obligatoria

  const presOk =
    presRaw !== "" && !isNaN(Number(presRaw)) && Number(presRaw) >= 0;
  const anyUser =
    (appState.selectedUsersIds && appState.selectedUsersIds.length > 0) ||
    !!appState.currentUserCandidateId ||
    !!hiddenUid;

  const isValid = anyUser && hasDesc && presOk && !!fi && !!fv;

  // === Habilita/Deshabilita de verdad el botón ===
  createBtn.disabled = !isValid || appState.creating;

  // “fuerza” visual por si el CSS no respeta :disabled
  if (createBtn.disabled) {
    createBtn.classList.add("btn-disabled");
    createBtn.setAttribute("aria-disabled", "true");
    createBtn.style.pointerEvents = "none";
  } else {
    createBtn.classList.remove("btn-disabled");
    createBtn.removeAttribute("aria-disabled");
    createBtn.style.pointerEvents = "";
  }

  // loading / iconos
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
  // Validación mínima de formulario
  const anyUser =
    appState.selectedUsersIds.length > 0
      ? true
      : appState.currentUserCandidateId || appState.ticketForm.usuario_id;

  if (
    !anyUser ||
    !appState.ticketForm.presupuesto || // → monto_presupuestado
    !appState.ticketForm.fecha_inicio || // → fecha_inicio (YYYY-MM-DD)
    !appState.ticketForm.fecha_vencimiento // → fecha_fin (YYYY-MM-DD)
  ) {
    showNotification("Completa los campos requeridos", "error");
    return;
  }

  appState.creating = true;
  updateCreateButton();

  try {
    // Determinar a quién crearle el/los ticket(s)
    let targetUserIds = [];
    if (appState.selectedUsersIds.length > 0) {
      targetUserIds = [...appState.selectedUsersIds];
    } else if (appState.currentUserCandidateId) {
      targetUserIds = [appState.currentUserCandidateId];
    } else if (appState.ticketForm.usuario_id) {
      targetUserIds = [appState.ticketForm.usuario_id];
    }

    const createdLocally = [];

    // Un POST por cada usuario (tu backend solo acepta uno por uno)
    for (const uid of targetUserIds) {
      const payload = {
        id_usuario_beneficiario: Number(uid),
        monto_presupuestado: Number(appState.ticketForm.presupuesto),
        total_gastado: 0, // o Number(appState.ticketForm.total_gastado) si luego agregas ese campo al form
        fecha_inicio: appState.ticketForm.fecha_inicio, // "YYYY-MM-DD"
        fecha_fin: appState.ticketForm.fecha_vencimiento, // "YYYY-MM-DD"
        descripcion_ticket: (appState.ticketForm.descripcion ?? "")
          .toString()
          .trim(), // puede ser ""
      };

      const resp = await fetch("http://localhost:8080/admin/crearTicket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(
          `Error al crear ticket para usuario ${uid}: HTTP ${resp.status} ${errText}`
        );
      }

      // Estructura de respuesta: ajusta según lo que devuelva tu API.
      // Ejemplos posibles:
      //   { item: { id_ticket, ... } }  ó  { id_ticket: 123, ... }
      const data = await resp.json().catch(() => ({}));
      const idTicket =
        data?.item?.id_ticket ?? data?.id_ticket ?? getNextTicketId(); // fallback si no viene

      // Pinta tarjeta local (UI) — campos que usa tu frontend
      const selectedUser = getUserByIdSafe(uid);
      createdLocally.push({
        id: idTicket, // <- tu UI usa 'id'
        usuario_asignado: selectedUser?.nombre || `ID ${uid}`,
        ministerio: selectedUser?.ministerio || "",
        descripcion: appState.ticketForm.descripcion || "",
        presupuesto: Number(appState.ticketForm.presupuesto),
        gastado: 0,
        fecha_creacion: new Date().toLocaleDateString("es-GT"),
        fecha_inicio: appState.ticketForm.fecha_inicio,
        fecha_vencimiento: appState.ticketForm.fecha_vencimiento,
        estado: "activo",
      });
    }

    // Actualiza estado/UI
    for (const t of createdLocally) appState.tickets.push(t);
    clearTicketForm();
    updateStats();
    updateDashboard();
    updateTicketsTab();

    showNotification(
      createdLocally.length === 1
        ? `Ticket ${createdLocally[0].id} creado exitosamente`
        : `Se crearon ${createdLocally.length} tickets`,
      "success"
    );
  } catch (err) {
    console.error(err);
    showNotification(err.message || "Error al crear el/los ticket(s)", "error");
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

  // Limpiar dropdown de búsqueda si existe
  const dropdown = document.getElementById("userSearchDropdown");
  if (dropdown) dropdown.remove();

  // Recuadro
  renderSelectedUsersBox();

  const ministerioSelect = document.getElementById("ministerioSelect");
  const monedaSelect = document.getElementById("monedaSelect");

  if (ministerioSelect) {
    ministerioSelect.value = "";
    ministerioSelect.disabled = true;
    ministerioSelect.innerHTML =
      '<option value="">Primero selecciona un usuario</option>';
  }
  if (monedaSelect) monedaSelect.value = "Q";

  hideMinisterioInfo();
  const userInfo = document.getElementById("userInfo");
  if (userInfo) userInfo.classList.add("hidden");

  // no bloqueo
  lockUserSelectionFields(false);
}

/* ====================== Gestión de Tickets ====================== */
function createTicketCard(ticket) {
  const presupuesto = parseFloat(ticket.presupuesto || 0);
  const gastado = parseFloat(ticket.gastado || 0);

  const usedRatio = presupuesto > 0 ? gastado / presupuesto : 0;
  const usedPct = isFinite(usedRatio) ? usedRatio * 100 : 0;

  const available = Math.max(0, presupuesto - gastado);
  const excess = Math.max(0, gastado - presupuesto);
  const excessRatio = presupuesto > 0 ? excess / presupuesto : 0;
  const excessPct = isFinite(excessRatio) ? excessRatio * 100 : 0;

  return `
    <div class="ticket-card">
      <div class="ticket-header">
        <div>
          <h3 class="ticket-title">${ticket.id}</h3>
          <p class="ticket-ministry">${ticket.ministerio}</p>
          <p class="ticket-assigned">Asignado a: ${ticket.usuario_asignado}</p>
        </div>
        <span class="ticket-status ${
          ticket.estado === "activo" ? "status-active" : "status-completed"
        }">
          ${ticket.estado === "activo" ? "Activo" : "Completado"}
        </span>
      </div>

      <p class="ticket-description">${ticket.descripcion}</p>

      <div class="ticket-budget">
        <div class="budget-row">
          <span class="budget-label">Presupuesto</span>
          <span class="budget-amount budget-total">Q${formatCurrency(
            presupuesto
          )}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">Gastado</span>
          <span class="budget-amount budget-spent">Q${formatCurrency(
            gastado
          )}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">${
            excess > 0 ? "Exceso" : "Disponible"
          }</span>
          <span class="budget-amount ${
            excess > 0 ? "savings-negative" : "budget-available"
          }">
            ${
              excess > 0
                ? `Q${formatCurrency(excess)}`
                : `Q${formatCurrency(available)}`
            }
          </span>
        </div>

        <div class="budget-progress" title="Uso del presupuesto">
          <div class="budget-fill" style="width: ${Math.min(
            usedPct,
            100
          )}%"></div>
        </div>
        <p class="budget-percentage">
          ${
            isFinite(usedPct) ? Math.min(usedPct, 100).toFixed(1) : "0.0"
          }% utilizado
        </p>

        ${
          excess > 0
            ? `
          <div class="excess-progress" title="Exceso sobre el presupuesto">
            <div class="excess-fill" style="width: ${Math.min(
              excessPct,
              100
            )}%"></div>
          </div>
          <p class="excess-text">Exceso: Q${formatCurrency(
            excess
          )} (${excessPct.toFixed(1)}%)</p>
        `
            : ``
        }
      </div>

      <div class="ticket-dates">
        <span>Creado: ${ticket.fecha_creacion}</span>
        <span>Vence: ${ticket.fecha_vencimiento}</span>
      </div>

      <div class="ticket-actions">
        <button class="action-btn secondary" onclick="editTicket('${
          ticket.id
        }')">Editar</button>
        <button class="action-btn primary" onclick="viewExpenses('${
          ticket.id
        }')">Ver Gastos</button>
        <button class="action-btn danger" onclick="deleteTicket('${
          ticket.id
        }')">Eliminar</button>
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
    end.setHours(23, 59, 59, 999);
  }

  if (mode === "nombre") {
    const q = (gestCriteria.nameQuery || "").toLowerCase();
    if (q) {
      list = list.filter((t) =>
        (t.usuario_asignado || "").toLowerCase().includes(q)
      );
    }
    // aplicar fecha si viene
    if (from || end) {
      list = list.filter((t) => {
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
      list = list.filter((t) => {
        const n = Number(t.id);
        return Number.isFinite(n) && n === idQ;
      });
    } else {
      list = [];
    }
    // aplicar fecha si viene
    if (from || end) {
      list = list.filter((t) => {
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
      list = list.filter((t) => {
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
  const usedPct = isFinite(usedRatio) ? usedRatio * 100 : 0;

  const difference = presupuesto - gastado; // + ahorro, - exceso
  const excess = Math.max(0, -difference);
  const excessRatio = presupuesto > 0 ? excess / presupuesto : 0;
  const excessPct = isFinite(excessRatio) ? excessRatio * 100 : 0;

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
          <span class="budget-amount budget-total">Q${formatCurrency(
            presupuesto
          )}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">Total gastado</span>
          <span class="budget-amount budget-spent">Q${formatCurrency(
            gastado
          )}</span>
        </div>
        <div class="budget-row">
          <span class="budget-label">${
            difference > 0 ? "Ahorro" : "Exceso"
          }</span>
          <span class="budget-amount ${
            difference > 0 ? "savings-positive" : "savings-negative"
          }">
            Q${formatCurrency(Math.abs(difference))}
          </span>
        </div>

        <div class="budget-progress" title="Uso del presupuesto">
          <div class="budget-fill" style="width: ${Math.min(
            usedPct,
            100
          )}%"></div>
        </div>
        <p class="budget-percentage">${Math.min(usedPct, 100).toFixed(
          1
        )}% del presupuesto</p>

        ${
          difference < 0
            ? `
          <div class="excess-progress" title="Exceso sobre el presupuesto">
            <div class="excess-fill" style="width: ${Math.min(
              (Math.abs(difference) / presupuesto) * 100,
              100
            )}%"></div>
          </div>
          <p class="excess-text">Exceso: Q${formatCurrency(
            Math.abs(difference)
          )} (${((Math.abs(difference) / presupuesto) * 100).toFixed(1)}%)</p>
        `
            : ``
        }
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
          <span class="date-value date-completed">${
            ticket.fecha_completado
          }</span>
        </div>
      </div>

      <div class="ticket-actions">
        <button class="action-btn primary" onclick="viewDetails('${
          ticket.id
        }')">Ver Detalles</button>
        <button class="action-btn secondary" onclick="openReopenModal('${
          ticket.id
        }')">Reabrir</button>
      </div>
    </div>
  `;
}

function updateHistorialTab() {
  const noHistorial = document.getElementById("noHistorial");
  const historialContainer = document.getElementById("historialContainer");

  let list = [...appState.historicalTickets];

  // ====== Sistema de búsqueda (solo avanzado, igual a Gestionar) ======
  const hMode = (histAdvCriteria.mode || "").trim();
  const hFrom = histAdvCriteria.from ? new Date(histAdvCriteria.from) : null;
  const hTo = histAdvCriteria.to ? new Date(histAdvCriteria.to) : null;
  let hEnd = null;
  if (hTo) {
    hEnd = new Date(hTo);
    hEnd.setHours(23, 59, 59, 999);
  }

  if (hMode === "nombre") {
    const q = (histAdvCriteria.nameQuery || "").toLowerCase();
    if (q) {
      list = list.filter((t) =>
        (t.usuario_asignado || "").toLowerCase().includes(q)
      );
    }
    if (hFrom || hEnd) {
      list = list.filter((t) => {
        const dt = ddmmy_to_Date(t.fecha_completado);
        if (!dt) return false;
        if (hFrom && dt < hFrom) return false;
        if (hEnd && dt > hEnd) return false;
        return true;
      });
    }
  } else if (hMode === "id") {
    const idQ = parseInt(histAdvCriteria.idQuery, 10);
    if (!isNaN(idQ)) {
      list = list.filter((t) => Number(t.id) === idQ);
    } else {
      list = [];
    }
    if (hFrom || hEnd) {
      list = list.filter((t) => {
        const dt = ddmmy_to_Date(t.fecha_completado);
        if (!dt) return false;
        if (hFrom && dt < hFrom) return false;
        if (hEnd && dt > hEnd) return false;
        return true;
      });
    }
  } else if (hMode === "id-ticket") {
    const idQ = parseInt(histAdvCriteria.idQuery, 10);
    if (!isNaN(idQ)) {
      list = list.filter((t) => Number(t.id) === idQ);
    } else {
      list = [];
    }
    // Importante: sin fechas en id-ticket
  } else {
    // sin filtro adicional
  }

  if (!list.length) {
    if (noHistorial) noHistorial.classList.remove("hidden");
    if (historialContainer) historialContainer.classList.add("hidden");
    return;
  }

  if (noHistorial) noHistorial.classList.add("hidden");
  if (historialContainer) {
    historialContainer.classList.remove("hidden");
    historialContainer.innerHTML = list
      .map((t) => createHistorialCard(t))
      .join("");
  }
}

/* ====================== Acciones ====================== */
async function deleteTicket(ticketId) {
  if (!confirm("¿Estás seguro de eliminar este ticket?")) return;

  try {
    appState.tickets = appState.tickets.filter(
      (t) => String(t.id) !== String(ticketId)
    );
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
    showNotification(
      "Completa la nueva fecha de vencimiento y la razón de reapertura",
      "error"
    );
    return;
  }

  const idx = appState.historicalTickets.findIndex(
    (t) => String(t.id) === String(reopeningTicketId)
  );
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
      credentials: "include",
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
    renderCrearUserFields(); // muestra el modo elegido y respeta recuadro si ya existía
    updateUserForm();
    updateCreateButton();
  } else if (tabName === "gestionar") {
    populateUserFilters();
    setupGestionarDynamicFields();
    updateTicketsTab();
  } else if (tabName === "historial") {
    populateUserFilters(); // también para historial
    setupHistorialDynamicFields(); // sistema avanzado
    updateHistorialTab();
  } else if (tabName === "usuarios-asignados") {
    // Mantener comportamiento existente: cargar y renderizar tabla
    fetchAndRenderAssignedUsers();
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
    /* ========= ÚNICO GET requerido: total de usuarios ========= */
    const resp = await fetch("http://localhost:8080/admin/subordinados", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && typeof data.total !== "undefined") {
        appState.usersTotal = Number(data.total) || 0;
      }
    }
    /* ========================================================== */

    // (Espacio para más cargas reales si se requieren)
  } catch (e) {
    console.error("Error cargando datos:", e);
    showNotification("No se pudieron cargar los datos iniciales", "error");
  } finally {
    appState.loading = false;
    updateStats();
    updateDashboard();
    populateUserFilters();
    setupGestionarDynamicFields();
    setupHistorialDynamicFields(); // NUEVO
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
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
function iso_to_ddmmyyyy(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

let editingTicketId = null;

function openEditModal(ticketId) {
  const t = appState.tickets.find((x) => String(x.id) === String(ticketId));
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
    showNotification(
      "La fecha de vencimiento no puede ser anterior a la fecha de creación",
      "error"
    );
    return;
  }

  const idx = appState.tickets.findIndex(
    (x) => String(x.id) === String(editingTicketId)
  );
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
    if ([...gestUserFilter.options].some((o) => o.value === current)) {
      gestUserFilter.value = current;
    }
  }

  // Historial → mismas opciones
  const histUserFilter = document.getElementById("histUserFilter");
  if (histUserFilter) {
    const currentH = histUserFilter.value || "";
    histUserFilter.innerHTML = `
      <option value="">Buscar por</option>
      <option value="nombre">Nombre</option>
      <option value="id">ID</option>
      <option value="id-ticket">ID Ticket</option>
    `;
    if ([...histUserFilter.options].some((o) => o.value === currentH)) {
      histUserFilter.value = currentH;
    }
  }
}

function setupGestionarDynamicFields() {
  const modeSelect = document.getElementById("gestUserFilter");
  const fieldsBox = document.getElementById("gestModeFields");
  if (!modeSelect || !fieldsBox) return;

  renderGestionarFields();

  modeSelect.onchange = () => {
    gestCriteria = {
      mode: modeSelect.value,
      nameQuery: "",
      idQuery: "",
      from: "",
      to: "",
    };
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
    const inp = document.getElementById("gestNameInput");
    const f1 = document.getElementById("gestFromDate");
    const f2 = document.getElementById("gestToDate");
    const btnS = document.getElementById("gestNameSearchBtn");
    const btnC = document.getElementById("gestNameClearBtn");

    if (inp) inp.value = gestCriteria.nameQuery || "";
    if (f1) f1.value = gestCriteria.from || "";
    if (f2) f2.value = gestCriteria.to || "";

    if (btnS)
      btnS.addEventListener("click", () => {
        gestCriteria.nameQuery = inp?.value || "";
        gestCriteria.from = f1?.value || "";
        gestCriteria.to = f2?.value || "";
        updateTicketsTab();
      });

    if (btnC)
      btnC.addEventListener("click", () => {
        if (inp) inp.value = "";
        if (f1) f1.value = "";
        if (f2) f2.value = "";
        gestCriteria.nameQuery = "";
        gestCriteria.from = "";
        gestCriteria.to = "";
        updateTicketsTab();
      });

    // === CONEXIÓN BÚSQUEDA PROGRESIVA (prefijos por tokens)
    if (inp) inp.addEventListener("input", onGestNameInput);
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
    const f1 = document.getElementById("gestFromDate");
    const f2 = document.getElementById("gestToDate");
    const btnS = document.getElementById("gestIdSearchBtn");
    const btnC = document.getElementById("gestIdClearBtn");

    if (idInp) idInp.value = gestCriteria.idQuery || "";
    if (f1) f1.value = gestCriteria.from || "";
    if (f2) f2.value = gestCriteria.to || "";

    if (btnS)
      btnS.addEventListener("click", () => {
        gestCriteria.idQuery = idInp?.value || "";
        gestCriteria.from = f1?.value || "";
        gestCriteria.to = f2?.value || "";
        updateTicketsTab();
      });
    if (btnC)
      btnC.addEventListener("click", () => {
        if (idInp) idInp.value = "";
        if (f1) f1.value = "";
        if (f2) f2.value = "";
        gestCriteria.idQuery = "";
        gestCriteria.from = "";
        gestCriteria.to = "";
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
    const btnS = document.getElementById("gestIdSearchBtn");
    const btnC = document.getElementById("gestIdClearBtn");

    if (idInp) idInp.value = gestCriteria.idQuery || "";

    if (btnS)
      btnS.addEventListener("click", () => {
        gestCriteria.idQuery = idInp?.value || "";
        // limpiar fechas por si quedaron de otro modo
        gestCriteria.from = "";
        gestCriteria.to = "";
        updateTicketsTab();
      });
    if (btnC)
      btnC.addEventListener("click", () => {
        if (idInp) idInp.value = "";
        gestCriteria.idQuery = "";
        gestCriteria.from = "";
        gestCriteria.to = "";
        updateTicketsTab();
      });
  } else {
    fieldsBox.innerHTML = "";
  }
}

/* ===== Historial dinámico (igual a Gestionar; SIN campos extras) ===== */
function setupHistorialDynamicFields() {
  const modeSelect = document.getElementById("histUserFilter");
  const fieldsBox = document.getElementById("histModeFields");
  if (!modeSelect || !fieldsBox) return;

  renderHistorialFields();

  modeSelect.onchange = () => {
    histAdvCriteria = {
      mode: modeSelect.value,
      nameQuery: "",
      idQuery: "",
      from: "",
      to: "",
    };
    renderHistorialFields();
    updateHistorialTab();
  };
}

function renderHistorialFields() {
  const mode = histAdvCriteria.mode || "";
  const fieldsBox = document.getElementById("histModeFields");
  if (!fieldsBox) return;

  if (mode === "nombre") {
    fieldsBox.innerHTML = `
      <div class="filters-row" style="gap:.5rem;margin-bottom:0;">
        <input id="histNameInputAdv" class="filter-input" type="text" placeholder="Escribe un nombre..." />
        <input type="date" id="histFromDateAdv" class="filter-input" title="Desde (completado)">
        <input type="date" id="histToDateAdv" class="filter-input" title="Hasta (completado)">
        <button id="histNameSearchBtnAdv" class="pagination-btn" type="button">Buscar</button>
        <button id="histNameClearBtnAdv" class="pagination-btn" type="button">Borrar</button>
      </div>
    `;
    const inp = document.getElementById("histNameInputAdv");
    const f1 = document.getElementById("histFromDateAdv");
    const f2 = document.getElementById("histToDateAdv");
    const btnS = document.getElementById("histNameSearchBtnAdv");
    const btnC = document.getElementById("histNameClearBtnAdv");

    if (inp) inp.value = histAdvCriteria.nameQuery || "";
    if (f1) f1.value = histAdvCriteria.from || "";
    if (f2) f2.value = histAdvCriteria.to || "";

    if (btnS)
      btnS.addEventListener("click", () => {
        histAdvCriteria.nameQuery = inp?.value || "";
        histAdvCriteria.from = f1?.value || "";
        histAdvCriteria.to = f2?.value || "";
        updateHistorialTab();
      });

    if (btnC)
      btnC.addEventListener("click", () => {
        if (inp) inp.value = "";
        if (f1) f1.value = "";
        if (f2) f2.value = "";
        histAdvCriteria.nameQuery = "";
        histAdvCriteria.from = "";
        histAdvCriteria.to = "";
        updateHistorialTab();
      });

    // === CONEXIÓN BÚSQUEDA PROGRESIVA (prefijos por tokens)
    if (inp) inp.addEventListener("input", onHistNameInput);
  } else if (mode === "id") {
    fieldsBox.innerHTML = `
      <div class="filters-row" style="gap:.5rem;margin-bottom:0;">
        <input id="histIdInputAdv" class="filter-input" type="number" placeholder="ID (entero)" />
        <input type="date" id="histFromDateAdv" class="filter-input" title="Desde (completado)">
        <input type="date" id="histToDateAdv" class="filter-input" title="Hasta (completado)">
        <button id="histIdSearchBtnAdv" class="pagination-btn" type="button">Buscar</button>
        <button id="histIdClearBtnAdv" class="pagination-btn" type="button">Borrar</button>
      </div>
    `;
    const idInp = document.getElementById("histIdInputAdv");
    const f1 = document.getElementById("histFromDateAdv");
    const f2 = document.getElementById("histToDateAdv");
    const btnS = document.getElementById("histIdSearchBtnAdv");
    const btnC = document.getElementById("histIdClearBtnAdv");

    if (idInp) idInp.value = histAdvCriteria.idQuery || "";
    if (f1) f1.value = histAdvCriteria.from || "";
    if (f2) f2.value = histAdvCriteria.to || "";

    if (btnS)
      btnS.addEventListener("click", () => {
        histAdvCriteria.idQuery = idInp?.value || "";
        histAdvCriteria.from = f1?.value || "";
        histAdvCriteria.to = f2?.value || "";
        updateHistorialTab();
      });
    if (btnC)
      btnC.addEventListener("click", () => {
        if (idInp) idInp.value = "";
        if (f1) f1.value = "";
        if (f2) f2.value = "";
        histAdvCriteria.idQuery = "";
        histAdvCriteria.from = "";
        histAdvCriteria.to = "";
        updateHistorialTab();
      });
  } else if (mode === "id-ticket") {
    fieldsBox.innerHTML = `
      <div class="filters-row" style="gap:.5rem;margin-bottom:0;">
        <input id="histIdInputAdv" class="filter-input" type="number" placeholder="ID Ticket (entero)" />
        <button id="histIdSearchBtnAdv" class="pagination-btn" type="button">Buscar</button>
        <button id="histIdClearBtnAdv" class="pagination-btn" type="button">Borrar</button>
      </div>
    `;
    const idInp = document.getElementById("histIdInputAdv");
    const btnS = document.getElementById("histIdSearchBtnAdv");
    const btnC = document.getElementById("histIdClearBtnAdv");

    if (idInp) idInp.value = histAdvCriteria.idQuery || "";

    if (btnS)
      btnS.addEventListener("click", () => {
        histAdvCriteria.idQuery = idInp?.value || "";
        histAdvCriteria.from = "";
        histAdvCriteria.to = "";
        updateHistorialTab();
      });
    if (btnC)
      btnC.addEventListener("click", () => {
        if (idInp) idInp.value = "";
        histAdvCriteria.idQuery = "";
        histAdvCriteria.from = "";
        histAdvCriteria.to = "";
        updateHistorialTab();
      });
  } else {
    fieldsBox.innerHTML = "";
  }
}

/* ====================== Usuarios Asignados (mantener funcionamiento) ====================== */
async function fetchAndRenderAssignedUsers() {
  const tbody = document.getElementById("usuariosAsignadosBody");
  const empty = document.getElementById("noUsuariosAsignados");
  if (tbody) tbody.innerHTML = "";
  if (empty) empty.classList.add("hidden");

  try {
    const resp = await fetch("http://localhost:8080/admin/subordinados", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();
    const items = Array.isArray(data.items) ? data.items : [];

    renderAssignedUsersTable(items);
  } catch (e) {
    console.error("Error al cargar usuarios asignados:", e);
    if (empty) empty.classList.remove("hidden");
  }
}

function renderAssignedUsersTable(items) {
  const tbody = document.getElementById("usuariosAsignadosBody");
  const empty = document.getElementById("noUsuariosAsignados");
  if (!tbody) return;

  if (!items.length) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  const rows = items.map((u) => {
    const nombre = u?.nombre ?? "";
    const id = u?.id_usuario ?? "";
    const correo = u?.correo ?? "";
    const cargo = u?.rol ?? "";
    const dpi = u?.cui ?? ""; // “Cui en dpi”
    return `
      <tr>
        <td>${nombre}</td>
        <td>${id}</td>
        <td>${correo}</td>
        <td>${cargo}</td>
        <td>${dpi}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rows.join("");
}

/* ====================== Wiring (DOMContentLoaded) ====================== */
document.addEventListener("DOMContentLoaded", () => {
  // TABS
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // TEMA (compat: si existe el botón en esta página)
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle)
    themeToggle.addEventListener("click", () => {
      appState.isDark = !appState.isDark;
      updateTheme();
    });

  // PERFIL
  const profileToggle = document.getElementById("profileToggle");
  const profileDropdown = document.getElementById("profileDropdown");
  if (profileToggle && profileDropdown) {
    profileToggle.addEventListener("click", () =>
      profileDropdown.classList.toggle("hidden")
    );
    document.addEventListener("click", (e) => {
      if (
        !profileDropdown.contains(e.target) &&
        !profileToggle.contains(e.target)
      ) {
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
      appState.ticketForm.usuario_id =
        document.getElementById("usuarioSelect")?.value || "";
      appState.ticketForm.ministerio_id =
        document.getElementById("ministerioSelect")?.value || "";
      appState.ticketForm.descripcion =
        document.getElementById("descripcionInput")?.value?.trim() || "";
      appState.ticketForm.presupuesto =
        document.getElementById("presupuestoInput")?.value || "";
      appState.ticketForm.fecha_inicio =
        document.getElementById("fechaInicioInput")?.value || "";
      appState.ticketForm.fecha_vencimiento =
        document.getElementById("fechaVencimientoInput")?.value || "";
      appState.ticketForm.moneda =
        document.getElementById("monedaSelect")?.value || "Q";
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
  [
    "descripcionInput",
    "presupuestoInput",
    "fechaInicioInput",
    "fechaVencimientoInput",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateCreateButton);
  });

  /* ===== Botones del recuadro seleccionado ===== */
  const addBtn = document.getElementById("addUserBtn");
  if (addBtn) addBtn.addEventListener("click", addCurrentCandidateToList);

  // ❌ Ocultar botón "Cambiar usuario" (si existe en el HTML actual)
  const changeBtn = document.getElementById("changeUserBtn");
  if (changeBtn) changeBtn.style.display = "none";

  // ➕ Botón "Borrar lista completa" (si existe en el HTML)
  const clearBtn = document.getElementById("clearUsersBtn");
  if (clearBtn) {
    clearBtn.classList.remove("hidden");
    clearBtn.addEventListener("click", clearSelectedUsersList);
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
  if (reopenCloseBtn)
    reopenCloseBtn.addEventListener("click", closeReopenModal);
  if (reopenCancelBtn)
    reopenCancelBtn.addEventListener("click", closeReopenModal);
  if (reopenModalBackdrop) {
    reopenModalBackdrop.addEventListener("click", (e) => {
      if (e.target === reopenModalBackdrop) closeReopenModal();
    });
  }

  // INIT
  updateTheme(); // asegura que la lista se pinte acorde al tema actual
  loadAdminData();
});
