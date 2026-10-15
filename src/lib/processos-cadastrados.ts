import { desc, or, sql } from "drizzle-orm";
import { obterDb } from "@/db/client";
import { audiencias, prazos } from "@/db/schema";
import { numeroDoProcesso } from "@/lib/publicacao";

export type ProcessoCadastrado = {
  numero: string;
  vara: string;
  local: string;
  reclamante: string;
  reclamado: string;
  preposto: string;
  detalhe: string;
};

function padrao(termo: string) {
  const limpo = termo.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
  return `%${limpo}%`;
}

function texto(valor: string | null | undefined) {
  return (valor ?? "").replaceAll("\u0000", "").trim();
}

export async function listarProcessosCadastrados(termo: string) {
  const consulta = termo.replaceAll("\u0000", "").trim().slice(0, 80);
  if (consulta.length < 3) {
    return [];
  }
  const db = obterDb();
  const como = padrao(consulta);
  const chave = sql`regexp_replace(${audiencias.numeroProcesso}, '\\D', '', 'g')`;
  const deAudiencias = await db
    .selectDistinctOn([chave], {
      numero: audiencias.numeroProcesso,
      vara: audiencias.vara,
      local: audiencias.local,
      reclamante: audiencias.reclamante,
      reclamado: audiencias.reclamado,
      preposto: audiencias.preposto,
    })
    .from(audiencias)
    .where(
      or(
        sql`${audiencias.numeroProcesso} ilike ${como}`,
        sql`${audiencias.reclamante} ilike ${como}`,
        sql`${audiencias.reclamado} ilike ${como}`,
        sql`${audiencias.vara} ilike ${como}`,
      ),
    )
    .orderBy(chave, desc(audiencias.dataHora))
    .limit(8);

  const porNumero = new Map<string, ProcessoCadastrado>();
  for (const linha of deAudiencias) {
    const numero = numeroDoProcesso(linha.numero) ?? texto(linha.numero);
    const digitos = numero.replace(/\D/g, "");
    if (digitos.length < 5) {
      continue;
    }
    porNumero.set(digitos, {
      numero,
      vara: texto(linha.vara),
      local: texto(linha.local),
      reclamante: texto(linha.reclamante),
      reclamado: texto(linha.reclamado),
      preposto: texto(linha.preposto),
      detalhe: "",
    });
  }

  const digitosPedidos = consulta.replace(/\D/g, "");
  if (digitosPedidos.length >= 4 && porNumero.size < 8) {
    const achados = await db.execute<{
      numero: string | null;
      titulo: string | null;
    }>(sql`
      select numero, titulo
      from (
        select distinct on (numero)
          substring((titulo || ' ' || observacao || ' ' || left(conteudo, 2500))
            from '[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}') as numero,
          titulo,
          data
        from ${prazos}
        where (titulo || ' ' || observacao || ' ' || left(conteudo, 2500)) ilike ${como}
        order by numero, data desc
      ) achados
      where numero is not null
      limit 8
    `);
    for (const linha of achados) {
      if (porNumero.size >= 8) {
        break;
      }
      const numero = texto(linha.numero);
      const digitos = numero.replace(/\D/g, "");
      if (digitos.length < 20 || porNumero.has(digitos)) {
        continue;
      }
      porNumero.set(digitos, {
        numero,
        vara: "",
        local: "",
        reclamante: "",
        reclamado: "",
        preposto: "",
        detalhe: texto(linha.titulo).slice(0, 140),
      });
    }
  }

  return [...porNumero.values()];
}
