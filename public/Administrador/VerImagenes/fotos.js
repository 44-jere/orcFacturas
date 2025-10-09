// === DOM ===
const facturaIdInput   = document.getElementById('facturaId');
const btnBuscar        = document.getElementById('btnBuscar');
const viewer           = document.getElementById('viewer');
const emptyState       = document.getElementById('emptyState');

// Chips/estados opcionales (si están en el HTML)
const viewerStatusDot  = document.getElementById('viewerStatusDot');
const viewerStatusText = document.getElementById('viewerStatusText');
const editStateDot     = document.getElementById('editStateDot');
const editStateText    = document.getElementById('editStateText');

const details          = document.getElementById('details');
const searchHint       = document.getElementById('searchHint');

const proveedorInput   = document.getElementById('proveedor');
const serieInput       = document.getElementById('serie');
const noFacturaInput   = document.getElementById('noFactura');
const fechaInput       = document.getElementById('fecha');
const monedaSelect     = document.getElementById('moneda');
const nitEmisorInput   = document.getElementById('nitEmisor');
const nitReceptorInput = document.getElementById('nitReceptor');
const totalInput       = document.getElementById('total');
const tipoGastoSelect  = document.getElementById('tipoGasto');
const tipoComidaField  = document.getElementById('tipoComidaField');
const tipoComidaSelect = document.getElementById('tipoComida');
const descripcionInput = document.getElementById('descripcion');

const btnEditar        = document.getElementById('btnEditar');
const btnGuardar       = document.getElementById('btnGuardar');

// --- Zoom UI ---
const zoomSlider       = document.getElementById('zoomSlider');
const zoomValueLabel   = document.getElementById('zoomValue');

// === Utils ===
function disableAll(disabled){
  [
    proveedorInput, serieInput, noFacturaInput, fechaInput, monedaSelect,
    nitEmisorInput, nitReceptorInput, totalInput, tipoGastoSelect,
    tipoComidaSelect, descripcionInput
  ].forEach(el => el.disabled = disabled);

  if (editStateText) editStateText.textContent = disabled ? 'Bloqueado' : 'Editando';
  if (editStateDot) {
    if (disabled) editStateDot.classList.remove('editing');
    else editStateDot.classList.add('editing');
  }
}

function updateTipoComidaVisibility(){
  const show = tipoGastoSelect.value === 'Alimentación';
  if (tipoComidaField) tipoComidaField.style.display = show ? 'block' : 'none';
}

// === API DEMO ===
async function fetchFacturaById(id){
  const placeholder = 'https://tse4.mm.bing.net/th/id/OIP.2y9RiHcRoINErlvK7DdIHQHaKD?rs=1&pid=ImgDetMain&o=7&rm=3';
  return {
    imagenUrl: placeholder,
    proveedor: 'Proveedor DEMO, S.A.',
    serie: 'A-01',
    numero: id || 'DEMO-0001',
    fecha: '2025-09-07',
    moneda: 'Q',
    nitEmisor: '5640773-4',
    nitReceptor: 'CF',
    total: 192.00,
    tipoGasto: 'Alimentación',
    tipoComida: 'Almuerzo',
    descripcion: 'Factura demo generada en modo demostración.'
  };
}

// === Estado de zoom/pan ===
let currentImg = null;
let currentScale = 1;
const MIN_SCALE = 1;      // 0% en slider
const MAX_SCALE = 3;      // 100% en slider -> 3x (ajustable)
let isPanning = false;
let activePointerId = null;
let startX = 0, startY = 0;
let offsetX = 0, offsetY = 0;

