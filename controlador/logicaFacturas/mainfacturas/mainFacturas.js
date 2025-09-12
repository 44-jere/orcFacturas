import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
import { modeloIA } from "../../../modelosIA/gemini/gemini.js";
import { handleMulter, uploadImages } from "../../../middlewares/upload.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//localhost/perfil/
export const mainFacturasRouter = Router();

mainFacturasRouter.get("/", (req, res) => {
  try {
    const { id } = protegerRuta({ req, res });
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
      protegerRuta({ req, res });

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
