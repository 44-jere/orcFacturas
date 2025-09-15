import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
// import { protegerRuta } from "../protegerRuta.js";
// import { loginRedirecter } from "../redirigirAlLogin.js";
import { handleMulter } from "../../../middlewares/upload.js"; // usa SOLO este
import { procesarExcelUsuarios } from "./manejoHojasExcel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const registrarUsuariosRouter = Router();

// Multer en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (!ok) return cb(new Error("Solo se acepta .xlsx"));
    cb(null, true);
  },
});

registrarUsuariosRouter.post(
  "/registrarUsuarios",
  handleMulter(upload.single("file")), // tu wrapper reutilizado
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Falta el archivo .xlsx en el campo 'file'" });
      }

      const datos = await procesarExcelUsuarios({
        file: req.file,
        header: true,
        // sheetName: "Usuarios",
        // range: "A1:F500",
      });
      
      // resultado esperado
      // [
      //   { Nombre: "Jeremy", Email: "jeremy@test.com", Password: "12345" },
      //   { Nombre: "María", Email: "maria@test.com", Password: "qwerty" },
      //   { Nombre: "Carlos", Email: "carlos@test.com", Password: "abcde" }
      // ]

      // TODO: validar/mapear/insertar en DB
      // const usuarios = datos.map(({ Nombre, Email, Password }) => ({ ... }));
      // await req.db.usuarios.bulkInsert(usuarios);

      res.json({
        ok: true,
        registros: datos.length,
        preview: datos.slice(0, 5),
      });
    } catch (err) {
      console.error("❌ /registrar/usuarios:", err);
      res.status(500).json({ error: "No se pudo procesar el Excel" });
    }
  }
);

