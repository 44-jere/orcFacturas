// Configuración de la API - Cambiar según tu backend
const API_CONFIG = {
  baseURL: "http://localhost:3001/api", // Cambia esta URL por la de tu backend
  loginEndpoint: "/auth/login",
  forgotPasswordEndpoint: "/auth/forgot-password",
};

// Límites de seguridad
const MAX_LOGIN_ATTEMPTS = 3;
const BLOCK_TIME = 300; // 5 minutos en segundos

// Estado global de la aplicación
let appState = {
  isDark: true,
  formData: {
    usuario: "",
    contraseña: "",
  },
  showPassword: false,
  isLoading: false,
  errors: {},
  loginAttempts: 0,
  isBlocked: false,
  blockTimeLeft: 0,
  blockTimer: null,
};

// Utilidades
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
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Funciones de tema
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

// Funciones de validación
function validateForm() {
  const newErrors = {};

  // Validar usuario
  if (!appState.formData.usuario.trim()) {
    newErrors.usuario = "El usuario es requerido";
  } else if (appState.formData.usuario.length < 3) {
    newErrors.usuario = "El usuario debe tener al menos 3 caracteres";
  }

  // Validar contraseña
  if (!appState.formData.contraseña) {
    newErrors.contraseña = "La contraseña es requerida";
  } else if (appState.formData.contraseña.length < 6) {
    newErrors.contraseña = "La contraseña debe tener al menos 6 caracteres";
  }

  appState.errors = newErrors;
  updateErrorDisplay();
  return Object.keys(newErrors).length === 0;
}

function updateErrorDisplay() {
  // Error general
  const errorGeneral = document.getElementById("errorGeneral");
  const errorGeneralText = document.getElementById("errorGeneralText");
  const errorAttemptsText = document.getElementById("errorAttemptsText");

  if (appState.errors.general) {
    if (errorGeneral && errorGeneralText) {
      errorGeneralText.textContent = appState.errors.general;
      errorGeneral.classList.remove("hidden");

      if (appState.errors.attempts && errorAttemptsText) {
        errorAttemptsText.textContent = appState.errors.attempts;
        errorAttemptsText.classList.remove("hidden");
      } else if (errorAttemptsText) {
        errorAttemptsText.classList.add("hidden");
      }
    }
  } else if (errorGeneral) {
    errorGeneral.classList.add("hidden");
  }

  // Errores de campos específicos
  ["usuario", "contraseña"].forEach((field) => {
    const errorElement = document.getElementById(
      `error${field.charAt(0).toUpperCase() + field.slice(1)}`
    );
    const inputElement = document.getElementById(field);

    if (appState.errors[field]) {
      if (errorElement) {
        errorElement.textContent = appState.errors[field];
        errorElement.classList.remove("hidden");
      }
      if (inputElement) {
        inputElement.classList.add("error");
      }
    } else {
      if (errorElement) {
        errorElement.classList.add("hidden");
      }
      if (inputElement) {
        inputElement.classList.remove("error");
      }
    }
  });
}

function updateBlockDisplay() {
  const blockPanel = document.getElementById("blockPanel");
  const blockTimeLeft = document.getElementById("blockTimeLeft");

  if (appState.isBlocked) {
    if (blockPanel) blockPanel.classList.remove("hidden");
    if (blockTimeLeft)
      blockTimeLeft.textContent = formatTime(appState.blockTimeLeft);
  } else {
    if (blockPanel) blockPanel.classList.add("hidden");
  }
}

function updateLoadingState() {
  const loginBtn = document.getElementById("loginBtn");
  const loginBtnText = document.getElementById("loginBtnText");
  const loginIcon = document.getElementById("loginIcon");
  const loadingIcon = document.getElementById("loadingIcon");
  const usuarioInput = document.getElementById("usuario");
  const contraseñaInput = document.getElementById("contraseña");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

  // Actualizar botón
  if (loginBtn) {
    loginBtn.disabled =
      appState.isLoading ||
      appState.isBlocked ||
      !appState.formData.usuario ||
      !appState.formData.contraseña;
  }

  if (appState.isLoading) {
    if (loginBtnText) loginBtnText.textContent = "Iniciando sesión...";
    if (loginIcon) loginIcon.classList.add("hidden");
    if (loadingIcon) loadingIcon.classList.remove("hidden");
  } else if (appState.isBlocked) {
    if (loginBtnText) loginBtnText.textContent = "Bloqueado";
    if (loginIcon) loginIcon.classList.add("hidden");
    if (loadingIcon) loadingIcon.classList.add("hidden");
  } else {
    if (loginBtnText) loginBtnText.textContent = "Iniciar Sesión";
    if (loginIcon) loginIcon.classList.remove("hidden");
    if (loadingIcon) loadingIcon.classList.add("hidden");
  }

  // Deshabilitar inputs
  const isDisabled = appState.isLoading || appState.isBlocked;
  if (usuarioInput) usuarioInput.disabled = isDisabled;
  if (contraseñaInput) contraseñaInput.disabled = isDisabled;
  if (forgotPasswordBtn) forgotPasswordBtn.disabled = isDisabled;
}

