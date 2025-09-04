// import { baseDeDatos } from "../../models/posgres/baseDeDatos.js";

const express = require("express");
const path = require("path");

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

app.listen(port);
console.log("Server started at http://localhost:" + port);
