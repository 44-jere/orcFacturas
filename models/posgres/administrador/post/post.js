export async function crearTicket({
  id_usuario_creador,
  id_usuario_beneficiario,
  fecha_inicio,
  fecha_fin,
  monto_presupuestado,
  total_gastado = 0,
  descripcion_ticket,
}) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const client = await baseDeDatos.conectar();

  try {
    const { rows } = await client.query(
      `
      INSERT INTO viaticos.tickets (
        id_usuario_creador,
        id_usuario_beneficiario,
        fecha_inicio,
        fecha_fin,
        monto_presupuestado,
        total_gastado,
        creado_en,
        actualizado_en,
        descripcion
      ) VALUES ($1,$2,$3,$4,$5,$6,now(),now(),$7)
      RETURNING id_ticket, creado_en, actualizado_en
      `,
      [
        id_usuario_creador,
        id_usuario_beneficiario,
        fecha_inicio,
        fecha_fin,
        monto_presupuestado,
        total_gastado,
        descripcion_ticket,
      ]
    );

    return rows[0]; // devuelve id_ticket y timestamps
  } catch (err) {
    console.error("❌ Error en crearTicket:", err.message);
    return false;
  }
}

// Crear registro en viaticos.ticket_historial
// Requeridos: id_ticket, id_usuario_actor, accion, fecha_efectiva, monto_anterior, monto_nuevo
// Opcional: motivo
export async function crearTicketHistorial(payload = {}) {
  const {
    id_ticket,
    id_usuario_actor,
    accion,
    fecha_efectiva,
    monto_anterior,
    monto_nuevo,
    motivo,
  } = payload;

  // Validaciones estrictas
  if (id_ticket == null)
    return { error: true, message: "id_ticket es requerido" };
  if (id_usuario_actor == null)
    return { error: true, message: "id_usuario_actor es requerido" };
  if (!accion) return { error: true, message: "accion es requerida" };
  if (!fecha_efectiva)
    return { error: true, message: "fecha_efectiva es requerida (YYYY-MM-DD)" };
  if (monto_anterior == null)
    return { error: true, message: "monto_anterior es requerido" };
  if (monto_nuevo == null)
    return { error: true, message: "monto_nuevo es requerido" };

  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const client = await baseDeDatos.conectar();

  try {
    const cols = [
      "id_ticket",
      "id_usuario_actor",
      "accion",
      "fecha_efectiva",
      "monto_anterior",
      "monto_nuevo",
      "creado_en",
    ];
    const params = ["$1", "$2", "$3", "$4", "$5", "$6", "now()"];
    const values = [
      id_ticket,
      id_usuario_actor,
      accion,
      fecha_efectiva,
      monto_anterior,
      monto_nuevo,
    ];
    let idx = 7;

    if (motivo != null) {
      cols.push("motivo");
      params.push(`$${idx++}`);
      values.push(motivo);
    }

    const sql = `
      INSERT INTO viaticos.ticket_historial (${cols.join(", ")})
      VALUES (${params.join(", ")})
      RETURNING
        id_historial,
        id_ticket,
        id_usuario_actor,
        accion,
        monto_anterior,
        monto_nuevo,
        fecha_efectiva,
        motivo,
        creado_en
    `;

    const { rows } = await client.query(sql, values);
    return rows[0];
  } catch (err) {
    console.error("❌ Error en crearTicketHistorial:", err.message);
    return { error: true, message: err.message };
  }
}
async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.administradorCrearTicket = crearTicket;
  baseDeDatos.administradorCrearTicketHistorial = crearTicketHistorial;
}
asignarMetodos();