function applyTransform(){
  if (!currentImg) return;
  currentImg.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`;
}

function updatePanTouchAction(){
  // Cuando hay zoom activado, deshabilitamos gestos de scroll en el visor
  if (currentScale > MIN_SCALE) {
    viewer.classList.add('pan-enabled');
  } else {
    viewer.classList.remove('pan-enabled');
  }
}

function setScaleFromSlider(percent){
  // Mapea 0..100 -> 1..MAX_SCALE
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  currentScale = MIN_SCALE + (p / 100) * (MAX_SCALE - MIN_SCALE);

  if (zoomValueLabel) zoomValueLabel.textContent = `${p}%`;

  // Al volver a 0% reseteamos desplazamiento y cursor
  if (currentScale === MIN_SCALE){
    offsetX = 0; offsetY = 0;
    viewer.style.cursor = 'default';
  }else{
    viewer.style.cursor = isPanning ? 'grabbing' : 'grab';
  }

  updatePanTouchAction();
  applyTransform();
}

// === Pan con Pointer Events (mouse/touch/pen unificado) ===
function attachPanHandlers(){
  viewer.addEventListener('pointerdown', (e)=>{
    if (!currentImg || currentScale === MIN_SCALE) return;
    // Solo botón principal si es mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    isPanning = true;
    activePointerId = e.pointerId;
    try { viewer.setPointerCapture(e.pointerId); } catch(_) {}

    viewer.classList.add('grabbing');
    viewer.style.cursor = 'grabbing';

    // Evitar selección de texto y scrolling durante arrastre
    document.body.style.userSelect = 'none';
    // En algunos navegadores móviles, además de touch-action, ayuda preventDefault en down
    e.preventDefault();

    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
  }, { passive: false });

  viewer.addEventListener('pointermove', (e)=>{
    if (!isPanning || e.pointerId !== activePointerId) return;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    applyTransform();
    // Evita scroll durante el movimiento en móvil
    e.preventDefault();
  }, { passive: false });

  const endPan = (e)=>{
    if (!isPanning || (activePointerId !== null && e.pointerId !== activePointerId)) return;
    isPanning = false;
    activePointerId = null;
    try { viewer.releasePointerCapture(e.pointerId); } catch(_) {}
    document.body.style.userSelect = ''; // restaurar
    viewer.classList.remove('grabbing');
    viewer.style.cursor = (currentScale === MIN_SCALE) ? 'default' : 'grab';
  };

  viewer.addEventListener('pointerup', endPan, { passive: true });
  viewer.addEventListener('pointercancel', endPan, { passive: true });
}

// === Render ===
function renderImage(url){
  viewer.querySelectorAll('img').forEach(n => n.remove());
  if (emptyState) emptyState.style.display = 'none';

  const img = document.createElement('img');
  img.alt = 'Factura';
  img.src = url;
  viewer.appendChild(img);

  currentImg = img;
  // Reset de zoom/pan
  currentScale = MIN_SCALE;
  offsetX = 0; offsetY = 0;
  applyTransform();
  if (zoomSlider) zoomSlider.value = 0;
  if (zoomValueLabel) zoomValueLabel.textContent = '0%';
  viewer.style.cursor = 'default';
  updatePanTouchAction();

  if (viewerStatusText) viewerStatusText.textContent = 'Cargada';
  if (viewerStatusDot) viewerStatusDot.classList.remove('hidden');
}

// === Llenado de formulario ===
function fillForm(data){
  proveedorInput.value   = data.proveedor ?? '';
  serieInput.value       = data.serie ?? '';
  noFacturaInput.value   = data.numero ?? '';
  fechaInput.value       = (data.fecha ?? '').slice(0,10);
  monedaSelect.value     = data.moneda ?? 'Q';
  nitEmisorInput.value   = data.nitEmisor ?? '';
  nitReceptorInput.value = data.nitReceptor ?? '';
  totalInput.value       = data.total ?? '';
  tipoGastoSelect.value  = data.tipoGasto ?? 'Otros';
  if (tipoComidaSelect) tipoComidaSelect.value = data.tipoComida ?? 'Desayuno';
  descripcionInput.value = data.descripcion ?? '';
  updateTipoComidaVisibility();
}

// === Eventos ===
btnBuscar.addEventListener('click', async ()=>{
  const id = facturaIdInput.value.trim();
  btnBuscar.disabled = true;
  searchHint.textContent = 'Buscando…';

  try{
    const data = await fetchFacturaById(id);

    renderImage(data.imagenUrl);
    fillForm(data);

    details.classList.remove('hidden');
    btnEditar.disabled = false;
    btnGuardar.disabled = true;
    disableAll(true);
    searchHint.textContent = 'Factura (demo) encontrada.';
  }catch(err){
    console.error(err);
    searchHint.textContent = 'Ocurrió un error al buscar.';
  }finally{
    btnBuscar.disabled = false;
  }
});

tipoGastoSelect.addEventListener('change', updateTipoComidaVisibility);

btnEditar.addEventListener('click', ()=>{
  disableAll(false);
  btnGuardar.disabled = false;
  btnEditar.disabled = true;
});

btnGuardar.addEventListener('click', ()=>{
  const payload = {
    id: facturaIdInput.value.trim(),
    proveedor: proveedorInput.value.trim(),
    serie: serieInput.value.trim(),
    numero: noFacturaInput.value.trim(),
    fecha: fechaInput.value,
    moneda: monedaSelect.value,
    nitEmisor: nitEmisorInput.value.trim(),
    nitReceptor: nitReceptorInput.value.trim(),
    total: parseFloat(totalInput.value || '0'),
    tipoGasto: tipoGastoSelect.value,
    tipoComida: (tipoGastoSelect.value === 'Alimentación') ? (tipoComidaSelect ? tipoComidaSelect.value : null) : null,
    descripcion: descripcionInput.value.trim()
  };

  console.log('Guardar (DEMO) ->', payload);

  disableAll(true);
  btnEditar.disabled = false;
  btnGuardar.disabled = true;
});

// Inicializa barra de zoom y pan
if (zoomSlider){
  zoomSlider.addEventListener('input', (e)=> setScaleFromSlider(e.target.value));
}
attachPanHandlers();
