import express, { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { baseDeDatos } from "./models/posgres/baseDeDatos.js";
import { loginRouter } from "./controlador/logicaFacturas/login/login.js";
import { perfilRouter } from "./controlador/logicaFacturas/perfil/perfil.js";
import { logoutRouter } from "./controlador/logicaFacturas/logout/logout.js";
import { mainFacturasRouter } from "./controlador/logicaFacturas/mainfacturas/mainFacturas.js";
import { homeRouter } from "./controlador/logicaFacturas/home/home.js";
import { adminRouter } from "./controlador/logicaFacturas/administrador/administrador.js";
import { supervisorRouter } from "./controlador/logicaFacturas/supervisor/supervisor.js";
import { userMainRouter } from "./controlador/logicaFacturas/usermain/usermain.js";
import { registrarUsuariosRouter } from "./controlador/logicaFacturas/registrarUsuarios/registrarUsuarios.js";

import cookieParser from "cookie-parser";
import cors from "cors"; // 👈 agregado

// recrear __filename y __dirname en ESM
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT ?? 8080;
const db = baseDeDatos;

// 🔹 Habilitar CORS con credenciales
app.use(
  cors({
    origin: (origin, callback) => {
      const ACCEPTED_ORIGINS = [
        "http://localhost:8080",
        "http://localhost:1234",
        "http://40.233.21.34:8080",
      ];

      if (ACCEPTED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      if (!origin) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1) Bloquear solo HTML
app.use("/public", (req, res, next) => {
  if (req.path.endsWith(".html")) {
    return res.status(404).end(); // 🚫 no expone HTML
  }
  next(); // ✅ pasa a static si no es .html
});

// 2) Servir assets (png, css, js, etc.)
app.use(
  "/public",
  express.static("public", {
    index: false, // no servir index.html
    redirect: false, // no redirecciones automáticas
    dotfiles: "ignore",
  })
);

app.use((req, _res, next) => {
  req.db = db; // <- ahora está en req
  next();
});

// sendFile will go here
app.use("/", homeRouter);

app.use("/login", loginRouter);

app.use("/admin", adminRouter);

app.use("/supervisor", supervisorRouter);

app.use("/perfil", perfilRouter);

app.use("/logout", logoutRouter);

app.use("/mainfacturas", mainFacturasRouter);

app.use("/usermain", userMainRouter);

app.use("/registrar", registrarUsuariosRouter);

app.listen(port, "0.0.0.0");
console.log("Server started at http://localhost:" + port);
