import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
// import { protegerRuta } from "../protegerRuta.js";
// import { loginRedirecter } from "../redirigirAlLogin.js";
import { handleMulter } from "../../../middlewares/upload.js";
import { loginRedirecter } from "../redirigirAlLogin.js";

import { protegerRuta } from "../protegerRuta.js";

import {
  procesarExcelUsuarios,
  insertarDatosEnPlantilla,
} from "./manejoHojasExcel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export const registrarUsuariosRouter = Router();

registrarUsuariosRouter.get("/", (req, res) => {
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
        "Administrador",
        "AdminRegistrarUsuarios",
        "registrarUsuarioIndex.html"
      )
    );
  } catch (e) {
    loginRedirecter({ req, res });
  }
});

// Multer en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (!ok) return cb(new Error("Solo se acepta .xlsx"));
    cb(null, true);
  },
});

registrarUsuariosRouter.get("/descargarPlantilla", (req, res) => {
  const decoded = protegerRuta({ req, res });
  if (!decoded) return; // protegerRuta ya manejó el flujo
  if (!allowOrRedirect(decoded, res)) return;

  const filePath = path.join(__dirname, "usuarios.xlsx");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", 'attachment; filename="usuarios.xlsx"');
  res.sendFile(filePath);
});

registrarUsuariosRouter.post(
  "/",
  handleMulter(upload.single("file")), // tu wrapper reutilizado
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Falta el archivo .xlsx en el campo 'file'" });
      }

      const datos = await procesarExcelUsuarios({
        file: req.file,
        header: true,
        // sheetName: "Usuarios",
        // range: "A1:F500",
      });

      // resultado esperado
      // [
      //  {
      //    nombre: "Jeremy",
      //    dpi: "1234567890101",       // opcional (null si no viene)
      //    email: "jeremy@test.com",   // opcional (null si no viene)
      //    usuario: "jeremy123",       // generado internamente
      //     password: "a3f91b2c"        // generado internamente
      //  },
      // ]

      // TODO: validar/mapear/insertar en DB
      // const usuarios = datos.map(({ Nombre, Email, Password }) => ({ ... }));
      // await req.db.usuarios.bulkInsert(usuarios);

      const buffer = await insertarDatosEnPlantilla({
        rows: datos.rows,
        file: req.file,
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="usuarios_con_credenciales.xlsx"'
      );
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("❌ /registrar/usuarios:", err);
      res.status(500).json({ error: "No se pudo procesar el Excel" });
    }
  }
);
