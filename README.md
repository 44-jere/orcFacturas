# 🧾 Sistema de Control de Viáticos

Este proyecto define un **sistema de gestión de viáticos** para empleados, con soporte para almacenar facturas, adjuntos (fotos/PDFs), categorías de gasto y una jerarquía **Administrador → Empleado**.

El objetivo principal es registrar los gastos realizados por los empleados, con **trazabilidad completa de las facturas**, asegurando consistencia por **NIT de empresa** y guardando historial de nombres en caso de cambios legales.

---

## 📌 Funcionalidades principales

- Registro de **empleados** bajo un administrador.
- Captura de **facturas** con datos esenciales:
  - Proveedor (empresa)
  - Serie y número de factura
  - Fecha de emisión
  - NIT emisor / NIT receptor
  - Total
  - Moneda
- Asociación a un **tipo de gasto** (Alimentos, Transporte, Hospedaje, etc.).
- Generación automática de una **descripción sugerida** del gasto.
- Almacenamiento de **adjuntos** (foto o PDF de la factura).
- Manejo de **historial de nombres de empresa** (cuando cambia la razón social, el NIT sigue siendo la clave).
- Control de estados del gasto: `borrador`, `en_revision`, `aprobado`, `rechazado`.

---

## 🗂️ Modelo de datos

### Relaciones clave
- **Un administrador** supervisa a **muchos empleados**.
- **Un empleado** puede registrar **muchos gastos**.
- **Cada gasto** se hace a **una empresa** y se clasifica en **una categoría**.
- **Cada gasto** tiene **una factura (1:1)**.
- **Cada factura** puede tener **varios adjuntos** (imágenes, PDF).
- **Una empresa** puede tener **varios nombres históricos**.
