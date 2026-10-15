type Pessoa = { id: number; nome: string; nota?: string };

export function CaixasAdvogados({
  pessoas,
  marcados,
  onChange,
}: {
  pessoas: Pessoa[];
  marcados: string[];
  onChange?: (ids: string[]) => void;
}) {
  function alternar(id: string, ligado: boolean) {
    const proximo = ligado
      ? [...marcados, id]
      : marcados.filter((item) => item !== id);
    onChange?.(proximo);
  }

  return (
    <fieldset>
      <legend className="rotulo-campo">Advogados</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {pessoas.map((pessoa) => {
          const id = String(pessoa.id);
          const caixa = `advogado-${pessoa.id}`;
          const ligado = marcados.includes(id);
          return (
            <label
              key={pessoa.id}
              htmlFor={caixa}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-base text-ink transition-colors hover:border-pen ${
                ligado
                  ? "border-pen bg-pen-soft font-semibold"
                  : "border-line bg-sheet"
              }`}
            >
              <input
                id={caixa}
                name="advogados"
                type="checkbox"
                value={id}
                checked={onChange ? ligado : undefined}
                defaultChecked={onChange ? undefined : ligado}
                onChange={
                  onChange
                    ? (evento) => alternar(id, evento.target.checked)
                    : undefined
                }
                className="h-5 w-5 accent-pen"
              />
              <span className="min-w-0">
                {pessoa.nome}
                {pessoa.nota ? (
                  <span className="mt-0.5 block text-sm font-normal text-muted">
                    {pessoa.nota}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
