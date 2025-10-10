import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const userMainRouter = Router();

// roles admitidos para admin
const allowedRoles = [3];
//1 = supervisor, 2=administrador
function allowOrRedirect(decoded, res) {
  const role = allowedRoles.indexOf(decoded.role);
  if (role === -1) {
    res.redirect("/admin");
    return false;
  }
  return true;
}

userMainRouter.get("/", (req, res) => {
  const decoded = protegerRuta({ req, res });
  if (!decoded) return; // protegerRuta ya manejó el flujo
  if (!allowOrRedirect(decoded, res)) return;

  try {
    res.sendFile(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        "User",
        "usermain",
        "IndexUser.html"
      )
    );
  } catch (e) {
    loginRedirecter({ req, res });
  }
});

userMainRouter.get("/buscarTicketsActivos", async (req, res) => {
  try {
    const decoded = protegerRuta({ req, res });
    if (!decoded) return;
    if (!allowOrRedirect(decoded, res)) return;

    const { idTicket, fechaInicio, fechaFin, inactivosOnly, size } = req.query;
    const norm = (v) =>
      typeof v === "string" && v.trim() === "" ? undefined : v;
    const response = await req.db.administradorBuscarTicketsActivosYNoActivos({
      id: norm(decoded.id), //id del beneficiario/subordinado
      idTicket: norm(idTicket),
      fechaInicio: norm(fechaInicio),
      fechaFin: norm(fechaFin),
      idSuperior: norm(decoded.superiorId), // ← obligatorio
      inactivosOnly,
      size,
    });
    res.send(response);
  } catch (err) {
    console.error("❌ /buscarTicketsActivos:", err);
    res.status(500).json({ error: "Error al traer tickets asignados" });
  }
});

userMainRouter.get("/ticketEmpleado", async (req, res) => {
  try {
    const decoded = protegerRuta({ req, res });
    if (!decoded) return;
    if (!allowOrRedirect(decoded, res)) return;

    const { page, pageSize } = req.query;

    const resultado = await req.db.administradorTraerTicketsPorUsuario({
      id_usuario: decoded.id,
      page,
      pageSize,
    });

    res.json(resultado);
  } catch (err) {
    console.error("❌ /ticketEmpleado:", err);
    res.status(500).json({ error: "Error al traer tickets asignados" });
  }
});
