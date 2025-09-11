import { Router } from "express";
import path from "path";
import jwt from "jsonwebtoken";

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.login") });

export const loginRouter = Router();

async function login({ validador, res, req } = {}) {
  const { usuario, password } = req.body;
  try {
    const isValid = await validador({
      usuario,
      password,
    });
    if (!isValid) return res.status(401).send("no encontrado");
    const token = jwt.sign(
      { user: isValid.usuario, id: isValid.id },
      process.env.SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );

    res
      .status(200)
      .cookie("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "produccion", // solo se puede usar en el dominio
        maxAge: 1000 * 60 * 60, // 1h
      })
      .send({ isValid });
  } catch (e) {
    res.status(500).send("no encontrado");
  }
}

loginRouter.get("/", (req, res) =>
  res.sendFile(
    path.join(
      __dirname,
      "..",
      "..",
      "..",
      "public",
      "General",
      "login",
      "login.html"
    )
  )
);

loginRouter.post("/ministerios", async (req, res) => {
  const db = req.db;
  return await login({ req, res, validador: db.loginValidarUsuarioMinisterio });
});

loginRouter.post("/usuarios", async (req, res) => {
  const db = req.db;
  return await login({ req, res, validador: db.loginValidarUsuario });
});
