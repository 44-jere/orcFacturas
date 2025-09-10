import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//localhost/perfil/
export const logoutRouter = Router();

logoutRouter.get("/", (req, res) =>
  res.clearCookie("access_token").json("Logged out")
);
