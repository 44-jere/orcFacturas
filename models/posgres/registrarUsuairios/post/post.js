export async function registrarUsuarios({
  id_rol,
  id_ministerio,
  id_createdby,
  id_superior,
  usuarios = [],
}) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = db;

  try {
    if (!usuarios.length) {
      console.warn("⚠️ registrarUsuarios: lista de usuarios vacía.");
      return 0;
    }

    const query = `
      INSERT INTO viaticos.usuarios (
        id_rol,
        id_ministerio,
        nombre,
        correo,
        usuario,
        password_hash,
        nit_persona,
        creado_en,
        actualizado_en,
        id_createdby,
        cui,
        id_superior
      )
      VALUES
        ($1, $2, $3, $4, $5, $6, '', NOW(), NOW(), $7, $8, $9)
      RETURNING id_usuario
    `;

    let insertados = 0;

    for (const u of usuarios) {
      const nombre = u.nombre?.trim() || "";
      const correo = u.email ?? "";
      const usuario = u.usuario?.trim() || "";
      const password = u.password?.trim() || "";
      const cui = u.dpi ?? "0000000000000";

      await client.query(query, [
        id_rol,
        id_ministerio,
        nombre,
        correo,
        usuario,
        password,
        id_createdby,
        cui,
        id_superior,
      ]);

      insertados++;
    }

    console.log(`✅ ${insertados} usuario(s) registrados exitosamente.`);
    return insertados;
  } catch (err) {
    console.error("❌ Error en registrarUsuarios:", err.message);
    return 0;
  }
}

export async function AgregarRoles({ roles = [] }) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = db;

  try {
    if (!roles.length) {
      console.warn("⚠️ AgregarRoles: lista vacía.");
      return 0;
    }

    const query = `
      INSERT INTO viaticos.roles (descripcion)
      VALUES ($1)
      RETURNING id_rol
    `;

    let insertados = 0;

    for (const rol of roles) {
      const descripcion = rol?.descripcion?.trim();
      if (!descripcion) continue; // ignorar vacíos

      await client.query(query, [descripcion]);
      insertados++;
    }

    console.log(`✅ ${insertados} rol(es) insertado(s) correctamente.`);
    return insertados;
  } catch (err) {
    console.error("❌ Error en AgregarRoles:", err.message);
    return 0;
  }
}

export async function AgregarMinisterios({ ministerios = [] }) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = db;

  try {
    if (!ministerios.length) {
      console.warn("⚠️ AgregarMinisterios: lista vacía.");
      return 0;
    }

    const query = `
      INSERT INTO viaticos.ministerios (
        nombre,
        activo,
        usuario,
        password_hash,
        creado_en,
        actualizado_en
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id_ministerio
    `;

    let insertados = 0;

    for (const m of ministerios) {
      const nombre = m?.nombre?.trim();
      if (!nombre) continue; // ignorar sin nombre

      const activo = m?.activo ?? true;
      const usuario = m?.usuario ?? "";
      const password_hash = m?.password_hash ?? "";

      await client.query(query, [nombre, activo, usuario, password_hash]);
      insertados++;
    }

    console.log(`✅ ${insertados} ministerio(s) insertado(s) correctamente.`);
    return insertados;
  } catch (err) {
    console.error("❌ Error en AgregarMinisterios:", err.message);
    return 0;
  }
}

async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.registrarUsuariosRegistrar = registrarUsuarios;
  baseDeDatos.registrarUsuariosAgregarRoles = AgregarRoles;
  baseDeDatos.registrarUsuariosAgregarMinisterios = AgregarMinisterios;
}
asignarMetodos();
