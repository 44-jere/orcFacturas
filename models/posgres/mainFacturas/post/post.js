export async function crearComprobante(payload) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = await db.conectar();

  // ===== Helpers =====
  const hasValue = (v) => v !== undefined && v !== null && v !== "";
  const isNonEmptyString = (s) =>
    typeof s === "string" ? s.trim().length > 0 : hasValue(s);
  const isPositiveInt = (n) => Number.isInteger(Number(n)) && Number(n) > 0;
  const round2str = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);
  const toYMD = (d) => {
    if (!hasValue(d)) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  const userData = payload?.userData ?? {};
  const iaData = payload?.iaData ?? {};

  // Combina userData/iaData en objeto { registroUsuario, registroIA }
  const dualField = (key, transform = (x) => x) => ({
    registroUsuario: hasValue(userData[key]) ? transform(userData[key]) : null,
    registroIA: hasValue(iaData[key]) ? transform(iaData[key]) : null,
  });

  // ===== Validaciones base =====
  if (
    !isPositiveInt(userData.id_usuario) ||
    !isPositiveInt(userData.id_ticket)
  ) {
    return {
      ok: false,
      error:
        "id_usuario e id_ticket deben venir en userData y ser enteros positivos",
    };
  }

  // fecha_emision obligatoria del usuario
  const fechaUsuario = toYMD(userData.fecha_emision);
  if (!fechaUsuario) {
    return {
      ok: false,
      error: "userData.fecha_emision inválida (usa YYYY-MM-DD o ISO)",
    };
  }
  const fechaIA = hasValue(iaData.fecha_emision)
    ? toYMD(iaData.fecha_emision)
    : null;
  if (hasValue(iaData.fecha_emision) && !fechaIA) {
    return {
      ok: false,
      error: "iaData.fecha_emision inválida (usa YYYY-MM-DD o ISO)",
    };
  }

  // Campos JSONB donde aceptamos valor desde userData o iaData (al menos uno)
  const jsonKeys = [
    "proveedor",
    "serie",
    "numero_factura",
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

  // Requeridos: que exista valor en userData o iaData
  const missingEither = jsonKeys.filter(
    (k) => !hasValue(userData[k]) && !hasValue(iaData[k])
  );
  if (missingEither.length) {
    return {
      ok: false,
      error: "Faltan campos (ni en userData ni en iaData)",
      missing: missingEither,
    };
  }

  // Validar cadenas vacías explícitas
  const badStrings = jsonKeys.filter((k) =>
    [userData[k], iaData[k]].some(
      (v) => typeof v === "string" && v.trim().length === 0
    )
  );
  if (badStrings.length) {
    return {
      ok: false,
      error: "Hay campos vacíos (string en blanco)",
      empty: badStrings,
    };
  }

  // total: tomar preferentemente el del usuario; si no, el de IA
  const totalCandidate = hasValue(userData.total)
    ? userData.total
    : iaData.total;
  const totalNum = Number(totalCandidate);
  if (!Number.isFinite(totalNum)) {
    return {
      ok: false,
      error: "total debe ser numérico (en userData o iaData)",
    };
  }
  if (totalNum < 0) {
    return { ok: false, error: "total no puede ser negativo" };
  }

  // Construir objetos duales; total se normaliza a string con 2 decimales
  const totalDual = dualField("total", (x) => round2str(x));

  const cols = [
    "id_usuario",
    "id_ticket",
    "proveedor",
    "serie",
    "numero_factura",
    "nit_emisor",
    "nit_receptor",
    "total",
    "descripcion",
    "imagen_factura_url",
    "comida",
    "moneda",
    "tipo_de_gasto",
    "tipo_de_comida",
    "fecha_emision_registro_usuario",
  ];
  const vals = [
    Number(userData.id_usuario),
    Number(userData.id_ticket),
    dualField("proveedor"),
    dualField("serie"),
    dualField("numero_factura"),
    dualField("nit_emisor"),
    dualField("nit_receptor"),
    totalDual,
    dualField("descripcion"),
    dualField("imagen_factura_url"),
    dualField("comida"),
    dualField("moneda"),
    dualField("tipo_de_gasto"),
    dualField("tipo_de_comida"),
    fechaUsuario,
  ];

  if (fechaIA) {
    cols.push("fecha_emision_registro_ia");
    vals.push(fechaIA);
  }

  // motivo solo desde userData (si quieres, puedes también considerar iaData)
  if (hasValue(userData.motivo)) {
    cols.push("motivo");
    vals.push(userData.motivo);
  }

  // creado_en / actualizado_en opcionales (ISO con tiempo si viene)
  if (hasValue(userData.creado_en)) {
    const dt = new Date(userData.creado_en);
    if (isNaN(dt.getTime()))
      return { ok: false, error: "userData.creado_en inválido" };
    cols.push("creado_en");
    vals.push(dt.toISOString());
  }
  if (hasValue(userData.actualizado_en)) {
    const dt = new Date(userData.actualizado_en);
    if (isNaN(dt.getTime()))
      return { ok: false, error: "userData.actualizado_en inválido" };
    cols.push("actualizado_en");
    vals.push(dt.toISOString());
  }

  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  const columns = cols.join(", ");

  try {
    await client.query("BEGIN");

    // INSERT: pg convierte objetos JS -> JSONB en columnas jsonb
    const { rows } = await client.query(
      `INSERT INTO viaticos.comprobantes (${columns})
       VALUES (${placeholders})
       RETURNING id_comprobante, creado_en, actualizado_en, total`,
      vals
    );

    // Registrar gasto en el ticket usando el número consolidado
    await client.query("CALL viaticos.registrar_gasto_sp($1, $2)", [
      Number(userData.id_ticket),
      totalNum,
    ]);

    await client.query("COMMIT");
    return { ok: true, ...rows[0] };
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
  }
}

// Registrar en tu singleton
async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.mainFacturasCrearComprobante = crearComprobante;
}
asignarMetodos();
