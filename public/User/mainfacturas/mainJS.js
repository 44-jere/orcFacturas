// Configuración global
const GEMINI_API_KEY = ""; // Pega tu key aquí; vacío = DEMO_MODE
const MODEL = "gemini-1.5-flash-lite";
const DEMO_MODE = !GEMINI_API_KEY;

// Definición de campos
const FIELD_DEF = [
    { key: "proveedor", label: "Proveedor", placeholder: "Nombre del proveedor" },
    { key: "serie", label: "Serie", placeholder: "A, B, C..." },
    { key: "numero_factura", label: "No. factura", placeholder: "Número de factura" },
    { key: "fecha_emision", label: "Fecha", placeholder: "AAAA-MM-DD" },
    { key: "moneda", label: "Moneda", placeholder: "GTQ | USD" },
    { key: "nit_emisor", label: "NIT Emisor", placeholder: "NIT del emisor" },
    { key: "nit_receptor", label: "NIT Receptor", placeholder: "NIT del receptor" },
    { key: "total", label: "Total", placeholder: "0.00" },
];

const CSV_KEYS = [
    "proveedor","serie","numero_factura","fecha_emision","moneda","nit_emisor","nit_receptor","total","tipo_gasto","comida","extras"
];

const TIPO_GASTO_OPTIONS = [
    { value: "", label: "Seleccionar tipo de gasto" },
    { value: "hotel", label: "Hotel" },
    { value: "alimentacion", label: "Alimentación" },
    { value: "hospedaje", label: "Hospedaje" },
    { value: "transporte", label: "Transporte" },
    { value: "combustible", label: "Combustible" },
    { value: "peajes", label: "Peajes" },
    { value: "estacionamiento", label: "Estacionamiento" },
    { value: "otros", label: "Otros" },
];

// NUEVO: opciones de tiempo de comida
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
    isDark: true
};

