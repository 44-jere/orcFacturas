/* =========================================================================
   Automatix Solutions - Login: tema + ver clave
   Archivo sugerido: /General/login/loginScript.js
   ========================================================================= */

(() => {
  // ====== Claves de storage y selects de elementos ======
  const THEME_KEY = "automatix.theme"; // 'dark' | 'light' (otras páginas pueden leerlo)
  const bodyEl = document.getElementById("body") || document.body;

  // Toggle de tema (día/noche)
  const themeBtn = document.getElementById("themeToggle");
  const moonIcon = document.getElementById("moonIcon"); // se muestra en DARK
  const sunIcon  = document.getElementById("sunIcon");  // se muestra en LIGHT

  // Ver/Ocultar contraseña
  const passInput = document.getElementById("contraseña");
  const passBtn   = document.getElementById("togglePassword");
  const eyeClosed = document.getElementById("eyeClosedIcon"); // ojo cerrado
  const eyeOpen   = document.getElementById("eyeOpenIcon");   // ojo abierto

  // ====== Utilidades de tema ======
  const applyTheme = (theme) => {
    if (!bodyEl) return;

    const isDark = theme === "dark";
    bodyEl.classList.toggle("dark-theme", isDark);
    bodyEl.classList.toggle("light-theme", !isDark);

    // Alterna íconos
    if (moonIcon && sunIcon) {
      moonIcon.classList.toggle("hidden", !isDark);
      sunIcon.classList.toggle("hidden", isDark);
    }

    // Guarda en localStorage para que otras páginas lo lean
    try {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch { /* noop */ }

    // Opcional: atributo para CSS/analytics
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  };

  const getSavedTheme = () => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch { /* noop */ }

    // Si no hay guardado, usamos la clase actual del body como fuente de verdad
    if (bodyEl.classList.contains("light-theme")) return "light";
    return "dark"; // tu HTML arranca con dark-theme
  };

  // Exponer un helper global para otras páginas
  window.AutomatixTheme = {
    getTheme: () => getSavedTheme(),               // 'dark' | 'light'
    isDark:   () => getSavedTheme() === "dark",
    setTheme: (t) => applyTheme(t === "light" ? "light" : "dark")
  };

  // ====== Inicialización al cargar ======
  const initTheme = () => {
    applyTheme(getSavedTheme());

    // Click en el botón de tema
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const next = window.AutomatixTheme.isDark() ? "light" : "dark";
        applyTheme(next);
      });
    }

    // Sincroniza entre pestañas (si cambias el tema en otra pestaña)
    window.addEventListener("storage", (e) => {
      if (e.key === THEME_KEY && (e.newValue === "dark" || e.newValue === "light")) {
        applyTheme(e.newValue);
      }
    });
  };

  const initPasswordToggle = () => {
    if (!passInput || !passBtn) return;

    // Estado inicial: ojo cerrado visible (password), ojo abierto oculto
    const setIcons = (showing) => {
      // showing=true => texto visible
      if (eyeClosed && eyeOpen) {
        eyeClosed.classList.toggle("hidden", showing);  // escondemos cerrado si mostrando texto
        eyeOpen.classList.toggle("hidden", !showing);   // mostramos abierto si mostrando texto
      }
      passBtn.setAttribute("aria-pressed", String(showing));
      passBtn.setAttribute("title", showing ? "Ocultar contraseña" : "Mostrar contraseña");
    };

    // Asegura consistencia visual al cargar
    setIcons(passInput.type === "text");

    passBtn.addEventListener("click", () => {
      const showing = passInput.type === "password";
      passInput.setAttribute("type", showing ? "text" : "password");
      setIcons(showing);
    });

    // Accesibilidad: Enter/Espacio en el botón
    passBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        passBtn.click();
      }
    });
  };

  // Esperar a que el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initTheme();
      initPasswordToggle();
    });
  } else {
    initTheme();
    initPasswordToggle();
  }
})();
