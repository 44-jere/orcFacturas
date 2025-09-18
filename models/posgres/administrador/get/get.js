export async function traerUsuariosPorSuperiorPaginado({
  id_superior,
  page = 1,
  pageSize = 20,
}) {
  if (id_superior == null)
    return { error: true, message: "id_superior es requerido" };

  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const client = await baseDeDatos.conectar();

  const limit = Math.max(1, Math.min(pageSize, 100));
  const offset = (Math.max(1, page) - 1) * limit;

  try {
    // 1) total
    const { rows: r1 } = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM viaticos.usuarios u
       WHERE u.id_superior = $1`,
      [id_superior]
    );
    const total = r1[0]?.total ?? 0;

    // 2) page
    const { rows: items } = await client.query(
      `
      SELECT
        u.id_usuario,
        u.id_superior,
        u.nombre,
        u.correo,
        u.usuario,
        u.nit_persona,
        u.cui,
        u.creado_en,
        u.actualizado_en,
        r.descripcion AS rol,
        m.nombre      AS ministerio,
        sup.nombre    AS nombre_superior
      FROM viaticos.usuarios u
      JOIN viaticos.roles r
        ON u.id_rol = r.id_rol
      JOIN viaticos.ministerios m
        ON u.id_ministerio = m.id_ministerio
      LEFT JOIN viaticos.usuarios sup
        ON u.id_superior = sup.id_usuario
      WHERE u.id_superior = $1
      ORDER BY u.nombre ASC, u.id_usuario ASC
      LIMIT $2 OFFSET $3
      `,
      [id_superior, limit, offset]
    );

    return {
      items,
      page,
      pageSize: limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  } catch (err) {
    console.error("❌ Error en traerUsuariosPorSuperiorPaginado:", err.message);
    return { error: true, message: err.message };
  }
}

export async function buscarUsuarios({ id, nombre, idSuperior }) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const client = await baseDeDatos.conectar();

  // Normalizamos entrada
  const hasId =
    id !== undefined &&
    id !== null &&
    Number.isInteger(Number(id)) &&
    Number(id) > 0;
  const nameTrim = typeof nombre === "string" ? nombre.trim() : "";
  const hasNombre = nameTrim.length > 0;

  if (!hasId && !hasNombre) {
    return { error: true, message: "Debe indicar 'id' o 'nombre'." };
  }

  const LIMIT = 20;

  try {
    if (hasId) {
      // Preferencia por ID si vienen ambos
      const { rows } = await client.query(
        `
        SELECT
          u.id_usuario,
          u.id_superior,
          u.nombre,
          u.correo,
          u.usuario,
          u.nit_persona,
          u.cui,
          u.creado_en,
          u.actualizado_en,
          r.descripcion AS rol,
          m.nombre      AS ministerio,
          sup.nombre    AS nombre_superior
        FROM viaticos.usuarios u
        JOIN viaticos.roles r
          ON u.id_rol = r.id_rol
        JOIN viaticos.ministerios m
          ON u.id_ministerio = m.id_ministerio
        LEFT JOIN viaticos.usuarios sup
          ON u.id_superior = sup.id_usuario
        WHERE u.id_usuario = $1 AND u.id_rol = 3 AND u.id_superior = $2
        LIMIT ${LIMIT}
        `,
        [Number(id), Number(idSuperior)]
      );

      // Devolvemos como lista para mantener formato homogéneo
      return {
        items: rows,
        criteria: { by: "id", value: Number(id) },
        limit: LIMIT,
      };
    }

    // Búsqueda por nombre (parcial, case-insensitive)
    const pattern = `%${nameTrim}%`;
    const { rows } = await client.query(
      `
      SELECT
        u.id_usuario,
        u.id_superior,
        u.nombre,
        u.correo,
        u.usuario,
        u.nit_persona,
        u.cui,
        u.creado_en,
        u.actualizado_en,
        r.descripcion AS rol,
        m.nombre      AS ministerio,
        sup.nombre    AS nombre_superior
      FROM viaticos.usuarios u
      JOIN viaticos.roles r
        ON u.id_rol = r.id_rol
      JOIN viaticos.ministerios m
        ON u.id_ministerio = m.id_ministerio
      LEFT JOIN viaticos.usuarios sup
        ON u.id_superior = sup.id_usuario
      WHERE u.nombre ILIKE $1 AND u.id_rol = 3 AND u.id_superior = $2
      ORDER BY u.nombre ASC, u.id_usuario ASC
      LIMIT ${LIMIT}
      `,
      [pattern, Number(idSuperior)]
    );

    return {
      items: rows,
      criteria: { by: "nombre", value: nameTrim },
      limit: LIMIT,
    };
  } catch (err) {
    console.error("❌ Error en buscarUsuarios:", err.message);
    return { error: true, message: err.message };
  }
}

export async function traerTicketsPorUsuarioPaginado({
  id_usuario,
  page = 1,
  pageSize = 20,
}) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const client = await baseDeDatos.conectar();

  const limit = Math.max(1, Math.min(pageSize, 100)); // cap 100
  const offset = (Math.max(1, page) - 1) * limit;

  try {
    // 1) total
    const { rows: r1 } = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM viaticos.tickets t
      WHERE t.id_usuario_creador = $1
         OR t.id_usuario_beneficiario = $1
      `,
      [id_usuario]
    );
    const total = r1[0]?.total ?? 0;

    // 2) page
    const { rows: items } = await client.query(
      `
      SELECT
        t.id_ticket,
        t.id_usuario_creador,
        t.id_usuario_beneficiario,
        t.fecha_inicio,
        t.fecha_fin,
        t.monto_presupuestado,
        t.total_gastado,
        t.creado_en,
        t.actualizado_en,
        u.nombre AS beneficiario
      FROM viaticos.tickets t
      JOIN viaticos.usuarios u
        ON t.id_usuario_beneficiario = u.id_usuario
      WHERE t.id_usuario_creador = $1
         OR t.id_usuario_beneficiario = $1
      ORDER BY t.creado_en DESC, t.id_ticket DESC
      LIMIT $2 OFFSET $3
      `,
      [id_usuario, limit, offset]
    );

    return {
      items,
      page,
      pageSize: limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  } catch (err) {
    console.error("❌ Error en traerTicketsPorUsuarioPaginado:", err.message);
    return { error: true, message: err.message };
  }
}

