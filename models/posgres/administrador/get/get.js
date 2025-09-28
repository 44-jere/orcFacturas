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
        t.descripcion,
        u_creador.nombre AS creador,
        u.nombre AS beneficiario
      FROM viaticos.tickets t
      JOIN viaticos.usuarios u_creador
        ON t.id_usuario_creador = u_creador.id_usuario
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
// añade esto arriba, junto con las normalizaciones:
const normBool = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "on";
  }
  return false;
};

async function buscarTicketsActivosYNoActivos({
  id, // id del beneficiario
  idTicket, // id del ticket
  nombre, // nombre del beneficiario
  fechaInicio, // "YYYY-MM-DD"
  fechaFin, // "YYYY-MM-DD"
  idSuperior, // obligatorio
  inactivosOnly = false,
  size = undefined, // <-- NUEVO
}) {
  inactivosOnly = normBool(inactivosOnly);
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const client = await baseDeDatos.conectar();

  // Normalización
  const hasIdTicket =
    idTicket !== undefined &&
    idTicket !== null &&
    Number.isInteger(Number(idTicket)) &&
    Number(idTicket) > 0;

  const hasIdBenf =
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

  // LIMIT opcional (si no se envía size, no aplica LIMIT)
  const parsedSize = Number(size);
  const limit =
    Number.isInteger(parsedSize) && parsedSize > 0
      ? Math.min(parsedSize, 1000) // cap de seguridad
      : null;
  const limitSQL = limit ? `LIMIT ${limit}` : "";

  // Helper condición de “activo”
  const activoDentroRangoSQL = (startIdx, endIdx) =>
    `t.fecha_inicio >= $${startIdx}::date AND t.fecha_fin <= $${endIdx}::date`;

  const activoHoySQL = inactivosOnly
    ? "t.fecha_fin < NOW()"
    : `t.fecha_inicio <= CURRENT_DATE AND t.fecha_fin >= CURRENT_DATE`;

  try {
    // 1) Prioridad absoluta: por idTicket (ignora el resto)
    if (hasIdTicket) {
      const params = [Number(idTicket), Number(idSuperior)];
      const where = [
        "t.id_ticket = $1",
        "(uc.id_superior = $2 OR ub.id_superior = $2)",
      ];
      if (hasFechas) {
        params.push(fechaInicio, fechaFin); // $3, $4
        where.push(activoDentroRangoSQL(3, 4));
      } else {
        where.push(activoHoySQL);
      }

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
        WHERE ${where.join(" AND ")}
        ${limitSQL}
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
        limit: limit ?? null,
      };
    }

    // 2) Segunda prioridad: por id de beneficiario
    if (hasIdBenf) {
      const params = [Number(id), Number(idSuperior)];
      const where = ["t.id_usuario_beneficiario = $1", "ub.id_superior = $2"];
      if (hasFechas) {
        params.push(fechaInicio, fechaFin); // $3, $4
        where.push(activoDentroRangoSQL(3, 4));
      } else {
        where.push(activoHoySQL);
      }

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
        WHERE ${where.join(" AND ")}
        ORDER BY t.fecha_fin ASC, t.id_ticket ASC
        ${limitSQL}
        `,
        params
      );

      return {
        items: rows,
        criteria: {
          by: "idBeneficiario",
          value: Number(id),
          fechaInicio,
          fechaFin,
          idSuperior: Number(idSuperior),
        },
        limit: limit ?? null,
      };
    }

    // 3) Tercera prioridad: por nombre (beneficiario)
    if (hasNombre) {
      const params = [`%${nameTrim}%`, Number(idSuperior)];
      const where = ["ub.nombre ILIKE $1", "ub.id_superior = $2"];
      if (hasFechas) {
        params.push(fechaInicio, fechaFin); // $3, $4
        where.push(activoDentroRangoSQL(3, 4));
      } else {
        where.push(activoHoySQL);
      }

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
        WHERE ${where.join(" AND ")}
        ORDER BY t.fecha_fin ASC, t.id_ticket ASC
        ${limitSQL}
        `,
        params
      );

      return {
        items: rows,
        criteria: {
          by: "nombreBeneficiario",
          value: nameTrim,
          fechaInicio,
          fechaFin,
          idSuperior: Number(idSuperior),
        },
        limit: limit ?? null,
      };
    }

    // 4) Sin idTicket, sin id, sin nombre → activos/inactivos de subordinados del superior
    {
      const params = [Number(idSuperior)];
      const where = ["(uc.id_superior = $1 OR ub.id_superior = $1)"];
      if (hasFechas) {
        params.push(fechaInicio, fechaFin); // $2, $3
        where.push(activoDentroRangoSQL(2, 3));
      } else {
        where.push(activoHoySQL);
      }

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
        WHERE ${where.join(" AND ")}
        ORDER BY t.fecha_fin ASC, t.id_ticket ASC
        ${limitSQL}
        `,
        params
      );

      return {
        items: rows,
        criteria: {
          by: "subordinadosActivos",
          value: "all",
          fechaInicio,
          fechaFin,
          idSuperior: Number(idSuperior),
        },
        limit: limit ?? null,
      };
    }
  } catch (err) {
    console.error("❌ Error en buscarTicketsActivosYNoActivos:", err.message);
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
  baseDeDatos.administradorBuscarTicketsActivosYNoActivos =
    buscarTicketsActivosYNoActivos;
  baseDeDatos.administradorTestQuery = testQuery;
}
asignarMetodos();
