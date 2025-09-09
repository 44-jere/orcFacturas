// =====================
// Configuración de la API (alineado a tu index.js)
// =====================
const API_CONFIG = {
  baseURL: "http://localhost:8080", // tu server según index.js
  loginUsuarios: "/login/usuarios",
  loginMinisterios: "/login/ministerios",
  forgotPasswordEndpoint: "/auth/forgot-password" // si aún no existe, déjalo para más tarde
};

// Límites de seguridad
const MAX_LOGIN_ATTEMPTS = 3;
const BLOCK_TIME = 300; // 5 min

// Estado global
let appState = {
  isDark: true,
  formData: { usuario: "", contraseña: "" },
  showPassword: false,
  isLoading: false,
  errors: {},
  loginAttempts: 0,
  isBlocked: false,
  blockTimeLeft: 0,
  blockTimer: null,
  useMockData: false, // ⬅️ ponlo en true solo si quieres simular
};

// ===== UI helpers (igual que tenías) =====
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = "notification";
  if (type === "error") {
    notification.style.background = "rgba(239, 68, 68, 0.2)";
    notification.style.borderColor = "rgba(239, 68, 68, 0.3)";
    notification.style.color = "#fca5a5";
  }
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
      }, 300);
    }
  }, 3000);
}
function formatTime(s) { const m = Math.floor(s/60), r = s%60; return `${m}:${r.toString().padStart(2,"0")}`; }
function updateTheme() {
  const body = document.body, moon = document.getElementById("moonIcon"), sun = document.getElementById("sunIcon");
  if (appState.isDark) { body.className = "dark-theme"; moon?.classList.remove("hidden"); sun?.classList.add("hidden"); }
  else { body.className = "light-theme"; moon?.classList.add("hidden"); sun?.classList.remove("hidden"); }
}

// ===== Validación (igual que tenías) =====
function validateForm() {
  const errors = {};
  if (!appState.formData.usuario.trim()) errors.usuario = "El usuario es requerido";
  else if (appState.formData.usuario.length < 3) errors.usuario = "El usuario debe tener al menos 3 caracteres";
  if (!appState.formData.contraseña) errors.contraseña = "La contraseña es requerida";
  else if (appState.formData.contraseña.length < 6) errors.contraseña = "La contraseña debe tener al menos 6 caracteres";
  appState.errors = errors; updateErrorDisplay(); return Object.keys(errors).length === 0;
}
function updateErrorDisplay() {
  const eg = document.getElementById("errorGeneral"), egt = document.getElementById("errorGeneralText"), eat = document.getElementById("errorAttemptsText");
  if (appState.errors.general) {
    if (eg && egt) {
      egt.textContent = appState.errors.general;
      eg.classList.remove("hidden");
      if (appState.errors.attempts && eat) { eat.textContent = appState.errors.attempts; eat.classList.remove("hidden"); }
      else if (eat) eat.classList.add("hidden");
    }
  } else if (eg) eg.classList.add("hidden");

  ["usuario","contraseña"].forEach(f=>{
    const el = document.getElementById(`error${f.charAt(0).toUpperCase()+f.slice(1)}`);
    const input = document.getElementById(f);
    if (appState.errors[f]) { el?.classList.remove("hidden"); if (el) el.textContent = appState.errors[f]; input?.classList.add("error"); }
    else { el?.classList.add("hidden"); input?.classList.remove("error"); }
  });
}
function updateBlockDisplay() {
  const panel = document.getElementById("blockPanel"), left = document.getElementById("blockTimeLeft");
  if (appState.isBlocked) { panel?.classList.remove("hidden"); if (left) left.textContent = formatTime(appState.blockTimeLeft); }
  else panel?.classList.add("hidden");
}
function updateLoadingState() {
  const btn = document.getElementById("loginBtn"), txt = document.getElementById("loginBtnText"),
        icn = document.getElementById("loginIcon"), load = document.getElementById("loadingIcon"),
        u = document.getElementById("usuario"), p = document.getElementById("contraseña"),
        forgot = document.getElementById("forgotPasswordBtn");
  if (btn) btn.disabled = appState.isLoading || appState.isBlocked || !appState.formData.usuario || !appState.formData.contraseña;
  if (appState.isLoading) { if (txt) txt.textContent = "Iniciando sesión..."; icn?.classList.add("hidden"); load?.classList.remove("hidden"); }
  else if (appState.isBlocked) { if (txt) txt.textContent = "Bloqueado"; icn?.classList.add("hidden"); load?.classList.add("hidden"); }
  else { if (txt) txt.textContent = "Iniciar Sesión"; icn?.classList.remove("hidden"); load?.classList.add("hidden"); }
  const dis = appState.isLoading || appState.isBlocked;
  if (u) u.disabled = dis; if (p) p.disabled = dis; if (forgot) forgot.disabled = dis;
}

