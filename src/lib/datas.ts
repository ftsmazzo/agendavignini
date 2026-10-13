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
