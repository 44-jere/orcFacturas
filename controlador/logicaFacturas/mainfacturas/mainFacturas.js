import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { loginRedirecter } from "../redirigirAlLogin.js";
import { modeloIA } from "../../../modelosIA/gemini/gemini.js";
import { handleMulter, uploadImages } from "../../../middlewares/upload.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mainFacturasRouter = Router()
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
    const id_ticket = req.params.id
    if(!id_ticket) return res.redirect("/usermain");
    const { id, role } = protegerRuta({ req, res });
    const db = req.db;
    const usuarioPosee = db.userMainUsuarioPoseeTicket({ id_usuario:id, id_ticket })
    if(!usuarioPosee) return res.redirect("/usermain");

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

      // Renombrar cada archivo con un UUID limpio (sin guiones)
      const files = req.files.map((file) => {
        const newName = crypto.randomUUID().split("-").join(""); // ej: 32 chars hex
        return {
          ...file,
          originalname:
            newName +
            (file.originalname.includes(".")
              ? file.originalname.substring(file.originalname.lastIndexOf("."))
              : ""),
        };
      });

      const result = await modeloIA.analizarImagenes(req.files);
      res.json(result);
    } catch (e) {
      next(e); // deja que el handler global formatee
    }
  }
);

mainFacturasRouter.post(
  "/guardarFactura",
  handleMulter(uploadImages),
  async (req, res, next) => {
    try {
      const { id, role } = protegerRuta({ req, res });
      const db = req.db;
      if (denegarNoEmpleados({ res, role })) return;

      if (!req.files?.length) {
        return res.status(400).json({ error: "No se enviaron imágenes" });
      }

      const {
        id_ticket,
        proveedor,
        serie,
        numero_factura,
        fecha_emision,
        nit_emisor,
        nit_receptor,
        total,
        descripcion,
        comida,
        moneda,
        tipo_de_gasto,
        tipo_de_comida,
        creado_en,
        actualizado_en,
      } = req.body;

      const resultados = await Promise.allSettled(
        req.files.map(async (file) => {
          // ================================
          // 📌 AQUÍ VA TU CÓDIGO DE BUCKET:
          // const bucketUrl = await bucketClient.save(file.buffer, file.originalname);
          // const imagen_factura_url = bucketUrl;
          // falta renombrar las imagenes con algun criptoUUID
          // codigo que verifica que cada imagen tiene su respectivo archivo con datos extraidos
          // ================================

          // Mientras no hay bucket, usamos un URL fijo que me pases:
          const imagen_factura_url =
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSukUO-lYmQ0JQXIyl19hauLoYZTCdfVYNvPw&s"; // 👈 reemplaza por tu URL random

          const payload = {
            id_usuario: id,
            id_ticket,
            proveedor,
            serie,
            numero_factura,
            fecha_emision,
            nit_emisor,
            nit_receptor,
            total,
            descripcion,
            imagen_factura_url, // requerido por crearComprobante
            comida,
            moneda,
            tipo_de_gasto,
            tipo_de_comida,
            ...(creado_en ? { creado_en } : {}),
            ...(actualizado_en ? { actualizado_en } : {}),
          };

          const out = await db.mainFacturasCrearComprobante(payload);

          return {
            archivo: file.originalname,
            ok: !!out?.ok,
            data: out?.ok
              ? {
                  id_comprobante: out.id_comprobante,
                  creado_en: out.creado_en,
                  actualizado_en: out.actualizado_en,
                  imagen_factura_url,
                }
              : null,
            error: out?.ok
              ? null
              : out?.error || "No se pudo crear el comprobante",
            missing: out?.missing,
            empty: out?.empty,
          };
        })
      );

      const items = resultados.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : {
              archivo: req.files[i]?.originalname,
              ok: false,
              error: r.reason?.message || String(r.reason),
            }
      );

      const creados_ok = items.filter((x) => x.ok).length;
      const todo_ok = creados_ok === items.length;
      const status = todo_ok ? 200 : creados_ok > 0 ? 207 : 400;

      return res.status(status).json({
        ok: todo_ok,
        total_archivos: items.length,
        creados_ok,
        resultados: items,
      });
    } catch (e) {
      next(e);
    }
  }
);
