export function tituloIndicaDefesa(titulo: string) {
  return /\bdefesas?\b/i.test(titulo);
}

export function prazoEhDefesa(marcado: boolean, titulo: string) {
  return marcado || tituloIndicaDefesa(titulo);
}
