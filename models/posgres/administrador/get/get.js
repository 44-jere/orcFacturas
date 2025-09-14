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

export async function buscarUsuarios({ id, nombre }) {
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
        WHERE u.id_usuario = $1
        LIMIT ${LIMIT}
        `,
        [Number(id)]
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
      WHERE u.nombre ILIKE $1
      ORDER BY u.nombre ASC, u.id_usuario ASC
      LIMIT ${LIMIT}
      `,
      [pattern]
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

async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.administradorTraerUsuariosPorSuperior =
    traerUsuariosPorSuperiorPaginado;
  baseDeDatos.administradorTraerTicketsPorUsuario =
    traerTicketsPorUsuarioPaginado;
  baseDeDatos.administradorBuscarUsuarios = buscarUsuarios;
}
asignarMetodos();