// ===== API helpers =====
function getLoginEndpointPath() {
  const tipoSelect = document.getElementById("tipoLogin");
  const tipo = (tipoSelect?.value || "usuarios").toLowerCase();
  return tipo === "ministerios" ? API_CONFIG.loginMinisterios : API_CONFIG.loginUsuarios;
}

async function loginRequestReal(credentials) {
  const url = `${API_CONFIG.baseURL}${getLoginEndpointPath()}`;
  const resp = await fetch(url, {
    method: "POST",
    credentials: "include",            // ⬅️ necesario para cookies httpOnly
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usuario: credentials.usuario,    // ⬅️ nombres alineados al backend
      password: credentials.contraseña
    })
  });

  let data = null;
  try { data = await resp.json(); } catch { data = null; }

  if (!resp.ok) {
    const msg = (data && (data.error || data.message)) || (resp.status === 401 ? "Credenciales inválidas" : "Error al iniciar sesión");
    throw new Error(msg);
  }

  // Soportar { ok:true, user:{...} } o { isValid:{...} }
  const user = (data && data.user) || (data && data.isValid) || null;
  return { success: true, data: { user, raw: data } };
}

// Mock (si quieres demo local)
function createMockLoginResponse(username, password) {
  if (username === "admin" && password === "password123") {
    return { success: true, data: { user: { id: 1, usuario: "admin", name: "Administrador", role: "admin" }, raw: { ok: true } } };
  } else if (username === "demo" && password === "demo123") {
    return { success: true, data: { user: { id: 2, usuario: "demo", name: "Usuario Demo", role: "user" }, raw: { ok: true } } };
  } else return { success: false, error: "Usuario o contraseña incorrectos" };
}

async function loginRequest(credentials) {
  if (appState.useMockData) {
    await new Promise(r => setTimeout(r, 800));
    return createMockLoginResponse(credentials.usuario, credentials.contraseña);
  }
  try { return await loginRequestReal(credentials); }
  catch (err) { return { success: false, error: err.message || "Error en el login" }; }
}

// ===== Eventos y lógica =====
function handleInputChange(field, value) {
  appState.formData[field] = value;
  if (appState.errors[field]) { appState.errors[field] = ""; updateErrorDisplay(); }
  updateLoadingState();
}
async function handleLogin(e) {
  if (e) e.preventDefault();
  if (appState.isBlocked) return;
  if (!validateForm()) return;

  appState.isLoading = true; appState.errors = {};
  updateErrorDisplay(); updateLoadingState();

  try {
    const result = await loginRequest(appState.formData);
    if (result.success) {
      const user = result.data?.user || null;

      // Con cookie httpOnly NO verás el token desde JS: es lo correcto.
      // Guarda info básica del usuario si te sirve:
      if (user) localStorage.setItem("userData", JSON.stringify(user));

      appState.loginAttempts = 0;
      showNotification("¡Login exitoso! Redirigiendo...", "success");
      setTimeout(() => {
        // window.location.href = "/dashboard.html";
        alert("Redirigiendo al dashboard...");
      }, 1200);
    } else {
      appState.loginAttempts += 1;
      if (appState.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        appState.isBlocked = true; appState.blockTimeLeft = BLOCK_TIME;
        appState.errors = { general: `Demasiados intentos fallidos. Bloqueado por ${BLOCK_TIME/60} minutos.` };
        startBlockTimer();
      } else {
        appState.errors = {
          general: result.error || "Credenciales incorrectas",
          attempts: `Intentos restantes: ${MAX_LOGIN_ATTEMPTS - appState.loginAttempts}`
        };
      }
      updateErrorDisplay(); updateBlockDisplay();
    }
  } catch (error) {
    console.error("Error en login:", error);
    appState.errors = { general: "Error de conexión. Por favor, intenta de nuevo." };
    updateErrorDisplay();
  } finally {
    appState.isLoading = false; updateLoadingState();
  }
}

