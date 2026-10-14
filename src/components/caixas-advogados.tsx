type Pessoa = { id: number; nome: string };

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
      <legend className="mb-2 text-xl text-ink">Advogados</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {pessoas.map((pessoa) => {
          const id = String(pessoa.id);
          const caixa = `advogado-${pessoa.id}`;
          const ligado = marcados.includes(id);
          return (
            <label
              key={pessoa.id}
              htmlFor={caixa}
              className="flex items-center gap-3 border border-line bg-sheet px-3 py-2 text-xl text-ink"
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
                className="h-5 w-5"
              />
              {pessoa.nome}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
