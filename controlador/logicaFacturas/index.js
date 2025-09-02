import { baseDeDatos } from "../../models/posgres/baseDeDatos.js";

const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT ?? 8080;

app.use(express.static("public"));

// sendFile will go here
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../../public/index.html"))
);

app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "../../public/login.html"))
);

app.get("/register", (req, res) =>
  res.sendFile(path.join(__dirname, "../../public/register.html"))
);

app.listen(port);
console.log("Server started at http://localhost:" + port);
