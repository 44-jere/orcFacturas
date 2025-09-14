import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
import { modeloIA } from "../../../modelosIA/gemini/gemini.js";
import { handleMulter, uploadImages } from "../../../middlewares/upload.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mainFacturasRouter = Router();
const allowedRoles = [3];
//3=empleados
function denegarNoEmpleados({ res, role }) {
  if (allowedRoles.indexOf(role) === -1) {
    res.redirect("/admin");
    return true;
  }
}
mainFacturasRouter.get("/", (req, res) => {
  try {
    const { id, role } = protegerRuta({ req, res });
    if (denegarNoEmpleados({ res, role })) return;
    res.sendFile(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        "User",
        "mainfacturas",
        "index.html"
      )
    );
  } catch (e) {
    loginRedirecter({ req, res });
  }
});

mainFacturasRouter.post(
  "/",
  handleMulter(uploadImages), // 👈 multer aislado y con errores capturados
  async (req, res, next) => {
    try {
      const { id, role } = protegerRuta({ req, res });
      if (denegarNoEmpleados({ res, role })) return;

      if (!req.files?.length) {
        return res.status(400).json({ error: "No se enviaron imágenes" });
      }

      const result = await modeloIA.analizarImagenes(req.files);
      res.json(result);
    } catch (e) {
      next(e); // deja que el handler global formatee
    }
  }
);
