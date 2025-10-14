import { Router } from "express";
import { protegerRuta } from "../protegerRuta.js";
import path from "path";
import { fileURLToPath } from "url";
import { modeloIA } from "../../../modelosIA/gemini/gemini.js";
import { handleMulter, uploadImages } from "../../../middlewares/upload.js";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mainFacturasRouter = Router();
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
    const id_ticket = parseInt(req.params.id);
    if (!id_ticket) return res.redirect("/usermain");
    const { id, role } = protegerRuta({ req, res });
    if (denegarNoEmpleados({ res, role })) return;
  } catch (e) {
    return res.redirect("/usermain");
  }
});
mainFacturasRouter.get("/:id", (req, res) => {
  try {
    const id_ticket = parseInt(req.params.id);
    if (!id_ticket) return res.redirect("/usermain");
    const { id, role } = protegerRuta({ req, res });
    const db = req.db;
    const usuarioPosee = db.userMainUsuarioPoseeTicket({
      id_usuario: id,
      id_ticket,
    });
    if (!usuarioPosee) return res.redirect("/usermain");

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
    return res.redirect("/usermain");
  }
});

mainFacturasRouter.post(
  "/:id",
  handleMulter(uploadImages), // 👈 multer aislado y con errores capturados
  async (req, res, next) => {
    try {
      const id_ticket = parseInt(req.params.id);
      if (!id_ticket) return res.redirect("/usermain");
      const { id, role } = protegerRuta({ req, res });
      if (denegarNoEmpleados({ res, role })) return;
      const db = req.db;
      const usuarioPosee = db.userMainUsuarioPoseeTicket({
        id_usuario: id,
        id_ticket,
      });
      if (!usuarioPosee) return res.redirect("/usermain");

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

mainFacturasRouter.post(
  "/:id/guardarFactura",
  handleMulter(uploadImages),
  async (req, res, next) => {
    try {
      const { id, role } = protegerRuta({ req, res }); // id_usuario
      const db = req.db;
      if (denegarNoEmpleados({ res, role })) return;
      const id_ticket = Number.parseInt(req.params.id, 10);
      const usuarioPosee = db.userMainUsuarioPoseeTicket({
        id_usuario: id,
        id_ticket,
      });
      if (!usuarioPosee) return res.redirect("/usermain");

      if (!req.files?.length) {
        return res.status(400).json({ error: "No se enviaron imágenes" });
      }

      // ✅ id_ticket viene de la URL
      if (!Number.isInteger(id_ticket) || id_ticket <= 0) {
        return res.status(400).json({ error: "id_ticket inválido" });
      }

      // Parsear arrays JSON alineados con req.files
      let userDataPerFile = [];
      let iaFrozenPerFile = [];
      try {
        userDataPerFile = JSON.parse(req.body.userDataPerFile || "[]");
      } catch {}
      try {
        iaFrozenPerFile = JSON.parse(req.body.iaFrozenPerFile || "[]");
      } catch {}
      if (!Array.isArray(userDataPerFile) || !Array.isArray(iaFrozenPerFile)) {
        return res
          .status(400)
          .json({ error: "userDataPerFile/iaFrozenPerFile inválidos" });
      }
      if (
        userDataPerFile.length !== req.files.length ||
        iaFrozenPerFile.length !== req.files.length
      ) {
        return res.status(400).json({
          error:
            "La cantidad de userDataPerFile/iaFrozenPerFile debe coincidir con la de imágenes",
          esperado: req.files.length,
          userDataPerFile: userDataPerFile.length,
          iaFrozenPerFile: iaFrozenPerFile.length,
        });
      }

      const resultados = await Promise.allSettled(
        req.files.map(async (file, i) => {
          // 1) Guardar imagen en bucket
          const safeName = `${crypto.randomUUID()}-${file.originalname.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          )}`;
          // const imagen_factura_url = await bucketClient.save(file.buffer, safeName);
          const imagen_factura_url =
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSukUO-lYmQ0JQXIyl19hauLoYZTCdfVYNvPw&s"; // 👈 reemplaza por tu URL rando

          // 2) Emparejar editable y congelado
          const userEditable = userDataPerFile[i] || {};
          const iaFrozen = iaFrozenPerFile[i] || {};

          // ⚠️ Excluir campos no permitidos (motivo, creado_en, actualizado_en)
          const { motivo, creado_en, actualizado_en, ...userEditableSafe } =
            userEditable;

          // 3) Payload para crearComprobante
          const payload = {
            userData: {
              ...userEditableSafe,
              id_usuario: id, // SIEMPRE desde la sesión
              id_ticket, // desde la URL
              imagen_factura_url, // generado en backend
            },
            iaData: iaFrozen,
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
