// Estado global de la aplicación de perfil
const profileState = {
    isDark: true,
    activeTab: "perfil",
    userProfile: null,
    loading: false
};

// Datos de ejemplo del usuario (sin cambios)
const SAMPLE_USER_PROFILE = {
    id: "user_001",
    nombre: "Juan Carlos",
    apellidos: "Pérez González",
    email: "juan.perez@gobierno.gob.gt",
    telefono: "+502 1234-5678",
    cargo: "Director Regional de Educación",
    departamento: "Guatemala",
    fecha_registro: "2024-03-15",
    ultimo_acceso: "2025-08-31T10:30:00",
    rol: "usuario",
    estado: "activo",
    foto_perfil: null,
    ministerios_asignados: [
        { id: "min_001", nombre: "Ministerio de Educación", codigo: "ME", fecha_asignacion: "2024-03-15" }
    ],
    configuraciones: {
        notificaciones_push: false,
        zona_horaria: "America/Guatemala"
    },
    estadisticas: {
        tickets_totales: 12,
        tickets_activos: 3,
        total_presupuesto_asignado: "45000.00",
        total_gastado: "32150.75",
        promedio_uso_presupuesto: 71.4
    }
};

const SAMPLE_ADMIN_PROFILE = {
    id: "admin_001",
    nombre: "María Elena",
    apellidos: "García Rodríguez",
    email: "maria.garcia@gobierno.gob.gt",
    telefono: "+502 9876-5432",
    cargo: "Administradora del Sistema",
    departamento: "Sistemas",
    fecha_registro: "2023-01-10",
    ultimo_acceso: "2025-08-31T11:45:00",
    rol: "admin",
    estado: "activo",
    foto_perfil: null,
    ministerios_asignados: [],
    configuraciones: {
        notificaciones_push: true,
        zona_horaria: "America/Guatemala"
    },
    estadisticas_admin: {
        tickets_creados_total: 89,
        tickets_activos_gestionados: 23,
        usuarios_gestionados: 45,
        presupuesto_total_asignado: "1250000.00",
        ministerios_activos: 8
    }
};

// Variables de elementos DOM
let elements = {};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    setupTheme();
    loadUserProfile();
    addAnimations();
});

