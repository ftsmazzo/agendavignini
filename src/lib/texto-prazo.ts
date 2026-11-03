/** Normaliza o texto colado da publicação para aparecer inteiro na tela. */
export function textoPrazo(valor: string) {
  return valor
    .replaceAll("\u0000", "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
