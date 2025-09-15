// services/excelUsuarios.service.mjs
import ExcelJS from "exceljs";
import crypto from "crypto";

const HOJA_PLANTILLA = "usuarios";

const HEADER_MAP = {
  nombre: ["nombre", "name"],
  dpi: ["dpi", "cui", "dpi/cui", "dpi cui", "documento"],
  email: ["email", "correo", "e-mail", "mail"],
};

// normaliza SOLO para comparar encabezados (no toca el nombre real)
function norm(str) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function pickHeaderIndex(headers, keys) {
  const nh = headers.map(norm);
  for (const k of keys.map(norm)) {
    const i = nh.indexOf(k);
    if (i !== -1) return i;
  }
  return -1;
}
function generarCredenciales(nombre) {
  const base = norm(nombre).split(" ")[0].replace(/[^a-z0-9]/g, "") || "user";
  const suf = Math.floor(Math.random() * 900 + 100);
  const usuario = `${base}${suf}`;
  const password = crypto.randomBytes(4).toString("hex");
  return { usuario, password };
}

export async function procesarExcelUsuarios({
  file,
  sheetName = HOJA_PLANTILLA,
  range, // opcional "A1:C500"
}) {
  if (!file?.buffer) throw new Error("El archivo de Excel no trae buffer");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file.buffer);

  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    throw new Error(
      `No se encontró la hoja "${sheetName}". Asegúrate de usar la plantilla correcta.`
    );
  }

  // límites (si pasas range se respeta)
  let startRow = 1, endRow = ws.rowCount, startCol = 1, endCol = ws.columnCount;
  if (range) {
    const [a, b] = range.split(":");
    const aCell = ws.getCell(a);
    const bCell = ws.getCell(b);
    startRow = aCell.row; startCol = aCell.col;
    endRow = bCell.row;   endCol = bCell.col;
  }

  const normalize = (v) => {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "object") {
      if ("text" in v) return v.text;
      if ("result" in v) return v.result;
      if ("richText" in v) return v.richText.map(t => t.text).join("");
      if ("formula" in v) return v.result ?? null;
    }
    return v;
  };

  const rows = [];
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    const arr = [];
    for (let c = startCol; c <= endCol; c++) {
      arr.push(normalize(row.getCell(c).value));
    }
    const allEmpty = arr.every(x => x == null || String(x).trim?.() === "");
    if (!allEmpty) rows.push(arr);
  }

  if (rows.length === 0) return { ok: true, rows: [], errors: [] };

  const [hdr, ...body] = rows;
  const headers = hdr.map(h => (h == null ? "" : String(h)));

  const idxNombre = pickHeaderIndex(headers, HEADER_MAP.nombre);
  const idxDpi    = pickHeaderIndex(headers, HEADER_MAP.dpi);
  const idxEmail  = pickHeaderIndex(headers, HEADER_MAP.email);

  if (idxNombre === -1) {
    throw new Error(
      `Falta la columna "nombre" en la fila 1. Detectados: ${headers.map(h => String(h).trim()).join(", ")}`
    );
  }

  const out = [];
  const errors = [];

  body.forEach((r, i) => {
    const filaExcel = i + 2; // + encabezado
    const safe = (idx) => (idx >= 0 && idx < r.length ? r[idx] : null);

    const nombre = safe(idxNombre) != null ? String(safe(idxNombre)).trim() : "";
    const dpiRaw = safe(idxDpi);
    const emailRaw = safe(idxEmail);

    const isAllEmpty = r.every(x => x == null || String(x).trim?.() === "");
    if (isAllEmpty) return;

    const errs = [];
    if (!nombre) errs.push("Falta 'nombre'");

    const dpi =
      dpiRaw != null && String(dpiRaw).trim() !== ""
        ? String(dpiRaw).replace(/\D/g, "")
        : null;

    let email = null;
    if (emailRaw != null && String(emailRaw).trim() !== "") {
      const e = String(emailRaw).trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
      if (!ok) errs.push("email inválido");
      else email = e;
    }

    if (errs.length) {
      errors.push({ filaExcel, errores: errs });
      return;
    }

    const { usuario, password } = generarCredenciales(nombre);
    out.push({ nombre, dpi: dpi || null, email, usuario, password });
  });

  return { ok: true, rows: out, errors };
}


/**
 * Inserta filas en la plantilla 'usuarios.xlsx' SIN modificar la original.
 * rows: [{ nombre, dpi, email, usuario, password }]
 * Devuelve un Buffer del Excel nuevo.
 */
export async function insertarDatosEnPlantilla({
  plantillaPath,
  rows,
  sheetName = "usuarios",
}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(plantillaPath);

  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`No se encontró la hoja "${sheetName}" en la plantilla.`);

  // 1) Tomamos encabezados existentes (fila 1)
  const headerRow = ws.getRow(1);
  const headers = [];
  for (let c = 1; c <= ws.columnCount; c++) {
    headers.push(String(headerRow.getCell(c).value ?? "").trim());
  }

  // 2) Normalizador solo para comparar nombres de columnas
  const norm = (s) =>
    String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // 3) Ubicaciones de columnas de la plantilla (por nombre humano)
  const idxNombre =
    headers.findIndex((h) =>
      ["nombre", "nombre completo"].includes(norm(h))
    ) + 1 || 1; // por defecto col A

  const idxDpi =
    headers.findIndex((h) =>
      ["dpi", "dpi/cui", "cui", "dpi cui"].includes(norm(h))
    ) + 1 || 2; // por defecto col B

  const idxEmail =
    headers.findIndex((h) =>
      ["email", "correo", "correo electronico", "e-mail"].includes(norm(h))
    ) + 1 || 3; // por defecto col C

  // 4) Asegurar columnas usuario/password (crear si no están)
  let idxUsuario =
    headers.findIndex((h) => norm(h) === "usuario") + 1;
  let idxPassword =
    headers.findIndex((h) => norm(h) === "password") + 1;

  const insertAt = ws.columnCount + 1;
  if (!idxUsuario) {
    headerRow.getCell(insertAt).value = "usuario";
    idxUsuario = insertAt;
  }
  if (!idxPassword) {
    const col = idxUsuario === insertAt ? insertAt + 1 : ws.columnCount + 1;
    headerRow.getCell(col).value = "password";
    idxPassword = col;
  }

  // (Opcional) un poco de formato para los nuevos headers
  [idxUsuario, idxPassword].forEach((c) => {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // 5) Limpiar datos previos (dejar encabezado)
  const total = ws.rowCount;
  if (total > 1) ws.spliceRows(2, total - 1);

  // 6) Escribir filas
  let r = 2;
  for (const item of rows) {
    ws.getRow(r).getCell(idxNombre).value = item.nombre ?? "";
    ws.getRow(r).getCell(idxDpi).value = item.dpi ?? "";
    ws.getRow(r).getCell(idxEmail).value = item.email ?? "";
    ws.getRow(r).getCell(idxUsuario).value = item.usuario ?? "";
    ws.getRow(r).getCell(idxPassword).value = item.password ?? "";
    r++;
  }

  // 7) Ajustes rápidos de ancho (opcional)
  ws.getColumn(idxNombre).width = Math.max(ws.getColumn(idxNombre).width ?? 10, 25);
  ws.getColumn(idxEmail).width = Math.max(ws.getColumn(idxEmail).width ?? 10, 28);
  ws.getColumn(idxUsuario).width = 18;
  ws.getColumn(idxPassword).width = 18;

  // 8) Exportar copia en memoria
  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}
