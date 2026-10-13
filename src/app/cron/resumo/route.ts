import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { hojeNoEscritorio } from "@/lib/contagens";
import { caixaConfigurada, enviarTexto } from "@/lib/email";
import { assuntoDoDia, filaDoDia, textoDoResumo } from "@/lib/resumo";

function chaveConfere(pedido: Request) {
  const esperada = process.env.CRON_SECRET ?? "";
  const recebida =
    pedido.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (esperada.length < 16 || recebida.length !== esperada.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada));
}

export async function GET(pedido: Request) {
  await connection();
  if (!chaveConfere(pedido)) {
    return new Response("nao autorizado", { status: 401 });
  }

  const hoje = hojeNoEscritorio();
  const fila = await filaDoDia(hoje);
  let enviados = 0;
  if (caixaConfigurada()) {
    const assunto = assuntoDoDia(hoje);
    for (const item of fila) {
      const saiu = await enviarTexto(
        item.email,
        assunto,
        textoDoResumo(item.nome, item.resumo),
      );
      if (saiu) {
        enviados += 1;
      }
    }
  }

  return Response.json({
    destinatarios: fila.length,
    enviados,
    caixa: caixaConfigurada(),
  });
}
