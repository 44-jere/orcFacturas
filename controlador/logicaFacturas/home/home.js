import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
import { modeloIA } from "../../../modelosIA/gemini/gemini.js";
import { handleMulter, uploadImages } from "../../../middlewares/upload.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const homeRouter = Router();

homeRouter.get("/", (req, res) => {
  try {
    const { id } = protegerRuta({ req, res });
    res.redirect("/mainfacturas");
  } catch (e) {
    loginRedirecter({ req, res });
  }
});