// Inicializar referencias a elementos DOM
function initializeElements() {
    elements = {
        // Estados
        loadingState: document.getElementById('loadingState'),
        mainContent: document.getElementById('mainContent'),
        
        // Header
        body: document.getElementById('body'),
        header: document.getElementById('header'),
        backButton: document.getElementById('backButton'),
        headerTitle: document.getElementById('headerTitle'),
        headerSubtitle: document.getElementById('headerSubtitle'),
        themeToggle: document.getElementById('themeToggle'),
        moonIcon: document.getElementById('moonIcon'),
        sunIcon: document.getElementById('sunIcon'),
        
        // Profile Card
        profileCard: document.getElementById('profileCard'),
        profilePhoto: document.getElementById('profilePhoto'),
        changePhotoBtn: document.getElementById('changePhotoBtn'),
        photoUpload: document.getElementById('photoUpload'),
        userName: document.getElementById('userName'),
        userRoleBadge: document.getElementById('userRoleBadge'),
        userStatusBadge: document.getElementById('userStatusBadge'),
        userPosition: document.getElementById('userPosition'),
        userDepartment: document.getElementById('userDepartment'),
        ministriesSection: document.getElementById('ministriesSection'),
        ministriesList: document.getElementById('ministriesList'),
        registrationDate: document.getElementById('registrationDate'),
        lastAccessDate: document.getElementById('lastAccessDate'),
        
        // Tabs
        tabPerfil: document.getElementById('tabPerfil'),
        tabConfiguracion: document.getElementById('tabConfiguracion'),
        tabEstadisticas: document.getElementById('tabEstadisticas'),
        
        // Tab Contents
        contentPerfil: document.getElementById('contentPerfil'),
        contentConfiguracion: document.getElementById('contentConfiguracion'),
        contentEstadisticas: document.getElementById('contentEstadisticas'),
        
        // View Mode
        viewNombreCompleto: document.getElementById('viewNombreCompleto'),
        viewEmail: document.getElementById('viewEmail'),
        viewTelefono: document.getElementById('viewTelefono'),
        viewCargo: document.getElementById('viewCargo'),
        viewDepartamento: document.getElementById('viewDepartamento'),
        viewEstado: document.getElementById('viewEstado'),
        
        // Configuration
        pushNotificationToggle: document.getElementById('pushNotificationToggle'),
        pushNotificationSlider: document.getElementById('pushNotificationSlider'),
        timezoneSelect: document.getElementById('timezoneSelect'),
        changePasswordBtn: document.getElementById('changePasswordBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        
        // Statistics
        userStatistics: document.getElementById('userStatistics'),
        adminStatistics: document.getElementById('adminStatistics'),
        budgetProgress: document.getElementById('budgetProgress'),
        budgetText: document.getElementById('budgetText'),
        budgetBar: document.getElementById('budgetBar'),
        budgetPercentage: document.getElementById('budgetPercentage')
    };
}

// Configurar event listeners
function setupEventListeners() {
    // Navigation
    elements.backButton.addEventListener('click', () => window.history.back());
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Tabs
    elements.tabPerfil.addEventListener('click', () => switchTab('perfil'));
    elements.tabConfiguracion.addEventListener('click', () => switchTab('configuracion'));
    elements.tabEstadisticas.addEventListener('click', () => switchTab('estadisticas'));
    
    // Photo Upload
    elements.changePhotoBtn.addEventListener('click', () => elements.photoUpload.click());
    elements.photoUpload.addEventListener('change', handlePhotoUpload);
    
    // Configuration
    elements.pushNotificationToggle.addEventListener('click', toggleNotifications);
    elements.timezoneSelect.addEventListener('change', updateTimezone);
    elements.changePasswordBtn.addEventListener('click', handleChangePassword);
    elements.logoutBtn.addEventListener('click', handleLogout);
}

// Configurar tema inicial
function setupTheme() {
    const savedTheme = localStorage.getItem('profile-theme');
    if (savedTheme) {
        profileState.isDark = savedTheme === 'dark';
    } else {
        profileState.isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    updateThemeClasses();
}

// Toggle del tema
function toggleTheme() {
    profileState.isDark = !profileState.isDark;
    localStorage.setItem('profile-theme', profileState.isDark ? 'dark' : 'light');
    updateThemeClasses();
}

// Actualizar clases CSS según el tema
function updateThemeClasses() {
    const isDark = profileState.isDark;
    
    // Body
    elements.body.className = `min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`;
    
    // Header
    elements.header.className = `sticky top-0 z-50 backdrop-blur-xl ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`;
    
    // Profile Card
    elements.profileCard.className = `${isDark ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-3xl border ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'} p-8 mb-8 shadow-2xl`;
    
    // Theme toggle
    elements.themeToggle.className = `w-10 h-10 ${isDark ? 'bg-slate-700/50' : 'bg-gray-200/50'} rounded-xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50`;
    elements.themeToggle.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    
    // Icons
    if (isDark) {
        elements.moonIcon.classList.remove('hidden');
        elements.sunIcon.classList.add('hidden');
    } else {
        elements.moonIcon.classList.add('hidden');
        elements.sunIcon.classList.remove('hidden');
    }
    
    // Back button
    elements.backButton.className = `w-10 h-10 ${isDark ? 'bg-slate-700/50' : 'bg-gray-200/50'} rounded-xl transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center`;
    
    // Text colors
    elements.headerTitle.className = `text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`;
    elements.headerSubtitle.className = `text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
    elements.userName.className = `text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`;
    elements.userPosition.className = `text-lg ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`;
    elements.userDepartment.className = `${isDark ? 'text-slate-400' : 'text-gray-600'} mb-4`;
    
    // Update tabs
    updateTabStyles();
}

// Actualizar estilos de tabs
function updateTabStyles() {
    const isDark = profileState.isDark;
    const tabs = [elements.tabPerfil, elements.tabConfiguracion, elements.tabEstadisticas];
    const tabNames = ['perfil', 'configuracion', 'estadisticas'];
    
    tabs.forEach((tab, index) => {
        const isActive = profileState.activeTab === tabNames[index];
        tab.className = `px-4 py-2 rounded-xl transition-all ${
            isActive 
                ? "bg-blue-500 text-white"
                : `${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'} ${isDark ? 'text-slate-300' : 'text-gray-700'}`
        }`;
    });
}

// Cargar perfil del usuario
async function loadUserProfile() {
    setLoadingState(true);
    
    try {
        // Simular carga desde API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Determinar si es admin o usuario (para demo)
        const isAdmin = window.location.search.includes("admin=true");
        const profileData = isAdmin ? SAMPLE_ADMIN_PROFILE : SAMPLE_USER_PROFILE;
        
        profileState.userProfile = profileData;
        
        renderProfile();
        
    } catch (error) {
        console.error("Error cargando perfil:", error);
        showError("Error al cargar el perfil del usuario");
    } finally {
        setLoadingState(false);
    }
}

// Establecer estado de carga
function setLoadingState(loading) {
    profileState.loading = loading;
    
    if (loading) {
        elements.loadingState.classList.remove('hidden');
        elements.mainContent.classList.add('hidden');
    } else {
        elements.loadingState.classList.add('hidden');
        elements.mainContent.classList.remove('hidden');
    }
}

// Renderizar perfil
function renderProfile() {
    if (!profileState.userProfile) return;
    
    const user = profileState.userProfile;
    
    // Foto de perfil e iniciales
    if (user.foto_perfil) {
        elements.profilePhoto.innerHTML = `<img src="${user.foto_perfil}" alt="Foto de perfil" class="w-24 h-24 rounded-2xl object-cover">`;
    } else {
        const initials = `${user.nombre.charAt(0)}${user.apellidos.charAt(0)}`;
        elements.profilePhoto.innerHTML = initials;
        elements.profilePhoto.className = "w-24 h-24 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold";
    }
    
    // Información básica
    elements.userName.textContent = `${user.nombre} ${user.apellidos}`;
    elements.userPosition.textContent = user.cargo;
    elements.userDepartment.textContent = user.departamento;
    
    // Badges
    renderBadges();
    
    // Ministerios
    renderMinistries();
    
    // Fechas
    elements.registrationDate.textContent = formatDate(user.fecha_registro);
    elements.lastAccessDate.textContent = formatDateTime(user.ultimo_acceso);
    
    // Renderizar contenido de tabs
    renderTabContent();
}

// Renderizar badges de rol y estado
function renderBadges() {
    const user = profileState.userProfile;
    
    // Badge de rol
    elements.userRoleBadge.className = `px-3 py-1 rounded-full text-xs font-medium border ${
        user.rol === "admin" 
            ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }`;
    elements.userRoleBadge.textContent = user.rol === "admin" ? "Administrador" : "Usuario";
    
    // Badge de estado
    elements.userStatusBadge.className = `px-3 py-1 rounded-full text-xs font-medium border ${
        user.estado === "activo"
            ? "bg-green-500/20 text-green-400 border-green-500/30"
            : "bg-red-500/20 text-red-400 border-red-500/30"
    }`;
    elements.userStatusBadge.textContent = user.estado === "activo" ? "Activo" : "Inactivo";
}

// Renderizar ministerios
function renderMinistries() {
    const user = profileState.userProfile;
    
    if (user.ministerios_asignados.length > 0) {
        elements.ministriesSection.classList.remove('hidden');
        elements.ministriesList.innerHTML = '';
        
        user.ministerios_asignados.forEach(ministerio => {
            const span = document.createElement('span');
            span.className = "px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm border border-blue-500/20";
            span.textContent = `${ministerio.codigo} - ${ministerio.nombre}`;
            elements.ministriesList.appendChild(span);
        });
    } else {
        elements.ministriesSection.classList.add('hidden');
    }
}

// Renderizar contenido de tabs
function renderTabContent() {
    renderPersonalInfo();
    renderConfiguration();
    renderStatistics();
}

// Renderizar información personal (solo vista)
function renderPersonalInfo() {
    const user = profileState.userProfile;
    
    elements.viewNombreCompleto.textContent = `${user.nombre} ${user.apellidos}`;
    elements.viewEmail.textContent = user.email;
    elements.viewTelefono.textContent = user.telefono || "No especificado";
    elements.viewCargo.textContent = user.cargo;
    elements.viewDepartamento.textContent = user.departamento;
    
    elements.viewEstado.className = `inline-block px-3 py-1 rounded-full text-sm font-medium ${
        user.estado === "activo"
            ? "bg-green-500/20 text-green-400"
            : "bg-red-500/20 text-red-400"
    }`;
    elements.viewEstado.textContent = user.estado === "activo" ? "Activo" : "Inactivo";
}

// Renderizar configuración
function renderConfiguration() {
    const user = profileState.userProfile;
    
    // Notificaciones push
    const isEnabled = user.configuraciones.notificaciones_push;
    elements.pushNotificationToggle.className = `relative w-14 h-8 rounded-full p-1 transition-colors ${
        isEnabled ? 'bg-blue-500' : profileState.isDark ? 'bg-slate-600' : 'bg-gray-300'
    }`;
    elements.pushNotificationSlider.className = `w-6 h-6 rounded-full bg-white transition-transform ${
        isEnabled ? 'translate-x-6' : 'translate-x-0'
    }`;
    
    // Zona horaria
    elements.timezoneSelect.value = user.configuraciones.zona_horaria;
}

// Renderizar estadísticas
function renderStatistics() {
    const user = profileState.userProfile;
    
    if (user.rol === "admin") {
        elements.adminStatistics.classList.remove('hidden');
        elements.userStatistics.classList.add('hidden');
        elements.budgetProgress.classList.add('hidden');
        renderAdminStats();
    } else {
        elements.adminStatistics.classList.add('hidden');
        elements.userStatistics.classList.remove('hidden');
        elements.budgetProgress.classList.remove('hidden');
        renderUserStats();
        renderBudgetProgress();
    }
}

// Renderizar estadísticas de admin
function renderAdminStats() {
    const stats = profileState.userProfile.estadisticas_admin;
    const isDark = profileState.isDark;
    
    elements.adminStatistics.innerHTML = `
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">${stats.tickets_creados_total}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Tickets creados</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">${stats.tickets_activos_gestionados}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Tickets activos</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">${stats.usuarios_gestionados}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Usuarios gestionados</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">Q${parseFloat(stats.presupuesto_total_asignado).toLocaleString()}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Presupuesto gestionado</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">${stats.ministerios_activos}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Ministerios activos</p>
                </div>
            </div>
        </div>
    `;
}

// Renderizar estadísticas de usuario
function renderUserStats() {
    const stats = profileState.userProfile.estadisticas;
    const isDark = profileState.isDark;
    
    elements.userStatistics.innerHTML = `
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">${stats.tickets_totales}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Tickets totales</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">${stats.tickets_activos}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Tickets activos</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">Q${parseFloat(stats.total_presupuesto_asignado).toLocaleString()}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Presupuesto asignado</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">Q${parseFloat(stats.total_gastado).toLocaleString()}</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Total gastado</p>
                </div>
            </div>
        </div>
        
        <div class="p-6 rounded-2xl border ${isDark ? 'border-slate-700/50 bg-slate-700/30' : 'border-gray-200 bg-gray-50'}">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <svg class="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div>
                    <p class="text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}">${stats.promedio_uso_presupuesto.toFixed(1)}%</p>
                    <p class="text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}">Promedio de uso</p>
                </div>
            </div>
        </div>
    `;
}

// Renderizar progreso del presupuesto
function renderBudgetProgress() {
    const stats = profileState.userProfile.estadisticas;
    const isDark = profileState.isDark;
    
    elements.budgetText.textContent = `Q${parseFloat(stats.total_gastado).toLocaleString()} / Q${parseFloat(stats.total_presupuesto_asignado).toLocaleString()}`;
    elements.budgetPercentage.textContent = `${stats.promedio_uso_presupuesto.toFixed(1)}% del presupuesto total utilizado`;
    elements.budgetPercentage.className = `text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} text-center`;
    
    setTimeout(() => {
        elements.budgetBar.style.width = `${Math.min(stats.promedio_uso_presupuesto, 100)}%`;
    }, 500);
}

// Cambiar tab activo
function switchTab(tabName) {
    profileState.activeTab = tabName;
    
    elements.contentPerfil.classList.add('hidden');
    elements.contentConfiguracion.classList.add('hidden');
    elements.contentEstadisticas.classList.add('hidden');
    
    const activeContent = elements[`content${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`];
    if (activeContent) {
        activeContent.classList.remove('hidden');
        activeContent.classList.add('slide-in');
    }
    
    updateTabStyles();
}

// Toggle notificaciones
function toggleNotifications() {
    const currentValue = profileState.userProfile.configuraciones.notificaciones_push;
    updateSettings("notificaciones_push", !currentValue);
}

// Actualizar configuraciones
async function updateSettings(settingKey, value) {
    try {
        // TODO: Implementar llamada a la API
        profileState.userProfile.configuraciones[settingKey] = value;
        renderConfiguration();
    } catch (error) {
        console.error("Error actualizando configuración:", error);
        showError("Error al actualizar la configuración");
    }
}

// Actualizar zona horaria
function updateTimezone(event) {
    updateSettings("zona_horaria", event.target.value);
}

// Subir foto de perfil
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // TODO: Implementar subida real
        showInfo("Función de subir foto pendiente de implementar");
    }
}

// Cambiar contraseña
function handleChangePassword() {
    showInfo("Funcionalidad de cambio de contraseña pendiente");
}

// Cerrar sesión
function handleLogout() {
    if (confirm("¿Estás seguro de cerrar sesión?")) {
        showInfo("Cerrando sesión... (Demo)");
        // TODO: Implementar cierre de sesión real
    }
}

// Agregar animaciones
function addAnimations() {
    elements.profileCard.classList.add('fade-in');
}

// Utilidades
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('es-GT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

// Exportar funciones
window.ProfileApp = {
    profileState,
    toggleTheme,
    switchTab,
    showSuccess,
    showError,
    loadUserProfile
};
