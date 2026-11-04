import { connection } from "next/server";
import { exigirAdmin } from "@/lib/acesso";
import { dataIsoValida } from "@/lib/datas";
import {
  linhasRelatorioPrazosDia,
  nomeArquivoPrazosDia,
} from "@/lib/relatorio-prazos-dia";
import { montarPdfPrazosDia } from "@/lib/relatorio-prazos-dia-arquivos";

export async function GET(pedido: Request) {
  await connection();
  await exigirAdmin();
  const url = new URL(pedido.url);
  const dia = String(url.searchParams.get("data") ?? "").slice(0, 10);
  if (!dataIsoValida(dia)) {
    return new Response("Dia inválido.", { status: 400 });
  }
  const geradoEm = new Date();
  const linhas = await linhasRelatorioPrazosDia(dia);
  const arquivo = await montarPdfPrazosDia(dia, linhas, geradoEm);
  return new Response(new Uint8Array(arquivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivoPrazosDia(dia, "pdf")}"`,
      "Cache-Control": "no-store",
    },
  });
}
