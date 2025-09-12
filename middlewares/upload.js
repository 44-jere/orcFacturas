import multer from "multer";

const storage = multer.memoryStorage();
const base = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

// Middleware listo para facturas (una o varias)
export const uploadImages = base.array("images", 10);

// Wrapper para capturar y formatear errores de multer (no se filtran al front)
export function handleMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          error: "Error de subida de archivos",
          code: err.code,
          field: err.field,
          hint: "Usa 'images' como nombre del campo (multipart/form-data).",
        });
      }
      if (err) return next(err);
      next();
    });
  };
}