// Función para hacer la petición de login a la API
async function loginRequest(credentials) {
  try {
    const response = await fetch(
      `${API_CONFIG.baseURL}${API_CONFIG.loginEndpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: credentials.usuario,
          password: credentials.contraseña,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error en el login");
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Manejo de eventos
function handleInputChange(field, value) {
  appState.formData[field] = value;

  // Limpiar errores cuando el usuario empiece a escribir
  if (appState.errors[field]) {
    appState.errors[field] = "";
    updateErrorDisplay();
  }

  updateLoadingState();
}

async function handleLogin(e) {
  if (e) e.preventDefault();

  // Verificar si está bloqueado
  if (appState.isBlocked) {
    return;
  }

  // Validar formulario
  if (!validateForm()) {
    return;
  }

  appState.isLoading = true;
  appState.errors = {};
  updateErrorDisplay();
  updateLoadingState();

  try {
    // Hacer petición real a la API
    const result = await loginRequest(appState.formData);

    if (result.success) {
      // Login exitoso
      console.log("Login exitoso:", result.data);

      // Guardar token en localStorage
      if (result.data.token) {
        localStorage.setItem("authToken", result.data.token);
      }

      // Guardar información del usuario
      if (result.data.user) {
        localStorage.setItem("userData", JSON.stringify(result.data.user));
      }

      // Resetear intentos de login
      appState.loginAttempts = 0;

      showNotification("¡Login exitoso! Redirigiendo...", "success");

      // Simular redirección después de 2 segundos
      setTimeout(() => {
        // Aquí rediriges al usuario
        // window.location.href = '/dashboard.html';
        alert("Redirigiendo al dashboard...");
      }, 2000);
    } else {
      // Login fallido
      appState.loginAttempts += 1;

      if (appState.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        appState.isBlocked = true;
        appState.blockTimeLeft = BLOCK_TIME;
        appState.errors = {
          general: `Demasiados intentos fallidos. Bloqueado por ${
            BLOCK_TIME / 60
          } minutos.`,
        };
        startBlockTimer();
      } else {
        appState.errors = {
          general: result.error || "Credenciales incorrectas",
          attempts: `Intentos restantes: ${
            MAX_LOGIN_ATTEMPTS - appState.loginAttempts
          }`,
        };
      }
      updateErrorDisplay();
      updateBlockDisplay();
    }
  } catch (error) {
    console.error("Error en login:", error);
    appState.errors = {
      general: "Error de conexión. Por favor, intenta de nuevo.",
    };
    updateErrorDisplay();
  } finally {
    appState.isLoading = false;
    updateLoadingState();
  }
}

async function handleForgotPassword() {
  if (!appState.formData.usuario.trim()) {
    appState.errors = {
      usuario: "Ingresa tu usuario para recuperar la contraseña",
    };
    updateErrorDisplay();
    return;
  }

  appState.isLoading = true;
  updateLoadingState();

  try {
    const response = await fetch(
      `${API_CONFIG.baseURL}${API_CONFIG.forgotPasswordEndpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: appState.formData.usuario,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      showNotification(
        "Se ha enviado un enlace de recuperación a tu correo electrónico.",
        "success"
      );
    } else {
      showNotification(
        data.message || "Error al enviar el enlace de recuperación",
        "error"
      );
    }
  } catch (error) {
    console.error("Error en forgot password:", error);
    showNotification(
      "Error de conexión. Por favor, intenta de nuevo.",
      "error"
    );
  } finally {
    appState.isLoading = false;
    updateLoadingState();
  }
}

function togglePasswordVisibility() {
  appState.showPassword = !appState.showPassword;
  const passwordInput = document.getElementById("contraseña");
  const eyeClosedIcon = document.getElementById("eyeClosedIcon");
  const eyeOpenIcon = document.getElementById("eyeOpenIcon");

  if (passwordInput) {
    passwordInput.type = appState.showPassword ? "text" : "password";
  }

  if (appState.showPassword) {
    if (eyeClosedIcon) eyeClosedIcon.classList.add("hidden");
    if (eyeOpenIcon) eyeOpenIcon.classList.remove("hidden");
  } else {
    if (eyeClosedIcon) eyeClosedIcon.classList.remove("hidden");
    if (eyeOpenIcon) eyeOpenIcon.classList.add("hidden");
  }
}

function startBlockTimer() {
  if (appState.blockTimer) {
    clearInterval(appState.blockTimer);
  }

  appState.blockTimer = setInterval(() => {
    appState.blockTimeLeft--;

    if (appState.blockTimeLeft <= 0) {
      appState.isBlocked = false;
      appState.loginAttempts = 0;
      clearInterval(appState.blockTimer);
      appState.blockTimer = null;
      updateBlockDisplay();
      updateLoadingState();
    } else {
      updateBlockDisplay();
    }
  }, 1000);
}

// Inicialización
function initializeApp() {
  console.log("Inicializando aplicación de login...");

  // Configuración inicial
  updateTheme();
  updateErrorDisplay();
  updateBlockDisplay();
  updateLoadingState();

  // Referencias a elementos
  const themeToggle = document.getElementById("themeToggle");
  const loginForm = document.getElementById("loginForm");
  const usuarioInput = document.getElementById("usuario");
  const contraseñaInput = document.getElementById("contraseña");
  const togglePassword = document.getElementById("togglePassword");
  const loginBtn = document.getElementById("loginBtn");
  const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

  // Event listeners

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      appState.isDark = !appState.isDark;
      updateTheme();
    });
  }

  // Form submission
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      handleLogin();
    });
  }

  // Input changes
  if (usuarioInput) {
    usuarioInput.addEventListener("input", function (e) {
      handleInputChange("usuario", e.target.value);
    });
  }

  if (contraseñaInput) {
    contraseñaInput.addEventListener("input", function (e) {
      handleInputChange("contraseña", e.target.value);
    });

    // Enter key para submit
    contraseñaInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        handleLogin();
      }
    });
  }

  // Toggle password visibility
  if (togglePassword) {
    togglePassword.addEventListener("click", function (e) {
      e.preventDefault();
      togglePasswordVisibility();
    });
  }

  // Login button
  if (loginBtn) {
    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleLogin();
    });
  }

  // Forgot password
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleForgotPassword();
    });
  }

  console.log("Aplicación de login inicializada correctamente");
}

