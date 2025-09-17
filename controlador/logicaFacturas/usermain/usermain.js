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
