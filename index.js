// import { baseDeDatos } from "../../models/posgres/baseDeDatos.js";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// recrear __filename y __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ?? 8080;

app.use(express.static(path.resolve(__dirname, "./public")));

// sendFile will go here
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "/public/mainfacturas/index.html"))
);

app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "/public/login/login.html"))
);

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
