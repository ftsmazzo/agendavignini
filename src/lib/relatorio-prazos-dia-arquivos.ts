import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { dataBr, dataHoraBr } from "@/lib/datas";
import type { LinhaRelatorioPrazosDia } from "@/lib/relatorio-prazos-dia";

const COLUNAS = [
  { chave: "reclamante" as const, titulo: "Reclamante", largura: 34 },
  { chave: "processo" as const, titulo: "N° de Processo", largura: 26 },
  { chave: "reclamada" as const, titulo: "Reclamada", largura: 34 },
  { chave: "dataAdicional" as const, titulo: "Data adicional", largura: 16 },
  { chave: "status" as const, titulo: "Status", largura: 32 },
];

const VERDE = "0B3D2E";
const VERDE_CLARO = "F3F8F5";
const LINHA = "D7E3DC";

function celula(valor: string) {
  return valor.trim() || "—";
}

export async function montarXlsxPrazosDia(
  dia: string,
  linhas: LinhaRelatorioPrazosDia[],
  geradoEm: Date,
) {
  const livro = new ExcelJS.Workbook();
  livro.creator = "Agenda Coelho Vignini";
  livro.created = geradoEm;
  livro.modified = geradoEm;

  const folha = livro.addWorksheet("Prazos do dia", {
    views: [{ state: "frozen", ySplit: 4 }],
    properties: { defaultRowHeight: 18 },
  });

  folha.mergeCells("A1:E1");
  const titulo = folha.getCell("A1");
  titulo.value = "Coelho Vignini Advogados Associados";
  titulo.font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: VERDE },
  };
  titulo.alignment = { vertical: "middle" };

  folha.mergeCells("A2:E2");
  const sub = folha.getCell("A2");
  sub.value = `Relatório de prazos · ${dataBr(dia)} · gerado em ${dataHoraBr(geradoEm)}`;
  sub.font = { name: "Calibri", size: 11, color: { argb: "475569" } };

  folha.mergeCells("A3:E3");
  folha.getCell("A3").value =
    linhas.length === 1
      ? "1 prazo neste dia"
      : `${linhas.length} prazos neste dia`;
  folha.getCell("A3").font = {
    name: "Calibri",
    size: 10,
    color: { argb: "64748B" },
  };

  folha.getRow(1).height = 26;
  folha.getRow(2).height = 18;
  folha.getRow(3).height = 16;
  folha.getRow(4).values = COLUNAS.map((coluna) => coluna.titulo);
  const cabecalho = folha.getRow(4);
  cabecalho.font = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: "FFFFFF" },
  };
  cabecalho.alignment = { vertical: "middle", horizontal: "left" };
  cabecalho.height = 22;
  for (let coluna = 1; coluna <= COLUNAS.length; coluna += 1) {
    const cel = cabecalho.getCell(coluna);
    cel.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: VERDE },
    };
    cel.border = {
      bottom: { style: "thin", color: { argb: VERDE } },
    };
  }

  for (const [indice, linha] of linhas.entries()) {
    const row = folha.getRow(5 + indice);
    row.values = [
      celula(linha.reclamante),
      celula(linha.processo),
      celula(linha.reclamada),
      celula(linha.dataAdicional),
      celula(linha.status),
    ];
    row.font = { name: "Calibri", size: 10, color: { argb: "0F172A" } };
    row.alignment = { vertical: "middle", wrapText: false };
    row.height = 20;
    for (let coluna = 1; coluna <= COLUNAS.length; coluna += 1) {
      const cel = row.getCell(coluna);
      cel.border = {
        bottom: { style: "hair", color: { argb: LINHA } },
      };
      if (indice % 2 === 1) {
        cel.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: VERDE_CLARO },
        };
      }
    }
    // Processo como texto, para o Excel não comer zeros.
    row.getCell(2).numFmt = "@";
  }

  for (const [indice, coluna] of COLUNAS.entries()) {
    folha.getColumn(indice + 1).width = coluna.largura;
  }

  if (linhas.length > 0) {
    folha.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + linhas.length, column: COLUNAS.length },
    };
  }

  const buffer = await livro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function montarPdfPrazosDia(
  dia: string,
  linhas: LinhaRelatorioPrazosDia[],
  geradoEm: Date,
) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36,
    info: {
      Title: `Prazos ${dataBr(dia)}`,
      Author: "Coelho Vignini Advogados Associados",
      Creator: "Agenda Coelho Vignini",
    },
  });

  const pedacos: Buffer[] = [];
  doc.on("data", (pedaco: Buffer) => {
    pedacos.push(pedaco);
  });

  const pronto = new Promise<Buffer>((resolver, rejeitar) => {
    doc.on("end", () => resolver(Buffer.concat(pedacos)));
    doc.on("error", rejeitar);
  });

  doc
    .fillColor(`#${VERDE}`)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Coelho Vignini Advogados Associados", 36, 34, { width: 700 });
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(11)
    .text(
      `Relatório de prazos · ${dataBr(dia)} · gerado em ${dataHoraBr(geradoEm)}`,
      36,
      56,
      { width: 700 },
    );
  doc
    .fillColor("#64748B")
    .fontSize(10)
    .text(
      linhas.length === 1
        ? "1 prazo neste dia"
        : `${linhas.length} prazos neste dia`,
      36,
      72,
      { width: 700 },
    );

  const inicioY = 100;
  const paginaLargura = doc.page.width - 72;
  const larguras = [0.24, 0.2, 0.24, 0.12, 0.2].map(
    (parte) => parte * paginaLargura,
  );
  const larguraDe = (indice: number) => larguras[indice] ?? 80;
  const desenharCabecalho = (y: number) => {
    let x = 36;
    doc.rect(36, y, paginaLargura, 20).fill(`#${VERDE}`);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
    for (const [indice, coluna] of COLUNAS.entries()) {
      const largura = larguraDe(indice);
      doc.text(coluna.titulo, x + 4, y + 5, {
        width: largura - 8,
        ellipsis: true,
      });
      x += largura;
    }
    return y + 20;
  };

  let y = desenharCabecalho(inicioY);
  doc.font("Helvetica").fontSize(8).fillColor("#0F172A");

  for (const [indice, linha] of linhas.entries()) {
    const valores = [
      celula(linha.reclamante),
      celula(linha.processo),
      celula(linha.reclamada),
      celula(linha.dataAdicional),
      celula(linha.status),
    ];
    const altura = 16;
    if (y + altura > doc.page.height - 36) {
      doc.addPage();
      y = desenharCabecalho(36);
      doc.font("Helvetica").fontSize(8).fillColor("#0F172A");
    }
    if (indice % 2 === 1) {
      doc.rect(36, y, paginaLargura, altura).fill(`#${VERDE_CLARO}`);
      doc.fillColor("#0F172A");
    }
    let x = 36;
    for (const [i, valor] of valores.entries()) {
      const largura = larguraDe(i);
      doc.text(valor, x + 4, y + 4, {
        width: largura - 8,
        height: altura - 4,
        ellipsis: true,
        lineBreak: false,
      });
      x += largura;
    }
    y += altura;
  }

  if (linhas.length === 0) {
    doc
      .fillColor("#64748B")
      .fontSize(11)
      .text("Nenhum prazo neste dia.", 36, y + 16);
  }

  doc.end();
  return pronto;
}
