export async function obtenerMinisterios() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = db;

  try {
    const { rows } = await client.query(`
      SELECT 
        id_ministerio,
        nombre,
        activo,
        usuario,
        password_hash,
        creado_en,
        actualizado_en
      FROM viaticos.ministerios
      ORDER BY nombre ASC
    `);

    return rows;
  } catch (err) {
    console.error("❌ Error en obtenerMinisterios:", err.message);
    return [];
  }
}

export async function obtenerRoles() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = db;

  try {
    const { rows } = await client.query(`
      SELECT 
        id_rol,
        descripcion
      FROM viaticos.roles
      ORDER BY descripcion ASC
    `);

    return rows;
  } catch (err) {
    console.error("❌ Error en obtenerRoles:", err.message);
    return [];
  }
}

async function asignarMetodosMinisterios() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.registrarUsuariosObtenerMinisterios = obtenerMinisterios;
  baseDeDatos.registrarUsuariosObtenerRoles = obtenerRoles;
}
asignarMetodosMinisterios();
