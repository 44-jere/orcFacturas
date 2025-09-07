import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { baseDeDatos } from "./models/posgres/baseDeDatos.js";
import { loginRouter } from "./controlador/logicaFacturas/login/login.js";
import cookieParser from "cookie-parser";

// recrear __filename y __dirname en ESM
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT ?? 8080;
const db = baseDeDatos;
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

app.get("/perfil", (req, res) =>
  res.sendFile(path.join(__dirname, "/public/perfil/PerfilIndex.html"))
);

app.listen(port);
console.log("Server started at http://localhost:" + port);
