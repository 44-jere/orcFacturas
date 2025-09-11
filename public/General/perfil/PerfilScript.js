// ===== Estado global de la aplicación de perfil =====
const profileState = {
    isDark: true,
    activeTab: "perfil",
    userProfile: null,
    loading: false
};

// ===== Variables de elementos DOM =====
let elements = {};

// ===== Utilidades de red (token + fetch) =====
function getAuthToken() {
    try {
        return localStorage.getItem("auth.token") || localStorage.getItem("token") || "";
    } catch {
        return "";
    }
}
async function apiFetch(url, opts = {}) {
    const headers = new Headers(opts.headers || {});
    if (!headers.has("Content-Type") && !(opts.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    const token = getAuthToken();
    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${msg}`.trim());
    }
    // Si no hay body (204, etc.), retorna null
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

/* ======================== Bootstrap ======================== */
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    setupTheme();
    loadUserProfile();
    addAnimations();
});

/* ======================== DOM refs ======================== */
function el(id) { return document.getElementById(id); }
function initializeElements() {
    elements = {
        // Estados
        loadingState: el('loadingState'),
        mainContent: el('mainContent'),

        // Header
        body: el('body'),
        header: el('header'),
        backButton: el('backButton'),
        headerTitle: el('headerTitle'),
        headerSubtitle: el('headerSubtitle'),
        themeToggle: el('themeToggle'),
        moonIcon: el('moonIcon'),
        sunIcon: el('sunIcon'),

        // Profile Card
        profileCard: el('profileCard'),
        profilePhoto: el('profilePhoto'),
        changePhotoBtn: el('changePhotoBtn'),
        photoUpload: el('photoUpload'),
        userName: el('userName'),
        userRoleBadge: el('userRoleBadge'),
        userStatusBadge: el('userStatusBadge'),
        userPosition: el('userPosition'),
        userDepartment: el('userDepartment'),
        ministriesSection: el('ministriesSection'),
        ministriesList: el('ministriesList'),
        registrationDate: el('registrationDate'),
        lastAccessDate: el('lastAccessDate'),

        // Tabs
        tabPerfil: el('tabPerfil'),
        tabConfiguracion: el('tabConfiguracion'),

        // Tab Contents
        contentPerfil: el('contentPerfil'),
        contentConfiguracion: el('contentConfiguracion'),

        // View Mode
        viewNombreCompleto: el('viewNombreCompleto'),
        viewEmail: el('viewEmail'),
        viewcui: el('viewCui'),
        viewCargo: el('viewCargo'),
        viewDepartamento: el('viewDepartamento'),
        viewEstado: el('viewEstado'),

        // Configuration
        pushNotificationToggle: el('pushNotificationToggle'),
        pushNotificationSlider: el('pushNotificationSlider'),
        timezoneSelect: el('timezoneSelect'),
        changePasswordBtn: el('changePasswordBtn'),
        logoutBtn: el('logoutBtn')
    };
}

/* ======================== Listeners ======================== */
function on(el, evt, fn){ if(el) el.addEventListener(evt, fn); }

function setupEventListeners() {
    // Navigation
    on(elements.backButton, 'click', () => {
        if (history.length > 1) window.history.back();
        else window.location.href = '/';
    });
    on(elements.themeToggle, 'click', toggleTheme);

    // Tabs
    on(elements.tabPerfil, 'click', () => switchTab('perfil'));
    on(elements.tabConfiguracion, 'click', () => switchTab('configuracion'));

    // Photo Upload
    on(elements.changePhotoBtn, 'click', () => elements.photoUpload && elements.photoUpload.click());
    on(elements.photoUpload, 'change', handlePhotoUpload);

    // Configuration
    on(elements.pushNotificationToggle, 'click', toggleNotifications);
    on(elements.timezoneSelect, 'change', updateTimezone);
    on(elements.changePasswordBtn, 'click', handleChangePassword);
    on(elements.logoutBtn, 'click', handleLogout);
}

/* ======================== Tema ======================== */
function setupTheme() {
    const savedTheme = localStorage.getItem('profile-theme');
    if (savedTheme) {
        profileState.isDark = savedTheme === 'dark';
    } else {
        profileState.isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    updateThemeClasses();
}
function toggleTheme() {
    profileState.isDark = !profileState.isDark;
    localStorage.setItem('profile-theme', profileState.isDark ? 'dark' : 'light');
    updateThemeClasses();
}
function updateThemeClasses() {
    const isDark = profileState.isDark;

    if (elements.body) {
        elements.body.className = `min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`;
    }
    if (elements.header) {
        elements.header.className = `sticky top-0 z-50 backdrop-blur-xl ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`;
    }
    if (elements.profileCard) {
        elements.profileCard.className = `${isDark ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-3xl border ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'} p-8 mb-8 shadow-2xl`;
    }
    if (elements.themeToggle) {
        elements.themeToggle.className = `w-10 h-10 ${isDark ? 'bg-slate-700/50' : 'bg-gray-200/50'} rounded-xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50`;
        elements.themeToggle.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    }
    if (elements.moonIcon && elements.sunIcon) {
        if (isDark) { elements.moonIcon.classList.remove('hidden'); elements.sunIcon.classList.add('hidden'); }
        else { elements.moonIcon.classList.add('hidden'); elements.sunIcon.classList.remove('hidden'); }
    }
    if (elements.backButton) {
        elements.backButton.className = `w-10 h-10 ${isDark ? 'bg-slate-700/50' : 'bg-gray-200/50'} rounded-xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center`;
    }
    if (elements.headerTitle) elements.headerTitle.className = `text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`;
    if (elements.headerSubtitle) elements.headerSubtitle.className = `text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
    if (elements.userName) elements.userName.className = `text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`;
    if (elements.userPosition) elements.userPosition.className = `text-lg ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`;
    if (elements.userDepartment) elements.userDepartment.className = `${isDark ? 'text-slate-400' : 'text-gray-600'} mb-4`;

    updateTabStyles();
}
function updateTabStyles() {
    const isDark = profileState.isDark;
    const tabs = [elements.tabPerfil, elements.tabConfiguracion];
    const tabNames = ['perfil', 'configuracion'];

    tabs.forEach((tab, index) => {
        if (!tab) return;
        const isActive = profileState.activeTab === tabNames[index];
        tab.className = `px-4 py-2 rounded-xl transition-all ${
            isActive 
                ? "bg-blue-500 text-white"
                : `${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'} ${isDark ? 'text-slate-300' : 'text-gray-700'}`
        }`;
    });
}

/* ======================== Carga del perfil ======================== */
// Mapea el JSON de /perfil/userData al modelo que usa la UI
function normalizeProfile(api) {
    // api esperado (según tu screenshot): 
    // { id_usuario, rol, ministerio, nombre, correo, usuario, nit_persona, creado_en, actualizado_en, cui, encargado }
    const full = (api?.nombre || "").trim();
    const parts = full.split(/\s+/);
    const nombre = parts.shift() || "";
    const apellidos = parts.join(" ");

    const ministerioNombre = api?.ministerio || "";
    const ministerioCodigo = ministerioNombre
        ? ministerioNombre.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0,4)
        : "";

    return {
        id: String(api?.id_usuario ?? ""),
        nombre,
        apellidos,
        email: api?.correo || "",
        cui: api?.cui || "",                          // backend no lo envía
        cargo: api?.rol ? api.rol.charAt(0).toUpperCase() + api.rol.slice(1) : "", // opcional
        departamento: ministerioNombre || "",  // si no hay depto, mostramos ministerio
        fecha_registro: api?.creado_en || "",  // yyyy-mm-dd...
        ultimo_acceso: api?.actualizado_en || "",
        rol: (api?.rol === 'admin') ? 'admin' : (api?.rol || 'usuario'),
        estado: "activo",                      // si no viene, asumimos activo
        foto_perfil: null,
        ministerios_asignados: ministerioNombre ? [
            { id: "min_api_1", nombre: ministerioNombre, codigo: ministerioCodigo, fecha_asignacion: api?.creado_en || "" }
        ] : [],
        configuraciones: {
            notificaciones_push: false,
            zona_horaria: "America/Guatemala"
        }
    };
}

async function loadUserProfile() {
    setLoadingState(true);
    try {
        const data = await apiFetch("/perfil/userData", { method: "GET" });
        if (!data || typeof data !== "object") throw new Error("Respuesta vacía o inválida");
        profileState.userProfile = normalizeProfile(data);
        renderProfile();
    } catch (error) {
        console.error("Error cargando perfil:", error);
        showError("Error al cargar el perfil del usuario");
    } finally {
        setLoadingState(false);
    }
}

/* ======================== UI Render ======================== */
function setLoadingState(loading) {
    profileState.loading = loading;
    if (elements.loadingState) elements.loadingState.classList.toggle('hidden', !loading);
    if (elements.mainContent) elements.mainContent.classList.toggle('hidden', loading);
}

function renderProfile() {
    if (!profileState.userProfile) return;
    const user = profileState.userProfile;

    // Foto / iniciales
    if (elements.profilePhoto) {
        if (user.foto_perfil) {
            elements.profilePhoto.innerHTML = `<img src="${user.foto_perfil}" alt="Foto de perfil" class="w-24 h-24 rounded-2xl object-cover">`;
            elements.profilePhoto.className = ""; // lo maneja la img
        } else {
            const a = (user.apellidos || "").trim();
            const initials = `${user.nombre?.[0] || ""}${a?.[0] || ""}`.toUpperCase();
            elements.profilePhoto.innerHTML = initials || "?";
            elements.profilePhoto.className = "w-24 h-24 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold";
        }
    }

    if (elements.userName) elements.userName.textContent = `${user.nombre || ""} ${user.apellidos || ""}`.trim();
    if (elements.userPosition) elements.userPosition.textContent = user.cargo || "—";
    if (elements.userDepartment) elements.userDepartment.textContent = user.departamento || "—";

    renderBadges();
    renderMinistries();

    if (elements.registrationDate) elements.registrationDate.textContent = user.fecha_registro ? formatDate(user.fecha_registro) : "—";
    if (elements.lastAccessDate) elements.lastAccessDate.textContent = user.ultimo_acceso ? formatDateTime(user.ultimo_acceso) : "—";

    renderTabContent();
}

function renderBadges() {
    const user = profileState.userProfile;
    if (elements.userRoleBadge) {
        elements.userRoleBadge.className = `px-3 py-1 rounded-full text-xs font-medium border ${
            user.rol === "admin" 
                ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
        }`;
        elements.userRoleBadge.textContent = user.rol === "admin" ? "Administrador" : (user.rol || "Usuario");
    }
    if (elements.userStatusBadge) {
        elements.userStatusBadge.className = `px-3 py-1 rounded-full text-xs font-medium border ${
            user.estado === "activo"
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
        }`;
        elements.userStatusBadge.textContent = user.estado === "activo" ? "Activo" : "Inactivo";
    }
}

function renderMinistries() {
    const user = profileState.userProfile;
    if (!elements.ministriesSection || !elements.ministriesList) return;

    if (user.ministerios_asignados && user.ministerios_asignados.length > 0) {
        elements.ministriesSection.classList.remove('hidden');
        elements.ministriesList.innerHTML = '';
        user.ministerios_asignados.forEach(min => {
            const span = document.createElement('span');
            span.className = "px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm border border-blue-500/20";
            span.textContent = `${min.codigo || ''} - ${min.nombre || ''}`.trim();
            elements.ministriesList.appendChild(span);
        });
    } else {
        elements.ministriesSection.classList.add('hidden');
    }
}

function renderTabContent() {
    renderPersonalInfo();
    renderConfiguration();
}

function renderPersonalInfo() {
    const user = profileState.userProfile;
    if (elements.viewNombreCompleto) elements.viewNombreCompleto.textContent = `${user.nombre || ""} ${user.apellidos || ""}`.trim() || "—";
    if (elements.viewEmail) elements.viewEmail.textContent = user.email || "—";
    if (elements.viewcui) elements.viewcui.textContent = user.cui || "No especificado";
    if (elements.viewCargo) elements.viewCargo.textContent = user.cargo || "—";
    if (elements.viewDepartamento) elements.viewDepartamento.textContent = user.departamento || "—";
    if (elements.viewEstado) {
        elements.viewEstado.className = `inline-block px-3 py-1 rounded-full text-sm font-medium ${
            user.estado === "activo" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`;
        elements.viewEstado.textContent = user.estado === "activo" ? "Activo" : "Inactivo";
    }
}

function renderConfiguration() {
    const user = profileState.userProfile;
    const isEnabled = !!user?.configuraciones?.notificaciones_push;

    if (elements.pushNotificationToggle) {
        elements.pushNotificationToggle.className = `relative w-14 h-8 rounded-full p-1 transition-colors ${
            isEnabled ? 'bg-blue-500' : profileState.isDark ? 'bg-slate-600' : 'bg-gray-300'
        }`;
    }
    if (elements.pushNotificationSlider) {
        elements.pushNotificationSlider.className = `w-6 h-6 rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-0'
        }`;
    }
    if (elements.timezoneSelect) {
        elements.timezoneSelect.value = user?.configuraciones?.zona_horaria || "America/Guatemala";
    }
}

/* ======================== Tabs ======================== */
function switchTab(tabName) {
    profileState.activeTab = tabName;

    if (elements.contentPerfil) elements.contentPerfil.classList.add('hidden');
    if (elements.contentConfiguracion) elements.contentConfiguracion.classList.add('hidden');

    const key = `content${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
    const activeContent = elements[key];
    if (activeContent) {
        activeContent.classList.remove('hidden');
        activeContent.classList.add('slide-in');
    }
    updateTabStyles();
}

/* ======================== Configuración ======================== */
function toggleNotifications() {
    const currentValue = !!profileState.userProfile?.configuraciones?.notificaciones_push;
    updateSettings("notificaciones_push", !currentValue);
}
async function updateSettings(settingKey, value) {
    try {
        // TODO: Implementar llamada a la API para persistir
        if (!profileState.userProfile.configuraciones) profileState.userProfile.configuraciones = {};
        profileState.userProfile.configuraciones[settingKey] = value;
        renderConfiguration();
        showSuccess("Configuración actualizada");
    } catch (error) {
        console.error("Error actualizando configuración:", error);
        showError("Error al actualizar la configuración");
    }
}
function updateTimezone(event) {
    updateSettings("zona_horaria", event.target.value);
}

/* ======================== Acciones ======================== */
function handlePhotoUpload(event) {
    const file = event?.target?.files?.[0];
    if (file) showInfo("Función de subir foto pendiente de implementar");
}
function handleChangePassword() {
    showInfo("Funcionalidad de cambio de contraseña pendiente");
}
function handleLogout() {
    if (confirm("¿Estás seguro de cerrar sesión?")) {
        showInfo("Cerrando sesión... (Demo)");
        // TODO: Implementar cierre de sesión real
    }
}

/* ======================== Animaciones & Utils ======================== */
function addAnimations() {
    if (elements.profileCard) elements.profileCard.classList.add('fade-in');
}
function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return "—"; }
}
function formatDateTime(dateString) {
    try {
        return new Date(dateString).toLocaleString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return "—"; }
}
function showSuccess(message) { showMessage(message, 'success'); }
function showError(message)   { showMessage(message, 'error'); }
function showInfo(message)    { alert(message); }
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg max-w-md ${
        type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
    }`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateX(20px)';
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateX(0)';
        messageDiv.style.transition = 'all 0.3s ease';
    }, 100);
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(20px)';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

/* ======================== Export público (debug) ======================== */
window.ProfileApp = {
    profileState,
    toggleTheme,
    switchTab,
    showSuccess,
    showError,
    loadUserProfile
};
