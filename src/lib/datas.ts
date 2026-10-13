export function dataIsoValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const ano = Number(valor.slice(0, 4));
  const mes = Number(valor.slice(5, 7));
  const dia = Number(valor.slice(8, 10));
  if (ano < 1900 || ano > 2100) {
    return false;
  }
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

export function ehFimDeSemana(iso: string) {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  const semana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  return semana === 0 || semana === 6;
}

export function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function instanteEscritorio(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) {
    return null;
  }
  const data = valor.slice(0, 10);
  const hora = Number(valor.slice(11, 13));
  const minuto = Number(valor.slice(14, 16));
  if (!dataIsoValida(data) || hora > 23 || minuto > 59) {
    return null;
  }
  return new Date(`${valor}:00-03:00`);
}

export function paraCampoDataHora(valor: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(valor);
  const pegar = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${pegar("year")}-${pegar("month")}-${pegar("day")}T${pegar("hour")}:${pegar("minute")}`;
}

export function dataHoraBr(valor: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}

export function somarDias(iso: string, dias: number) {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  return new Date(Date.UTC(ano, mes - 1, dia + dias))
    .toISOString()
    .slice(0, 10);
}

export function semanaDe(iso: string) {
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const distancia = data.getUTCDay() === 0 ? 6 : data.getUTCDay() - 1;
  const inicio = new Date(Date.UTC(ano, mes - 1, dia - distancia));
  const fim = new Date(inicio.getTime() + 6 * 24 * 60 * 60 * 1000);
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  };
}

export function caminhoInterno(valor: string, fallback: string) {
  if (
    !valor.startsWith("/") ||
    valor.startsWith("//") ||
    valor.includes("\\") ||
    valor.includes("\n") ||
    valor.includes("\r")
  ) {
    return fallback;
  }
  return valor;
}
