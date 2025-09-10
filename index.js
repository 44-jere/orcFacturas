import express, { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { baseDeDatos } from "./models/posgres/baseDeDatos.js";
import { loginRouter } from "./controlador/logicaFacturas/login/login.js";
import { perfilRouter } from "./controlador/logicaFacturas/perfil/perfil.js";
import { logoutRouter } from "./controlador/logicaFacturas/logout/logout.js";

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
    origin: "http://localhost:8080", // 👈 cambia si tu front no corre en 3000
    credentials: true,
  })
);

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.resolve(__dirname, "./public")));

app.use((req, _res, next) => {
  req.db = db; // <- ahora está en req
  next();
});

// sendFile will go here
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "/public/mainfacturas/index.html"))
);

app.use("/login", loginRouter);

app.get("/admin", (req, res) =>
  res.sendFile(path.join(__dirname, "/public/adminMain/admin.html"))
);

app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "/public/dashboard/dashboard.html"))
);

app.use("/perfil", perfilRouter);

app.use("/logout", logoutRouter);

app.listen(port);
console.log("Server started at http://localhost:" + port);
