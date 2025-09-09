import bcrypt from "bcrypt";
// logear usuarios
async function validarLogin({ usuario, password, tabla }) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = await db.conectar();

  try {
    // ✅ validación del nombre de tabla para evitar SQL Injection
    const tablasPermitidas = ["ministerios", "usuarios"];
    if (!tablasPermitidas.includes(tabla)) {
      throw new Error(`Tabla no permitida: ${tabla}`);
    }

    // ✅ obtener registro por usuario
    const query = `
      SELECT id_usuario, usuario, password_hash
      FROM ${tabla}
      WHERE usuario = $1
      LIMIT 1
    `;
    const values = [usuario];

    console.time("⏱ query_usuario");
    const { rows } = await client.query(query, values);
    console.timeEnd("⏱ query_usuario");

    if (rows.length === 0) {
      console.log("⚠️ Usuario no encontrado");
      return false;
    }

    const fila = rows[0];

    // ✅ comparar contraseña ingresada con el hash guardado
    console.time("⏱ bcrypt_compare");
    const esValido = await bcrypt.compare(password, fila.password_hash);
    console.timeEnd("⏱ bcrypt_compare");

    if (esValido) {
      console.log("✅ Usuario y contraseña correctos");
      return { id: fila.id_usuario, usuario: fila.usuario };
    } else {
      console.log("❌ Usuario y contraseña incorrectos");
      return false;
    }
  } catch (err) {
    console.error("❌ Error en validarUsuario:", err.message);
    // Mantenemos el contrato devolviendo false para no romper nada
    return false;
  } finally {
    // ✅ MUY IMPORTANTE: liberar la conexión de la pool
    try { client.release(); } catch {}
  }
}

async function validarUsuarioMinisterio({ usuario, password }) {
  const tabla = "ministerios";
  return await validarLogin({ usuario, password, tabla });
}

async function validarUsuario({ usuario, password }) {
  const tabla = "usuarios";
  return await validarLogin({ usuario, password, tabla });
}
async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.loginValidarUsuarioMinisterio = validarUsuarioMinisterio;
  baseDeDatos.loginValidarUsuario = validarUsuario;
}
asignarMetodos();
