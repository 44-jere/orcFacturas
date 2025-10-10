export async function traerUsuario({ id }) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = db;
  try {
    const { rows } = await client.query(
      `
      SELECT 
        u.id_usuario,
        r.descripcion AS rol,
        m.nombre       AS ministerio,
        u.nombre,
        u.correo,
        u.usuario,
        u.nit_persona,
        u.creado_en,
        u.actualizado_en,
        u.cui,
        enc.nombre     AS encargado
      FROM viaticos.usuarios u
      JOIN viaticos.roles r 
        ON u.id_rol = r.id_rol
      JOIN viaticos.ministerios m
        ON u.id_ministerio = m.id_ministerio
      LEFT JOIN viaticos.usuarios enc 
        ON u.id_createdby = enc.id_usuario
      WHERE u.id_usuario = $1
      `,
      [id]
    );

    if (rows.length === 0) {
      return null; // No se encontró el usuario
    }

    const row = rows[0];
    return {
      id_usuario: row.id_usuario,
      rol: row.rol,
      ministerio: row.ministerio,
      nombre: row.nombre,
      correo: row.correo,
      usuario: row.usuario,
      nit_persona: row.nit_persona,
      creado_en: row.creado_en,
      actualizado_en: row.actualizado_en,
      cui: row.cui,
      encargado: row.encargado || row.ministerio,
    };
  } catch (err) {
    console.error("❌ Error en traerUsuario:", err.message);
    return false;
  } finally {
  }
}

async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.perfilGetUsuario = traerUsuario;
}
asignarMetodos();