// Utilidades básicas
function uid() {
    return Math.random().toString(36).slice(2);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(",")[1] || "";
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function downloadCsv(rows) {
    if (!rows.length) return;
    
    const esc = (v) => `"${(v ?? "").toString().replaceAll('"', '""')}"`;
    const header = ["id", ...CSV_KEYS].map(esc).join(",");
    const lines = rows.map(r => [r.id, ...CSV_KEYS.map(k => r[k] ?? "")].map(esc).join(","));
    const csv = [header, ...lines].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `automatix_facturas_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadJson(rows) {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `automatix_facturas_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function extractWithGemini(imageBase64) {
    if (DEMO_MODE) {
        // Simular delay del API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            id: uid(),
            proveedor: "SUBWAY DE GUATEMALA, S.A.",
            serie: "",
            numero_factura: "3416801579",
            fecha_emision: "29/08/2025",
            moneda: "Q",
            nit_emisor: "799376-5",
            nit_receptor: "CF",
            total: "130.00",
            tipo_gasto: "",
            // comida la define el usuario en el editor (opcional)
            extras: "",
        };
    }

    const prompt = "Extrae los datos de esta factura y devuelve SOLO un JSON válido con exactamente estas claves: proveedor, numero_factura, fecha_emision (formato DD/MM/AAAA), moneda (Q para quetzales, $ para dólares), nit_emisor, nit_receptor, total (solo números con decimales). No agregues texto adicional, solo el JSON.";
    
    const body = {
        contents: [{
            parts: [
                { text: prompt },
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
            ]
        }],
        generationConfig: {
            temperature: 0,
            maxOutputTokens: 512,
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Error de Gemini API: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        throw new Error("Error al procesar la respuesta de Gemini AI");
    }

    return {
        id: uid(),
        proveedor: parsed.proveedor || "",
        serie: "",
        numero_factura: parsed.numero_factura || "",
        fecha_emision: parsed.fecha_emision || "",
        moneda: parsed.moneda || "",
        nit_emisor: parsed.nit_emisor || "",
        nit_receptor: parsed.nit_receptor || "",
        total: parsed.total || "",
        tipo_gasto: "",
        // comida la define el usuario en el editor (opcional)
        extras: "",
    };
}

// Funciones de UI
function showError(message) {
    const errorDisplay = document.getElementById('errorDisplay');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorDisplay && errorMessage) {
        errorMessage.textContent = message;
        errorDisplay.classList.remove('hidden');
        
        setTimeout(() => {
            errorDisplay.classList.add('hidden');
        }, 5000);
    }
}

function showSuccess(message) {
    console.log('✅ ' + message);
    // Crear notificación temporal
    const notification = document.createElement('div');
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
    const slider = document.getElementById('themeSlider');
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');

    if (appState.isDark) {
        body.className = 'dark-theme';
        if (slider) slider.style.transform = 'translateX(24px)';
        if (moonIcon) moonIcon.classList.remove('hidden');
        if (sunIcon) sunIcon.classList.add('hidden');
    } else {
        body.className = 'light-theme';
        if (slider) slider.style.transform = 'translateX(0)';
        if (moonIcon) moonIcon.classList.add('hidden');
        if (sunIcon) sunIcon.classList.remove('hidden');
    }
}

function updateFileList() {
    const pendingFiles = document.getElementById('pendingFiles');
    const fileList = document.getElementById('fileList');
    const fileCount = document.getElementById('fileCount');
    
    if (!pendingFiles || !fileList || !fileCount) return;
    
    if (appState.files.length === 0) {
        pendingFiles.classList.add('hidden');
        return;
    }
    
    pendingFiles.classList.remove('hidden');
    fileCount.textContent = appState.files.length;
    
    fileList.innerHTML = appState.files.map((file, index) => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
    `).join('');
    
    updateButtons();
}

function updateFacturasList() {
    const noFacturas = document.getElementById('noFacturas');
    const facturasContainer = document.getElementById('facturasContainer');
    const facturaCount = document.getElementById('facturaCount');
    const facturaCountBadge = document.getElementById('facturaCountBadge');
    
    if (facturaCount) facturaCount.textContent = appState.facturas.length;
    if (facturaCountBadge) facturaCountBadge.textContent = appState.facturas.length;
    
    if (appState.facturas.length === 0) {
        if (noFacturas) noFacturas.classList.remove('hidden');
        if (facturasContainer) facturasContainer.classList.add('hidden');
        return;
    }
    
    if (noFacturas) noFacturas.classList.add('hidden');
    if (facturasContainer) {
        facturasContainer.classList.remove('hidden');
        
        facturasContainer.innerHTML = appState.facturas.map(factura => {
            const isSelected = appState.selectedId === factura.id;
            const tipoGastoOption = TIPO_GASTO_OPTIONS.find(opt => opt.value === factura.tipo_gasto);
            const tipoGastoLabel = tipoGastoOption ? tipoGastoOption.label : factura.tipo_gasto;
            
            return `
                <div class="factura-card ${isSelected ? 'selected' : ''}" onclick="selectFactura('${factura.id}')">
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
                                        ${factura.numero_factura || "Sin número"} · ${factura.serie || "—"}
                                    </h4>
                                    <p class="factura-subtitle">${factura.proveedor || "Proveedor no especificado"}</p>
                                    ${factura.tipo_gasto ? `
                                        <div class="factura-tag">
                                            <span class="tag">${tipoGastoLabel}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="factura-footer">
                                <div class="factura-info">
                                    <span class="factura-date">${factura.fecha_emision || "—"}</span>
                                    ${factura.total ? `
                                        <span class="factura-total">
                                            ${factura.total} ${factura.moneda || ""}
                                        </span>
                                    ` : ''}
                                </div>
                                ${factura.extras ? `
                                    <span class="factura-extra">${factura.extras}</span>
                                ` : ''}
                            </div>
                        </div>
                        <button onclick="event.stopPropagation(); removeFactura('${factura.id}')" class="remove-btn">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateButtons();
}

function updateEditor() {
    const noSelection = document.getElementById('noSelection');
    const facturaForm = document.getElementById('facturaForm');
    const editingIndicator = document.getElementById('editingIndicator');
    
    const selected = appState.facturas.find(f => f.id === appState.selectedId);
    
    if (!selected) {
        if (noSelection) noSelection.classList.remove('hidden');
        if (facturaForm) facturaForm.classList.add('hidden');
        if (editingIndicator) editingIndicator.classList.add('hidden');
        return;
    }
    
    if (noSelection) noSelection.classList.add('hidden');
    if (facturaForm) facturaForm.classList.remove('hidden');
    if (editingIndicator) editingIndicator.classList.remove('hidden');
    
    if (!facturaForm) return;
    
    // Generar campos del formulario
    let formHTML = '';
    
    // Campos básicos
    FIELD_DEF.forEach(({ key, label, placeholder }) => {
        formHTML += `
            <div class="form-group">
                <label class="form-label">${label}</label>
                <input
                    class="form-input"
                    placeholder="${placeholder}"
                    value="${selected[key] || ''}"
                    onchange="updateField('${selected.id}', '${key}', this.value)"
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
                        onchange="updateField('${selected.id}', 'tipo_gasto', this.value)"
                    >
                        ${TIPO_GASTO_OPTIONS.map(option => 
                            `<option value="${option.value}" ${selected.tipo_gasto === option.value ? 'selected' : ''}>${option.label}</option>`
                        ).join('')}
                    </select>
                </div>
                <div>
                    <div class="form-group">
                        <label class="form-label">Tiempo de comida</label>
                        <select
                            class="form-select"
                            onchange="updateField('${selected.id}', 'comida', this.value)"
                        >
                            ${COMIDA_OPTIONS.map(option => 
                                `<option value="${option.value}" ${selected.comida === option.value ? 'selected' : ''}>${option.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <input
                            class="form-input"
                            placeholder="Ej. Taxi aeropuerto a hotel"
                            value="${selected.extras || ''}"
                            onchange="updateField('${selected.id}', 'extras', this.value)"
                        />
                    </div>
                </div>
            </div>
        </div>
    `;
    
    facturaForm.innerHTML = formHTML;
}

function updateButtons() {
    const clearBtn = document.getElementById('clearBtn');
    const extractBtn = document.getElementById('extractBtn');
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const removeAllBtn = document.getElementById('removeAllBtn');
    
    // Botones de archivos
    if (clearBtn) clearBtn.disabled = appState.files.length === 0;
    if (extractBtn) {
        extractBtn.disabled = appState.files.length === 0 || appState.busy;
        extractBtn.textContent = appState.busy ? "Procesando..." : "Extraer";
    }
    
    // Botones de exportación
    if (downloadJsonBtn) downloadJsonBtn.disabled = appState.facturas.length === 0;
    if (downloadCsvBtn) downloadCsvBtn.disabled = appState.facturas.length === 0;
    if (removeAllBtn) removeAllBtn.disabled = appState.facturas.length === 0;
}

// Funciones de eventos (globales para HTML)
function removeTempFile(index) {
    appState.files = appState.files.filter((_, i) => i !== index);
    updateFileList();
}

function removeFactura(id) {
    appState.facturas = appState.facturas.filter(f => f.id !== id);
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
    appState.facturas = appState.facturas.map(f => 
        f.id === id ? { ...f, [key]: value } : f
    );
    updateFacturasList();
}

function handleFiles(files) {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showError('Por favor selecciona solo archivos de imagen');
        return;
    }
    
    appState.files = [...appState.files, ...imageFiles];
    updateFileList();
    console.log('📁 Archivos agregados:', imageFiles.length);
}

async function extractAll() {
    if (appState.files.length === 0) return;
    
    appState.busy = true;
    updateButtons();
    
    try {
        const results = [];
        for (const file of appState.files) {
            const b64 = await fileToBase64(file);
            const factura = await extractWithGemini(b64);
            factura._archivo = file.name;
            results.push(factura);
        }
        
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
        console.error('Error al extraer datos:', error);
        showError(error.message || 'Error al procesar las imágenes');
    } finally {
        appState.busy = false;
        updateButtons();
    }
}

// Inicialización simple
function init() {
    console.log('🚀 Iniciando Automatix Facturas...');
    
    // Configuración inicial
    updateTheme();
    updateFileList();
    updateFacturasList();
    updateEditor();
    updateButtons();

    // Ocultar modo demo si no aplica
    if (!DEMO_MODE) {
        const demoMode = document.getElementById('demoMode');
        if (demoMode) demoMode.classList.add('hidden');
    }

    // Event listeners básicos
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.getElementById('dropzone');
    const selectBtn = document.getElementById('selectBtn');
    const clearBtn = document.getElementById('clearBtn');
    const extractBtn = document.getElementById('extractBtn');
    const themeToggle = document.getElementById('themeToggle');
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const removeAllBtn = document.getElementById('removeAllBtn');

    // Verificar elementos críticos
    if (!fileInput || !selectBtn || !dropzone) {
        console.error('❌ Elementos críticos no encontrados');
        return;
    }

    console.log('✅ Elementos encontrados correctamente');

    // File input
    fileInput.addEventListener('change', function(e) {
        console.log('📁 Input change event');
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
            e.target.value = '';
        }
    });

    // Select button
    selectBtn.addEventListener('click', function(e) {
        console.log('🖱️ Select button clicked');
        e.preventDefault();
        fileInput.click();
    });

    // Dropzone
    dropzone.addEventListener('click', function(e) {
        console.log('🖱️ Dropzone clicked');
        e.preventDefault();
        fileInput.click();
    });

    // Drag and drop
    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(59, 130, 246, 0.5)';
    });

    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.style.borderColor = '';
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            appState.isDark = !appState.isDark;
            updateTheme();
        });
    }

    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            appState.files = [];
            updateFileList();
        });
    }

    // Extract button
    if (extractBtn) {
        extractBtn.addEventListener('click', function() {
            if (!appState.busy && appState.files.length > 0) {
                extractAll();
            }
        });
    }

    // Download buttons
    if (downloadJsonBtn) {
        downloadJsonBtn.addEventListener('click', function() {
            if (appState.facturas.length > 0) {
                downloadJson(appState.facturas);
                showSuccess(`Archivo JSON descargado con ${appState.facturas.length} facturas`);
            }
        });
    }

    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', function() {
            if (appState.facturas.length > 0) {
                downloadCsv(appState.facturas);
                showSuccess(`Archivo CSV descargado con ${appState.facturas.length} facturas`);
            }
        });
    }

    if (removeAllBtn) {
        removeAllBtn.addEventListener('click', function() {
            if (appState.facturas.length > 0) {
                if (confirm('¿Estás seguro de que quieres eliminar todas las facturas?')) {
                    removeAllFacturas();
                }
            }
        });
    }

    console.log('✅ Event listeners configurados');
    console.log('🎉 Aplicación lista para usar');
}

// Inicializar cuando DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
