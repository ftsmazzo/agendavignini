type DiaCalendario = {
  dia: number | null;
  iso: string | null;
};

type MesCalendario = {
  nome: string;
  dias: DiaCalendario[];
};

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function anoBissexto(ano: number) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function diasNoMes(ano: number, mes: number) {
  if (mes === 2) {
    return anoBissexto(ano) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

export function montarAno(ano: number): MesCalendario[] {
  return MESES.map((nome, indice) => {
    const mes = indice + 1;
    const primeiro = new Date(Date.UTC(ano, indice, 1)).getUTCDay();
    const total = diasNoMes(ano, mes);
    const celulas: DiaCalendario[] = Array.from({ length: primeiro }, () => ({
      dia: null,
      iso: null,
    }));

    for (let dia = 1; dia <= total; dia += 1) {
      const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      celulas.push({ dia, iso });
    }

    while (celulas.length % 7 !== 0) {
      celulas.push({ dia: null, iso: null });
    }

    return { nome, dias: celulas };
  });
}