export async function buscarTicketsActivos({
  id,
  idTicket,
  nombre,
  fechaInicio,
  fechaFin,
  idSuperior, // 👈 nuevo (obligatorio)
}) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const client = await baseDeDatos.conectar();

  // Normalización
  const hasIdTicket =
    idTicket !== undefined &&
    idTicket !== null &&
    Number.isInteger(Number(idTicket)) &&
    Number(idTicket) > 0;

  const hasIdUsuario =
    id !== undefined &&
    id !== null &&
    Number.isInteger(Number(id)) &&
    Number(id) > 0;

  const nameTrim = typeof nombre === "string" ? nombre.trim() : "";
  const hasNombre = nameTrim.length > 0;

  const hasFechas =
    typeof fechaInicio === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio.trim()) &&
    typeof fechaFin === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(fechaFin.trim());

  const hasSuperior =
    idSuperior !== undefined &&
    idSuperior !== null &&
    Number.isInteger(Number(idSuperior)) &&
    Number(idSuperior) > 0;

  if (!hasSuperior) {
    return { error: true, message: "Debe indicar 'idSuperior'." };
  }

  const LIMIT = 20;

  try {
    // 1) Buscar por idTicket (prioridad absoluta)
    if (hasIdTicket) {
      const params = [Number(idTicket)];
      let whereParts = ["t.id_ticket = $1"];

      let idx = 2;

      if (hasFechas) {
        params.push(fechaInicio, fechaFin);
        whereParts.push(
          `t.fecha_inicio >= $${idx++}::date AND t.fecha_fin <= $${idx++}::date`
        );
      }

      const supIdx = idx;
      params.push(Number(idSuperior));
      whereParts.push(
        `(uc.id_superior = $${supIdx} OR ub.id_superior = $${supIdx})`
      );

      const { rows } = await client.query(
        `
        SELECT
          t.id_ticket,
          t.id_usuario_creador,
          t.id_usuario_beneficiario,
          t.fecha_inicio,
          t.fecha_fin,
          t.monto_presupuestado,
          t.total_gastado,
          t.creado_en,
          t.actualizado_en,
          t.descripcion,
          uc.nombre AS nombre_creador,
          ub.nombre AS nombre_beneficiario
        FROM viaticos.tickets t
        JOIN viaticos.usuarios uc ON uc.id_usuario = t.id_usuario_creador
        JOIN viaticos.usuarios ub ON ub.id_usuario = t.id_usuario_beneficiario
        WHERE ${whereParts.join(" AND ")}
        LIMIT ${LIMIT}
        `,
        params
      );

      return {
        items: rows,
        criteria: {
          by: "idTicket",
          value: Number(idTicket),
          fechaInicio,
          fechaFin,
          idSuperior: Number(idSuperior),
        },
        limit: LIMIT,
      };
    }

    // 2) Buscar por idUsuario (segunda prioridad)
    if (hasIdUsuario) {
      const params = [Number(id)];
      let whereParts = [
        "(t.id_usuario_creador = $1 OR t.id_usuario_beneficiario = $1)",
      ];

      let idx = 2;

      if (hasFechas) {
        params.push(fechaInicio, fechaFin);
        whereParts.push(
          `t.fecha_inicio >= $${idx++}::date AND t.fecha_fin <= $${idx++}::date`
        );
      }

      const supIdx = idx;
      params.push(Number(idSuperior));
      whereParts.push(
        `(uc.id_superior = $${supIdx} OR ub.id_superior = $${supIdx})`
      );

      const { rows } = await client.query(
        `
        SELECT
          t.id_ticket,
          t.id_usuario_creador,
          t.id_usuario_beneficiario,
          t.fecha_inicio,
          t.fecha_fin,
          t.monto_presupuestado,
          t.total_gastado,
          t.creado_en,
          t.actualizado_en,
          t.descripcion,
          uc.nombre AS nombre_creador,
          ub.nombre AS nombre_beneficiario
        FROM viaticos.tickets t
        JOIN viaticos.usuarios uc ON uc.id_usuario = t.id_usuario_creador
        JOIN viaticos.usuarios ub ON ub.id_usuario = t.id_usuario_beneficiario
        WHERE ${whereParts.join(" AND ")}
        ORDER BY t.fecha_fin ASC, t.id_ticket ASC
        LIMIT ${LIMIT}
        `,
        params
      );

      return {
        items: rows,
        criteria: {
          by: "idUsuario",
          value: Number(id),
          fechaInicio,
          fechaFin,
          idSuperior: Number(idSuperior),
        },
        limit: LIMIT,
      };
    }

    // 3) Filtros opcionales (nombre + rango de fechas) SIEMPRE filtrando por idSuperior
    const params = [];
    let idx = 1;
    const whereParts = [];

    if (hasFechas) {
      params.push(fechaInicio, fechaFin);
      whereParts.push(
        `t.fecha_inicio >= $${idx++}::date AND t.fecha_fin <= $${idx++}::date`
      );
    }

    if (hasNombre) {
      params.push(`%${nameTrim}%`);
      whereParts.push(`(uc.nombre ILIKE $${idx} OR ub.nombre ILIKE $${idx})`);
      idx++;
    }

    // filtro por superior (obligatorio)
    params.push(Number(idSuperior));
    whereParts.push(`(uc.id_superior = $${idx} OR ub.id_superior = $${idx})`);

    const whereSql = `WHERE ${whereParts.join(" AND ")}`;

    const { rows } = await client.query(
      `
      SELECT
        t.id_ticket,
        t.id_usuario_creador,
        t.id_usuario_beneficiario,
        t.fecha_inicio,
        t.fecha_fin,
        t.monto_presupuestado,
        t.total_gastado,
        t.creado_en,
        t.actualizado_en,
        t.descripcion,
        uc.nombre AS nombre_creador,
        ub.nombre AS nombre_beneficiario
      FROM viaticos.tickets t
      JOIN viaticos.usuarios uc ON uc.id_usuario = t.id_usuario_creador
      JOIN viaticos.usuarios ub ON ub.id_usuario = t.id_usuario_beneficiario
      ${whereSql}
      ORDER BY t.fecha_fin ASC, t.id_ticket ASC
      LIMIT ${LIMIT}
      `,
      params
    );

    return {
      items: rows,
      criteria: {
        by: hasNombre ? "nombre" : "rangoFechas",
        value: hasNombre ? nameTrim : "all",
        fechaInicio,
        fechaFin,
        idSuperior: Number(idSuperior),
      },
      limit: LIMIT,
    };
  } catch (err) {
    console.error("❌ Error en buscarTicketsActivos:", err.message);
    return { error: true, message: err.message };
  }
}

async function testQuery({}) {
  try {
    const { baseDeDatos } = await import("../../baseDeDatos.js");
    const client = await baseDeDatos.conectar();

    const { rows } = await client.query("$2 , $1", [param1, param2]);
  } catch (e) {}
}

async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.administradorTraerUsuariosPorSuperior =
    traerUsuariosPorSuperiorPaginado;
  baseDeDatos.administradorTraerTicketsPorUsuario =
    traerTicketsPorUsuarioPaginado;
  baseDeDatos.administradorBuscarUsuarios = buscarUsuarios;
  baseDeDatos.administradorBuscarTicketsActivos = buscarTicketsActivos;
  baseDeDatos.administradorTestQuery = testQuery;
}
asignarMetodos();
