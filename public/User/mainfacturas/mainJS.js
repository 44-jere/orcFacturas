// Definición de campos
const FIELD_DEF = [
  { key: "proveedor", label: "Proveedor", placeholder: "Nombre del proveedor" },
  { key: "serie", label: "Serie", placeholder: "A, B, C..." },
  {
    key: "numero_factura",
    label: "No. factura",
    placeholder: "Número de factura",
  },
  { key: "fecha_emision", label: "Fecha", placeholder: "AAAA-MM-DD" },
  { key: "moneda", label: "Moneda", placeholder: "GTQ | USD" },
  { key: "nit_emisor", label: "NIT Emisor", placeholder: "NIT del emisor" },
  {
    key: "nit_receptor",
    label: "NIT Receptor",
    placeholder: "NIT del receptor",
  },
  { key: "total", label: "Total", placeholder: "0.00" },
];

const CSV_KEYS = [
  "proveedor",
  "serie",
  "numero_factura",
  "fecha_emision",
  "moneda",
  "nit_emisor",
  "nit_receptor",
  "total",
  "tipo_gasto",
  "comida",
  "extras",
];

const TIPO_GASTO_OPTIONS = [
  { value: "", label: "Seleccionar tipo de gasto" },
  { value: "hotel", label: "Hotel" },
  { value: "alimentacion", label: "Alimentación" },
  { value: "transporte", label: "Transporte" },
  { value: "combustible", label: "Combustible" },
  { value: "peajes", label: "Peajes" },
  { value: "estacionamiento", label: "Estacionamiento" },
  { value: "otros", label: "Otros" },
];

const COMIDA_OPTIONS = [
  { value: "", label: "Ninguno" },
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Cena" },
];

// Estado global
let appState = {
  files: [],
  facturas: [],
  selectedId: null,
  busy: false,
  isDark: true,
};

// Utilidades básicas
function uid() {
  return Math.random().toString(36).slice(2);
}

