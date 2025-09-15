import ExcelJS from "exceljs";

export function crearPlantilla(){

}

export async function procesarExcelUsuarios({ file, sheetName, range, header = true }) {
  if (!file?.buffer) throw new Error("El archivo de Excel no trae buffer");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file.buffer);

  const ws = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0];
  if (!ws) throw new Error("No se encontró la hoja especificada");

  let startRow = 1, endRow = ws.rowCount, startCol = 1, endCol = ws.columnCount;

  if (range) {
    const [a, b] = range.split(":");
    const aCell = ws.getCell(a);
    const bCell = ws.getCell(b);
    startRow = aCell.row;
    startCol = aCell.col;
    endRow = bCell.row;
    endCol = bCell.col;
  }

  const normalize = (v) => {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "object") {
      if ("text" in v) return v.text;
      if ("result" in v) return v.result;
      if ("richText" in v) return v.richText.map(t => t.text).join("");
      if ("formula" in v) return v.result ?? null;
    }
    return v;
  };

  const rows = [];
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    const arr = [];
    for (let c = startCol; c <= endCol; c++) {
      arr.push(normalize(row.getCell(c).value));
    }
    const allEmpty = arr.every(x => x === null || x === "");
    if (!allEmpty) rows.push(arr);
  }

  if (!header) return rows;

  const [hdr, ...body] = rows;
  const keys = hdr.map((k, i) => (String(k ?? `Col${i + 1}`)).trim() || `Col${i + 1}`);
  return body.map(r => {
    const obj = {};
    keys.forEach((k, i) => (obj[k] = r[i] ?? null));
    return obj;
  });
}
