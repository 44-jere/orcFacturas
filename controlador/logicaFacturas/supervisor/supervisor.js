import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const supervisorRouter = Router();

// roles admitidos para admin
const allowedRoles = [1, 2];
//1 = supervisor, 2=administrador
function allowOrRedirect(decoded, res) {
  const role = allowedRoles.indexOf(decoded.role);
  if (role === -1) {
    res.redirect("/perfil");
    return false;
  }
  return true;
}

supervisorRouter.get("/", (req, res) => {
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
        "Supervisor",
        "SupervisorMain",
        "supervisor.html"
      )
    );
  } catch (e) {
    loginRedirecter({ req, res });
  }
});

supervisorRouter.get("/supervisorDescargaFacturas", (req, res) => {
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
        "Supervisor",
        "SupervisorDescargaFacturasGeneral",
        "DescargaFacturasSupervisor.html"
      )
    );
  } catch (e) {
    loginRedirecter({ req, res });
  }
});
