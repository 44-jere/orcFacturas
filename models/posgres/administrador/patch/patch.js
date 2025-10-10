export async function actualizarTicket({
  id_ticket,
  fecha_inicio,
  fecha_fin,
  monto_presupuestado,
}) {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  const client = baseDeDatos;

  try {
    const campos = [];
    const valores = [];
    let index = 1;

    if (fecha_inicio !== undefined) {
      campos.push(`fecha_inicio = $${index++}`);
      valores.push(fecha_inicio);
    }
    if (fecha_fin !== undefined) {
      campos.push(`fecha_fin = $${index++}`);
      valores.push(fecha_fin);
    }
    if (monto_presupuestado !== undefined) {
      campos.push(`monto_presupuestado = $${index++}`);
      valores.push(monto_presupuestado);
    }

    if (campos.length === 0) {
      return { mensaje: "No se enviaron campos para actualizar." };
    }

    campos.push(`actualizado_en = now()`);

    const query = `
      UPDATE viaticos.tickets
      SET ${campos.join(", ")}
      WHERE id_ticket = $${index}
      RETURNING id_ticket, fecha_inicio, fecha_fin, monto_presupuestado, actualizado_en
    `;
    valores.push(id_ticket);

    const { rows } = await client.query(query, valores);
    return rows[0] || null;
  } catch (err) {
    console.error("❌ Error en actualizarTicket:", err.message);
    return false;
  }
}

async function asignarMetodos() {
  const { baseDeDatos } = await import("../../baseDeDatos.js");
  baseDeDatos.administradorActualizarTicket = actualizarTicket;
}
asignarMetodos();
