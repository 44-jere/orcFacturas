import multer from "multer";

// Config por defecto (RAM)
const baseStorage = multer.memoryStorage();

export const upload = multer({
  storage: baseStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB, máx 10
});

// Si algún día necesitas variantes:
export const makeUpload = ({
  fileSizeMB = 5,
  files = 10,
  storage = baseStorage,
  fileFilter,
} = {}) =>
  multer({
    storage,
    limits: { fileSize: fileSizeMB * 1024 * 1024, files },
    fileFilter,
  });
