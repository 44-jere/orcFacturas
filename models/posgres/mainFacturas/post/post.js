// viaticos/modelos/comprobantes/crearComprobante.js
export async function crearComprobante(payload) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = await db.conectar();

  // ---- Validaciones de campos requeridos (sin imagen_hash) ----
  const required = [
    "id_usuario",
    "id_ticket",
    "proveedor",
    "serie",
    "numero_factura",
    "fecha_emision",
    "nit_emisor",
    "nit_receptor",
    "total",
    "descripcion",
    "imagen_factura_url",
    "comida",
    "moneda",
    "tipo_de_gasto",
    "tipo_de_comida",
  ];

  const missing = required.filter((k) => !hasValue(payload[k]));
  if (missing.length) {
    return { ok: false, error: "Faltan campos requeridos", missing };
  }

  // ---- Validaciones de tipo/forma ----
  if (!isPositiveInt(payload.id_usuario) || !isPositiveInt(payload.id_ticket)) {
    return {
      ok: false,
      error: "id_usuario e id_ticket deben ser enteros positivos",
    };
  }

  const fechaEmision = normalizeDate(payload.fecha_emision);
  if (!fechaEmision) {
    return {
      ok: false,
      error: "fecha_emision inválida (usa YYYY-MM-DD o ISO)",
    };
  }

  // total >= 0 y numérico; lo enviamos como string redondeado a 2 decimales
  const totalNum = Number(payload.total);
  if (!Number.isFinite(totalNum)) {
    return { ok: false, error: "total debe ser numérico" };
  }
  if (totalNum < 0) {
    return { ok: false, error: "total no puede ser negativo" };
  }
  const totalRoundedStr = round2str(totalNum);

  const mustBeNonEmptyStrings = [
    "proveedor",
    "serie",
    "numero_factura",
    "nit_emisor",
    "nit_receptor",
    "descripcion",
    "imagen_factura_url",
    "comida",
    "moneda",
    "tipo_de_gasto",
    "tipo_de_comida",
  ];
  const emptyStrings = mustBeNonEmptyStrings.filter(
    (k) => !isNonEmptyString(payload[k])
  );
  if (emptyStrings.length) {
    return {
      ok: false,
      error: "Hay campos de texto vacíos",
      empty: emptyStrings,
    };
  }

  // Timestamps opcionales pero válidos si vienen
  const creadoEnDate = hasValue(payload.creado_en)
    ? toValidDate(payload.creado_en)
    : null;
  if (hasValue(payload.creado_en) && !creadoEnDate) {
    return { ok: false, error: "creado_en inválido (usa Date o ISO)" };
  }
  const actualizadoEnDate = hasValue(payload.actualizado_en)
    ? toValidDate(payload.actualizado_en)
    : null;
  if (hasValue(payload.actualizado_en) && !actualizadoEnDate) {
    return { ok: false, error: "actualizado_en inválido (usa Date o ISO)" };
  }

  // ---- INSERT dinámico (sin imagen_hash) ----
  const cols = [
    "id_usuario",
    "id_ticket",
    "proveedor",
    "serie",
    "numero_factura",
    "fecha_emision",
    "nit_emisor",
    "nit_receptor",
    "total",
    "descripcion",
    "imagen_factura_url",
    "comida",
    "moneda",
    "tipo_de_gasto",
    "tipo_de_comida",
  ];
  const vals = [
    payload.id_usuario,
    payload.id_ticket,
    trimOrNull(payload.proveedor),
    trimOrNull(payload.serie),
    trimOrNull(payload.numero_factura),
    fechaEmision, // YYYY-MM-DD
    trimOrNull(payload.nit_emisor),
    trimOrNull(payload.nit_receptor),
    totalRoundedStr, // string "123.45"
    trimOrNull(payload.descripcion),
    trimOrNull(payload.imagen_factura_url),
    trimOrNull(payload.comida),
    trimOrNull(payload.moneda),
    trimOrNull(payload.tipo_de_gasto),
    trimOrNull(payload.tipo_de_comida),
  ];

  if (creadoEnDate) {
    cols.push("creado_en");
    vals.push(creadoEnDate);
  }
  if (actualizadoEnDate) {
    cols.push("actualizado_en");
    vals.push(actualizadoEnDate);
  }

  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  const columns = cols.join(", ");

  try {
    await client.query("BEGIN");

    // 1) Insert comprobante
    const { rows } = await client.query(
      `
      INSERT INTO viaticos.comprobantes (${columns})
      VALUES (${placeholders})
      RETURNING id_comprobante, creado_en, actualizado_en, total
      `,
      vals
    );
    const inserted = rows[0];

    // 2) Actualizar ticket con el gasto (usa el total insertado)
    await client.query("CALL viaticos.registrar_gasto_sp($1, $2)", [
      payload.id_ticket,
      inserted.total,
    ]);

    await client.query("COMMIT");
    return { ok: true, ...inserted };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    const msg = String(err?.message || err);
    const isCall = /registrar_gasto_sp/i.test(msg);
    return {
      ok: false,
      error: isCall
        ? `Error al actualizar ticket (CALL): ${msg}`
        : `Error al insertar comprobante: ${msg}`,
    };
  } finally {
    // gestionado por tu clase
  }
}

// ---------- Helpers ----------
function hasValue(v) {
  return (
    v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "")
  );
}
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isPositiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}
function normalizeDate(v) {
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  if (typeof v === "string") {
    const d = new Date(v);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  }
  return null;
}
function toValidDate(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  return null;
}
function trimOrNull(s) {
  return typeof s === "string" ? s.trim() : s;
}
function round2str(n) {
  return (Math.round(Number(n) * 100) / 100).toFixed(2);
}

// Registrar en tu singleton como haces con traerUsuario:
async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.mainFacturasCrearComprobante = crearComprobante;
}
asignarMetodos();
