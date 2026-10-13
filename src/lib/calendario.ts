type DiaCalendario = {
  chave: string;
  dia: number | null;
  iso: string | null;
  fimDeSemana: boolean;
};

export type MesCalendario = {
  nome: string;
  ano: number;
  mes: number;
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

export function deslocarMes(ano: number, mes: number, delta: number) {
  const data = new Date(Date.UTC(ano, mes - 1 + delta, 1));
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1 };
}

export function chaveMes(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function lerMes(valor: string | undefined, hoje: string) {
  const atual = {
    ano: Number(hoje.slice(0, 4)),
    mes: Number(hoje.slice(5, 7)),
  };
  if (!valor || !/^\d{4}-\d{2}$/.test(valor)) {
    return atual;
  }
  const ano = Number(valor.slice(0, 4));
  const mes = Number(valor.slice(5, 7));
  if (mes < 1 || mes > 12) {
    return atual;
  }
  return { ano, mes };
}

export function montarMes(ano: number, mes: number): MesCalendario {
  const nome = MESES[mes - 1] ?? "Mês";
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const total = diasNoMes(ano, mes);
  const dias: DiaCalendario[] = Array.from(
    { length: primeiro },
    (_, indice) => ({
      chave: `antes-${indice}`,
      dia: null,
      iso: null,
      fimDeSemana: false,
    }),
  );

  for (let dia = 1; dia <= total; dia += 1) {
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    const semana = data.getUTCDay();
    const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    dias.push({
      chave: iso,
      dia,
      iso,
      fimDeSemana: semana === 0 || semana === 6,
    });
  }

  let depois = 0;
  while (dias.length % 7 !== 0) {
    dias.push({
      chave: `depois-${depois}`,
      dia: null,
      iso: null,
      fimDeSemana: false,
    });
    depois += 1;
  }

  return { nome, ano, mes, dias };
}

export function fimDoMes(ano: number, mes: number) {
  const dia = String(diasNoMes(ano, mes)).padStart(2, "0");
  return `${ano}-${String(mes).padStart(2, "0")}-${dia}`;
}
