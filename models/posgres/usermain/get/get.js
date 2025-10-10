export async function usuarioPoseeTicket({ id_usuario, id_ticket }) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const db = baseDeDatos;
  const client = db;

  try {
    const { rows } = await client.query(
      `
      SELECT 1
      FROM viaticos.tickets t
      WHERE t.id_ticket = $1
        AND (t.id_usuario_creador = $2 OR t.id_usuario_beneficiario = $2)
      LIMIT 1
      `,
      [id_ticket, id_usuario]
    );

    return rows.length > 0; // true si el usuario está vinculado al ticket
  } catch (err) {
    console.error("❌ Error en usuarioPoseeTicket:", err.message);
    return false;
  } finally {
  }
}

async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.userMainUsuarioPoseeTicket = usuarioPoseeTicket;
}
asignarMetodos();