function downloadCsv(rows) {
  if (!rows.length) return;

  const esc = (v) => `"${(v ?? "").toString().replaceAll('"', '""')}"`;
  const header = ["id", ...CSV_KEYS].map(esc).join(",");
  const lines = rows.map((r) =>
    [r.id, ...CSV_KEYS.map((k) => r[k] ?? "")].map(esc).join(",")
  );
  const csv = [header, ...lines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `automatix_facturas_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadJson(rows) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `automatix_facturas_${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function extractWithMVC(files) {
  try {
    console.log("🔍 DEBUG: Iniciando extracción con", files.length, "archivos");

    // Crear FormData con las imágenes
    const formData = new FormData();
    files.forEach((file, index) => {
      console.log(
        `📁 DEBUG: Agregando archivo ${index + 1}:`,
        file.name,
        file.type,
        file.size,
        "bytes"
      );
      formData.append("images", file);
    });

    const id = window.location.pathname.split("/").filter(Boolean).pop();
    console.log("📤 DEBUG: Enviando POST a /mainfacturas/");
    const response = await fetch(`/mainfacturas/${id}`, {
      method: "POST",
      body: formData, // FormData con tus archivos/campos
      credentials: "include", // mantiene cookies / sesión
    });

    console.log(
      "📥 DEBUG: Respuesta recibida - Status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ DEBUG: Error del servidor:", errorText);
      throw new Error(
        `Error del servidor: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(
      "🔍 DEBUG: Datos JSON recibidos:",
      JSON.stringify(data, null, 2)
    );

    let processedData = null;

    // Si la respuesta tiene un campo 'raw', extraer el JSON de ahí
    if (data.raw && typeof data.raw === "string") {
      console.log("🔧 DEBUG: Extrayendo datos del campo raw");
      try {
        // Limpiar el campo raw eliminando los markdown ```json y ```
        const cleanJson = data.raw
          .replace(/```json\n?/g, "")
          .replace(/```/g, "")
          .trim();
        console.log("🔧 DEBUG: JSON limpio:", cleanJson);
        processedData = JSON.parse(cleanJson);
        console.log(
          "🔧 DEBUG: Datos parseados del raw:",
          JSON.stringify(processedData, null, 2)
        );
      } catch (parseError) {
        console.error("❌ DEBUG: Error parseando raw JSON:", parseError);
        throw new Error("No se pudo procesar la respuesta del servidor");
      }
    } else {
      // Si no hay campo raw, usar los datos directamente
      processedData = data;
    }

    // Procesar la respuesta y convertir a formato de la aplicación
    if (Array.isArray(processedData)) {
      console.log(
        "📋 DEBUG: Procesando respuesta como array con",
        processedData.length,
        "elementos"
      );
      return processedData.map((item, index) => {
        console.log(
          `🔍 DEBUG: Procesando elemento ${index + 1}:`,
          JSON.stringify(item, null, 2)
        );
        return {
          id: uid(),
          proveedor: item.proveedor || "",
          serie: item.serie || "",
          numero_factura: item.numero_factura || "",
          fecha_emision: item.fecha_emision || "",
          moneda: item.moneda || "",
          nit_emisor: item.nit_emisor || "",
          nit_receptor: item.nit_receptor || "",
          total: item.total || "",
          tipo_gasto: "",
          comida: "",
          extras: "",
          _archivo: item._archivo || "",
        };
      });
    } else if (processedData && typeof processedData === "object") {
      console.log("📄 DEBUG: Procesando respuesta como objeto único");
      // Si es un solo objeto, convertirlo a array
      return [
        {
          id: uid(),
          proveedor: processedData.proveedor || "",
          serie: processedData.serie || "",
          numero_factura: processedData.numero_factura || "",
          fecha_emision: processedData.fecha_emision || "",
          moneda: processedData.moneda || "",
          nit_emisor: processedData.nit_emisor || "",
          nit_receptor: processedData.nit_receptor || "",
          total: processedData.total || "",
          tipo_gasto: "",
          comida: "",
          extras: "",
          _archivo: processedData._archivo || "",
        },
      ];
    } else {
      console.error(
        "❌ DEBUG: Formato de respuesta inválido:",
        typeof processedData,
        processedData
      );
      throw new Error("Formato de respuesta no válido del servidor");
    }
  } catch (error) {
    console.error("❌ DEBUG: Error completo en extractWithMVC:", error);
    throw error;
  }
}

// Funciones de UI
function showError(message) {
  const errorDisplay = document.getElementById("errorDisplay");
  const errorMessage = document.getElementById("errorMessage");

  if (errorDisplay && errorMessage) {
    errorMessage.textContent = message;
    errorDisplay.classList.remove("hidden");

    setTimeout(() => {
      errorDisplay.classList.add("hidden");
    }, 5000);
  }
}

function showSuccess(message) {
  console.log("✅ " + message);
  // Crear notificación temporal
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(16, 185, 129, 0.2);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: #6ee7b7;
        padding: 16px 20px;
        border-radius: 12px;
        z-index: 1000;
        backdrop-filter: blur(8px);
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

function updateTheme() {
  const body = document.body;
  const slider = document.getElementById("themeSlider");
  const moonIcon = document.getElementById("moonIcon");
  const sunIcon = document.getElementById("sunIcon");

  if (appState.isDark) {
    body.className = "dark-theme";
    if (slider) slider.style.transform = "translateX(24px)";
    if (moonIcon) moonIcon.classList.remove("hidden");
    if (sunIcon) sunIcon.classList.add("hidden");
  } else {
    body.className = "light-theme";
    if (slider) slider.style.transform = "translateX(0)";
    if (moonIcon) moonIcon.classList.add("hidden");
    if (sunIcon) sunIcon.classList.remove("hidden");
  }
}

function updateFileList() {
  const pendingFiles = document.getElementById("pendingFiles");
  const fileList = document.getElementById("fileList");
  const fileCount = document.getElementById("fileCount");

  if (!pendingFiles || !fileList || !fileCount) return;

  if (appState.files.length === 0) {
    pendingFiles.classList.add("hidden");
    return;
  }

  pendingFiles.classList.remove("hidden");
  fileCount.textContent = appState.files.length;

  fileList.innerHTML = appState.files
    .map(
      (file, index) => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <div>
                    <p class="file-name">${file.name}</p>
                    <p class="file-size">${Math.round(file.size / 1024)} KB</p>
                </div>
            </div>
            <button onclick="removeTempFile(${index})" class="remove-btn">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `
    )
    .join("");

  updateButtons();
}

function updateFacturasList() {
  const noFacturas = document.getElementById("noFacturas");
  const facturasContainer = document.getElementById("facturasContainer");
  const facturaCount = document.getElementById("facturaCount");
  const facturaCountBadge = document.getElementById("facturaCountBadge");

  if (facturaCount) facturaCount.textContent = appState.facturas.length;
  if (facturaCountBadge)
    facturaCountBadge.textContent = appState.facturas.length;

  if (appState.facturas.length === 0) {
    if (noFacturas) noFacturas.classList.remove("hidden");
    if (facturasContainer) facturasContainer.classList.add("hidden");
    return;
  }

  if (noFacturas) noFacturas.classList.add("hidden");
  if (facturasContainer) {
    facturasContainer.classList.remove("hidden");

    facturasContainer.innerHTML = appState.facturas
      .map((factura) => {
        const isSelected = appState.selectedId === factura.id;
        const tipoGastoOption = TIPO_GASTO_OPTIONS.find(
          (opt) => opt.value === factura.tipo_gasto
        );
        const tipoGastoLabel = tipoGastoOption
          ? tipoGastoOption.label
          : factura.tipo_gasto;

        return `
                <div class="factura-card ${
                  isSelected ? "selected" : ""
                }" onclick="selectFactura('${factura.id}')">
                    <div class="factura-header">
                        <div class="factura-content">
                            <div class="factura-brand">
                                <div class="factura-icon">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 class="factura-title">
                                        ${
                                          factura.numero_factura || "Sin número"
                                        } · ${factura.serie || "—"}
                                    </h4>
                                    <p class="factura-subtitle">${
                                      factura.proveedor ||
                                      "Proveedor no especificado"
                                    }</p>
                                    ${
                                      factura.tipo_gasto
                                        ? `
                                        <div class="factura-tag">
                                            <span class="tag">${tipoGastoLabel}</span>
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                            <div class="factura-footer">
                                <div class="factura-info">
                                    <span class="factura-date">${
                                      factura.fecha_emision || "—"
                                    }</span>
                                    ${
                                      factura.total
                                        ? `
                                        <span class="factura-total">
                                            ${factura.total} ${
                                            factura.moneda || ""
                                          }
                                        </span>
                                    `
                                        : ""
                                    }
                                </div>
                                ${
                                  factura.extras
                                    ? `
                                    <span class="factura-extra">${factura.extras}</span>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                        <button onclick="event.stopPropagation(); removeFactura('${
                          factura.id
                        }')" class="remove-btn">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  updateButtons();
}

function updateEditor() {
  const noSelection = document.getElementById("noSelection");
  const facturaForm = document.getElementById("facturaForm");
  const editingIndicator = document.getElementById("editingIndicator");

  const selected = appState.facturas.find((f) => f.id === appState.selectedId);

  if (!selected) {
    if (noSelection) noSelection.classList.remove("hidden");
    if (facturaForm) facturaForm.classList.add("hidden");
    if (editingIndicator) editingIndicator.classList.add("hidden");
    return;
  }

  if (noSelection) noSelection.classList.add("hidden");
  if (facturaForm) facturaForm.classList.remove("hidden");
  if (editingIndicator) editingIndicator.classList.remove("hidden");

  if (!facturaForm) return;

  // Generar campos del formulario
  let formHTML = "";

  // Campos básicos
  FIELD_DEF.forEach(({ key, label, placeholder }) => {
    formHTML += `
            <div class="form-group">
                <label class="form-label">${label}</label>
                <input
                    class="form-input"
                    placeholder="${placeholder}"
                    value="${selected[key] || ""}"
                    onchange="updateField('${
                      selected.id
                    }', '${key}', this.value)"
                />
            </div>
        `;
  });

  // Campos adicionales
  formHTML += `
        <div class="form-group full-width">
            <div class="two-columns">
                <div class="form-group">
                    <label class="form-label">Tipo de gasto</label>
                    <select
                        class="form-select"
                        onchange="updateField('${
                          selected.id
                        }', 'tipo_gasto', this.value)"
                    >
                        ${TIPO_GASTO_OPTIONS.map(
                          (option) =>
                            `<option value="${option.value}" ${
                              selected.tipo_gasto === option.value
                                ? "selected"
                                : ""
                            }>${option.label}</option>`
                        ).join("")}
                    </select>
                </div>
                <div>
                    <div class="form-group">
                        <label class="form-label">Tiempo de comida</label>
                        <select
                            class="form-select"
                            onchange="updateField('${
                              selected.id
                            }', 'comida', this.value)"
                        >
                            ${COMIDA_OPTIONS.map(
                              (option) =>
                                `<option value="${option.value}" ${
                                  selected.comida === option.value
                                    ? "selected"
                                    : ""
                                }>${option.label}</option>`
                            ).join("")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <input
                            class="form-input"
                            placeholder="Ej. Taxi aeropuerto a hotel"
                            value="${selected.extras || ""}"
                            onchange="updateField('${
                              selected.id
                            }', 'extras', this.value)"
                        />
                    </div>
                </div>
            </div>
        </div>
    `;

  facturaForm.innerHTML = formHTML;
}

function updateButtons() {
  const clearBtn = document.getElementById("clearBtn");
  const extractBtn = document.getElementById("extractBtn");
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const removeAllBtn = document.getElementById("removeAllBtn");

  // Botones de archivos
  if (clearBtn) clearBtn.disabled = appState.files.length === 0;
  if (extractBtn) {
    extractBtn.disabled = appState.files.length === 0 || appState.busy;
    extractBtn.textContent = appState.busy ? "Procesando..." : "Extraer";
  }

  // Botones de exportación
  if (downloadJsonBtn)
    downloadJsonBtn.disabled = appState.facturas.length === 0;
  if (downloadCsvBtn) downloadCsvBtn.disabled = appState.facturas.length === 0;
  if (removeAllBtn) removeAllBtn.disabled = appState.facturas.length === 0;
}

function makeGuardarFacturasHandler() {
  let frozenCopy = null; // closure interna
  let filesCopy = [];

  // 1️⃣ Se llama desde extractWithMVC cuando llega el primer POST
  function almacenarRespuesta(data, files) {
    frozenCopy = Object.freeze(
      Array.isArray(data) ? data.map((d) => ({ ...d })) : { ...data }
    );
    filesCopy = [...files];
    console.log("📥 Respuesta congelada lista:", frozenCopy);
  }

  // 2️⃣ Se llama desde el listener de sendBtn
  async function enviarRespuesta(id) {
    if (!frozenCopy) {
      console.warn("⚠️ No hay respuesta congelada para enviar");
      return;
    }

    const formData = new FormData();

    // ✅ Archivos de imagen
    filesCopy.forEach((file) => formData.append("images", file));

    // ✅ Datos editables de la UI (facturas)
    formData.append("userDataPerFile", JSON.stringify(appState.facturas));

    // ✅ Copia congelada de IA (array válido)
    formData.append(
      "iaFrozenPerFile",
      JSON.stringify(Array.isArray(frozenCopy) ? frozenCopy : [frozenCopy])
    );

    const response = await fetch(`/mainfacturas/${id}/guardarFactura`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error al guardar facturas: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("✅ Guardado en backend:", result);
    return result;
  }

  return { almacenarRespuesta, enviarRespuesta };
}

// Funciones de eventos (globales para HTML)
function removeTempFile(index) {
  appState.files = appState.files.filter((_, i) => i !== index);
  updateFileList();
}

function removeFactura(id) {
  appState.facturas = appState.facturas.filter((f) => f.id !== id);
  if (appState.selectedId === id) {
    appState.selectedId = null;
  }
  updateFacturasList();
  updateEditor();
}

function removeAllFacturas() {
  appState.facturas = [];
  appState.selectedId = null;
  updateFacturasList();
  updateEditor();
}

function selectFactura(id) {
  appState.selectedId = id;
  updateFacturasList();
  updateEditor();
}

function updateField(id, key, value) {
  appState.facturas = appState.facturas.map((f) =>
    f.id === id ? { ...f, [key]: value } : f
  );
  updateFacturasList();
}

function handleFiles(files) {
  const fileArray = Array.from(files);
  const imageFiles = fileArray.filter((file) => file.type.startsWith("image/"));

  if (imageFiles.length === 0) {
    showError("Por favor selecciona solo archivos de imagen");
    return;
  }

  appState.files = [...appState.files, ...imageFiles];
  updateFileList();
  console.log("📁 Archivos agregados:", imageFiles.length);
}

async function extractAll() {
  if (appState.files.length === 0) return;

  appState.busy = true;
  updateButtons();

  try {
    console.log("📤 Enviando archivos al servidor...", appState.files.length);
    const results = await extractWithMVC(appState.files);

    console.log("📥 Respuesta procesada:", results);
    guardarFacturasHandler.almacenarRespuesta(results, appState.files);

    // Agregar nombres de archivo a cada factura
    results.forEach((factura, index) => {
      if (index < appState.files.length) {
        factura._archivo = appState.files[index].name;
      }
    });

    appState.facturas = [...appState.facturas, ...results];
    appState.files = [];

    if (results.length > 0) {
      appState.selectedId = results[results.length - 1].id;
    }

    updateFileList();
    updateFacturasList();
    updateEditor();

    showSuccess(`${results.length} factura(s) procesada(s) exitosamente`);
  } catch (error) {
    console.error("❌ Error al extraer datos:", error);
    showError(error.message || "Error al procesar las imágenes");
  } finally {
    appState.busy = false;
    updateButtons();
  }
}
const guardarFacturasHandler = makeGuardarFacturasHandler();

// Inicialización
function init() {
  console.log("🚀 Iniciando Automatix Facturas (MVC)...");

  // Configuración inicial
  updateTheme();
  updateFileList();
  updateFacturasList();
  updateEditor();
  updateButtons();

  // Event listeners básicos
  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const selectBtn = document.getElementById("selectBtn");
  const clearBtn = document.getElementById("clearBtn");
  const extractBtn = document.getElementById("extractBtn");
  const themeToggle = document.getElementById("themeToggle");
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const removeAllBtn = document.getElementById("removeAllBtn");

  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
      const id = window.location.pathname.split("/").filter(Boolean).pop();
      await guardarFacturasHandler.enviarRespuesta(id);
    });
  }

  // Verificar elementos críticos
  if (!fileInput || !selectBtn || !dropzone) {
    console.error("❌ Elementos críticos no encontrados");
    return;
  }

  console.log("✅ Elementos encontrados correctamente");

  // File input
  fileInput.addEventListener("change", function (e) {
    console.log("📁 Input change event");
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  });

  // Select button
  selectBtn.addEventListener("click", function (e) {
    console.log("🖱️ Select button clicked");
    e.preventDefault();
    fileInput.click();
  });

  // Dropzone
  dropzone.addEventListener("click", function (e) {
    console.log("🖱️ Dropzone clicked");
    e.preventDefault();
    fileInput.click();
  });

  // Drag and drop
  dropzone.addEventListener("dragover", function (e) {
    e.preventDefault();
    dropzone.style.borderColor = "rgba(59, 130, 246, 0.5)";
  });

  dropzone.addEventListener("drop", function (e) {
    e.preventDefault();
    dropzone.style.borderColor = "";
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      appState.isDark = !appState.isDark;
      updateTheme();
    });
  }

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      appState.files = [];
      updateFileList();
    });
  }

  // Extract button
  if (extractBtn) {
    extractBtn.addEventListener("click", function () {
      if (!appState.busy && appState.files.length > 0) {
        extractAll();
      }
    });
  }

  // Download buttons
  if (downloadJsonBtn) {
    downloadJsonBtn.addEventListener("click", function () {
      if (appState.facturas.length > 0) {
        downloadJson(appState.facturas);
        showSuccess(
          `Archivo JSON descargado con ${appState.facturas.length} facturas`
        );
      }
    });
  }

  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", function () {
      if (appState.facturas.length > 0) {
        downloadCsv(appState.facturas);
        showSuccess(
          `Archivo CSV descargado con ${appState.facturas.length} facturas`
        );
      }
    });
  }

  if (removeAllBtn) {
    removeAllBtn.addEventListener("click", function () {
      if (appState.facturas.length > 0) {
        if (
          confirm("¿Estás seguro de que quieres eliminar todas las facturas?")
        ) {
          removeAllFacturas();
        }
      }
    });
  }

  console.log("✅ Event listeners configurados");
  console.log("🎉 Aplicación lista para usar (MVC)");
}

// Inicializar cuando DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
