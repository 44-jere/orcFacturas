import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
import { GoogleGenerativeAI } from "../../../modelosIA/gemini/gemini.js";
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

mainFacturasRouter.post("/", upload.array("images", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Faltan imágenes" });
  }

  try {
    const result = await modeloIA.analizarImagenes(req.files);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error procesando imágenes" });
  }
});
