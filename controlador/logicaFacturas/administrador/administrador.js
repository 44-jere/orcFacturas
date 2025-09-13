import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const adminRouter = Router();
adminRouter.get("/", (req, res) => {
  const { id } = protegerRuta({ req, res });
  try {
    res.sendFile(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        "Administrador",
        "AdminMain",
        "admin.html"
      )
    );
  } catch (e) {
    loginRedirecter({ req, res });
  }
});

/**
 * GET /subordinados
 */
adminRouter.get("/subordinados", async (req, res) => {
  try {
    const decoded = protegerRuta({ req, res }); // 🔑 obtiene { id, usuario, role }
    const { page, pageSize } = req.query;

    const resultado = await req.db.traerUsuariosPorSuperiorPaginado({
      id_superior: decoded.id,
      page,
      pageSize,
    });

    res.json(resultado);
  } catch (err) {
    console.error("❌ /subordinados:", err);
    res.status(500).json({ error: "Error al traer subordinados" });
  }
});

/**
 * GET /ticketsAsignados
 */
adminRouter.get("/ticketsAsignados", async (req, res) => {
  try {
    const decoded = protegerRuta({ req, res });
    const { page, pageSize } = req.query;

    const resultado = await req.db.traerTicketsPorUsuarioPaginado({
      id_usuario: decoded.id,
      page,
      pageSize,
    });

    res.json(resultado);
  } catch (err) {
    console.error("❌ /ticketsAsignados:", err);
    res.status(500).json({ error: "Error al traer tickets asignados" });
  }
});

/**
 * PATCH /actualizarTicket
 */
adminRouter.patch("/actualizarTicket", async (req, res) => {
  try {
    protegerRuta({ req, res }); // solo validamos el token

    const { id_ticket, fecha_inicio, fecha_fin, monto_presupuestado } =
      req.body;

    const resultado = await req.db.actualizarTicket({
      id_ticket,
      fecha_inicio,
      fecha_fin,
      monto_presupuestado,
    });

    res.json(resultado);
  } catch (err) {
    console.error("❌ /actualizarTicket:", err);
    res.status(500).json({ error: "Error al actualizar el ticket" });
  }
});

/**
 * POST /crearTicket
 */
adminRouter.post("/crearTicket", async (req, res) => {
  try {
    const decoded = protegerRuta({ req, res });

    const {
      id_usuario_beneficiario,
      fecha_inicio,
      fecha_fin,
      monto_presupuestado,
      total_gastado,
    } = req.body;

    const resultado = await req.db.crearTicket({
      id_usuario_creador: decoded.id,
      id_usuario_beneficiario,
      fecha_inicio,
      fecha_fin,
      monto_presupuestado,
      total_gastado,
    });

    res.json(resultado);
  } catch (err) {
    console.error("❌ /crearTicket:", err);
    res.status(500).json({ error: "Error al crear el ticket" });
  }
});

/**
 * POST /crearTicketHistorial
 */
adminRouter.post("/crearTicketHistorial", async (req, res) => {
  try {
    const decoded = protegerRuta({ req, res });

    const {
      id_ticket,
      accion,
      fecha_efectiva,
      monto_anterior,
      monto_nuevo,
      motivo,
    } = req.body;

    const resultado = await req.db.crearTicketHistorial({
      id_ticket,
      id_usuario_actor: decoded.id,
      accion,
      fecha_efectiva,
      monto_anterior,
      monto_nuevo,
      motivo,
    });

    res.json(resultado);
  } catch (err) {
    console.error("❌ /crearTicketHistorial:", err);
    res.status(500).json({ error: "Error al crear historial del ticket" });
  }
});