// Funciones de demo/testing (opcional)
function setDemoCredentials() {
  const usuarioInput = document.getElementById("usuario");
  const contraseñaInput = document.getElementById("contraseña");

  if (usuarioInput) {
    usuarioInput.value = "admin";
    handleInputChange("usuario", "admin");
  }

  if (contraseñaInput) {
    contraseñaInput.value = "password123";
    handleInputChange("contraseña", "password123");
  }

  showNotification("Credenciales de demo cargadas", "success");
}

// Mock de respuesta del servidor para testing
function createMockLoginResponse(username, password) {
  // Simular diferentes respuestas basadas en las credenciales
  if (username === "admin" && password === "password123") {
    return {
      success: true,
      data: {
        token: "mock-jwt-token-" + Date.now(),
        user: {
          id: 1,
          username: "admin",
          name: "Administrador",
          email: "admin@automatix.gt",
          role: "admin",
        },
      },
    };
  } else if (username === "demo" && password === "demo123") {
    return {
      success: true,
      data: {
        token: "mock-jwt-token-demo-" + Date.now(),
        user: {
          id: 2,
          username: "demo",
          name: "Usuario Demo",
          email: "demo@automatix.gt",
          role: "user",
        },
      },
    };
  } else {
    return {
      success: false,
      error: "Usuario o contraseña incorrectos",
    };
  }
}

// Sobrescribir loginRequest para modo demo (opcional)
const originalLoginRequest = loginRequest;
async function loginRequest(credentials) {
  // En un entorno de desarrollo, puedes usar mock data
  const useMockData = true; // Cambiar a false para usar API real

  if (useMockData) {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return createMockLoginResponse(credentials.usuario, credentials.contraseña);
  } else {
    return originalLoginRequest(credentials);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();

  // Agregar función global para testing
  window.setDemoCredentials = setDemoCredentials;

  console.log("Login page cargada. Para probar, usa:");
  console.log("- Usuario: admin, Contraseña: password123");
  console.log("- Usuario: demo, Contraseña: demo123");
  console.log("- O ejecuta: setDemoCredentials() en la consola");
});

// Limpiar timer al cerrar la página
window.addEventListener("beforeunload", function () {
  if (appState.blockTimer) {
    clearInterval(appState.blockTimer);
  }
});
