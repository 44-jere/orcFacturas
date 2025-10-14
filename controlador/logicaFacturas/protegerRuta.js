import jwt from "jsonwebtoken";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { loginRedirecter } from "./redirigirAlLogin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga el .env que está JUNTO a baseDeDatos.js
dotenv.config({ path: path.join(__dirname, "../.env.login") });

export function protegerRuta({ req, res }) {
  const token = req.cookies.access_token;
  try {
    // decodifica y valida la firma
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    return decoded; // aquí tienes el payload
  } catch (err) {
    loginRedirecter({ req, res });
  }
}