async function handleForgotPassword() {
  if (!appState.formData.usuario.trim()) {
    appState.errors = { usuario: "Ingresa tu usuario para recuperar la contraseña" };
    updateErrorDisplay(); return;
  }
  appState.isLoading = true; updateLoadingState();
  try {
    const resp = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.forgotPasswordEndpoint}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: appState.formData.usuario })
    });
    const data = await resp.json();
    if (resp.ok) showNotification("Se ha enviado un enlace de recuperación a tu correo.", "success");
    else showNotification(data.message || "Error al enviar el enlace de recuperación", "error");
  } catch (e) {
    console.error("Error en forgot password:", e);
    showNotification("Error de conexión. Por favor, intenta de nuevo.", "error");
  } finally { appState.isLoading = false; updateLoadingState(); }
}

function togglePasswordVisibility() {
  appState.showPassword = !appState.showPassword;
  const input = document.getElementById("contraseña"),
        eyeC = document.getElementById("eyeClosedIcon"),
        eyeO = document.getElementById("eyeOpenIcon");
  if (input) input.type = appState.showPassword ? "text" : "password";
  if (appState.showPassword) { eyeC?.classList.add("hidden"); eyeO?.classList.remove("hidden"); }
  else { eyeC?.classList.remove("hidden"); eyeO?.classList.add("hidden"); }
}
function startBlockTimer() {
  if (appState.blockTimer) clearInterval(appState.blockTimer);
  appState.blockTimer = setInterval(()=>{
    appState.blockTimeLeft--;
    if (appState.blockTimeLeft <= 0) {
      appState.isBlocked = false; appState.loginAttempts = 0;
      clearInterval(appState.blockTimer); appState.blockTimer = null;
      updateBlockDisplay(); updateLoadingState();
    } else updateBlockDisplay();
  }, 1000);
}

// ===== Inicialización =====
function initializeApp() {
  updateTheme(); updateErrorDisplay(); updateBlockDisplay(); updateLoadingState();
  const themeToggle = document.getElementById("themeToggle"),
        loginForm = document.getElementById("loginForm"),
        usuarioInput = document.getElementById("usuario"),
        contraseñaInput = document.getElementById("contraseña"),
        togglePassword = document.getElementById("togglePassword"),
        loginBtn = document.getElementById("loginBtn"),
        forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

  themeToggle?.addEventListener("click", ()=>{ appState.isDark = !appState.isDark; updateTheme(); });
  loginForm?.addEventListener("submit", (e)=>{ e.preventDefault(); handleLogin(); });
  usuarioInput?.addEventListener("input", (e)=> handleInputChange("usuario", e.target.value));
  contraseñaInput?.addEventListener("input", (e)=> handleInputChange("contraseña", e.target.value));
  contraseñaInput?.addEventListener("keypress", (e)=> { if (e.key === "Enter") handleLogin(); });
  togglePassword?.addEventListener("click", (e)=>{ e.preventDefault(); togglePasswordVisibility(); });
  loginBtn?.addEventListener("click", (e)=>{ e.preventDefault(); handleLogin(); });
  forgotPasswordBtn?.addEventListener("click", (e)=>{ e.preventDefault(); handleForgotPassword(); });
  console.log("Aplicación de login inicializada correctamente");
}

// Demo helper
function setDemoCredentials() {
  const u = document.getElementById("usuario"), p = document.getElementById("contraseña");
  if (u) { u.value = "admin"; handleInputChange("usuario","admin"); }
  if (p) { p.value = "password123"; handleInputChange("contraseña","password123"); }
  showNotification("Credenciales de demo cargadas", "success");
}

document.addEventListener("DOMContentLoaded", ()=>{
  initializeApp();
  window.setDemoCredentials = setDemoCredentials;
  console.log("Login page lista. Para demo: setDemoCredentials()");
});
window.addEventListener("beforeunload", ()=>{ if (appState.blockTimer) clearInterval(appState.blockTimer); });
