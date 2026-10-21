import { somarDias } from "@/lib/datas";
import { ehDiaUtil } from "@/lib/publicacao";

function somarMeses(iso: string, meses: number) {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  const indice = mes - 1 + meses;
  const ultimoDia = new Date(Date.UTC(ano, indice + 1, 0)).getUTCDate();
  const diaAlvo = Math.min(dia, ultimoDia);
  return new Date(Date.UTC(ano, indice, diaAlvo)).toISOString().slice(0, 10);
}

function ajustarParaDiaUtil(iso: string) {
  let cursor = iso;
  while (!ehDiaUtil(cursor)) {
    cursor = somarDias(cursor, 1);
  }
  return cursor;
}

/** Datas da série, da primeira até o fim dos meses. Sábado, domingo e feriado vão para o próximo dia útil. */
export function datasRecorrentes(
  inicio: string,
  meses: number,
  intervalo: number,
) {
  const limite = somarMeses(inicio, meses);
  const datas: string[] = [];
  const vistas = new Set<string>();
  let cursor = inicio;
  let estourou = false;

  for (let passo = 0; passo < 500; passo += 1) {
    if (cursor > limite) {
      break;
    }
    const util = ajustarParaDiaUtil(cursor);
    if (!vistas.has(util)) {
      if (datas.length >= 120) {
        estourou = true;
        break;
      }
      vistas.add(util);
      datas.push(util);
    }
    cursor = somarDias(cursor, intervalo);
  }

  return { datas, estourou };
}
