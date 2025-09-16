import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const perfilRouter = Router();

perfilRouter.get("/", (req, res) => {
  const { id } = protegerRuta({ req, res });
  try {
    res.sendFile(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        "General",
        "perfil",
        "PerfilIndex.html"
      )
    );
  } catch (e) {
    loginRedirecter({ req, res });
  }
});

perfilRouter.get("/userData", async (req, res) => {
  const { id } = protegerRuta({ req, res });

  try {
    const db = req.db;
    const response = await db.perfilGetUsuario({ id });
    res.status(200).send(response);
  } catch (e) {
    console.log(e);
    res.status(404).send("no encontrado");
  }
});
