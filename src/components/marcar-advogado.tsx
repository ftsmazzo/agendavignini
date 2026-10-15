import { marcarUmAdvogado } from "@/app/(painel)/admin/prazos/marcar/actions";

export function MarcarAdvogado({
  prazoId,
  voltar,
  pessoas,
}: {
  prazoId: number;
  voltar: string;
  pessoas: Array<{ id: number; nome: string }>;
}) {
  if (pessoas.length === 0) {
    return null;
  }
  const campo = `advogado-prazo-${prazoId}`;
  return (
    <form
      action={marcarUmAdvogado}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={prazoId} />
      <input type="hidden" name="voltar" value={voltar} />
      <div className="w-72">
        <label htmlFor={campo} className="sr-only">
          Advogado deste prazo
        </label>
        <select
          id={campo}
          name="advogado"
          required
          defaultValue=""
          className="campo"
        >
          <option value="" disabled>
            Marcar advogado
          </option>
          {pessoas.map((pessoa) => (
            <option key={pessoa.id} value={pessoa.id}>
              {pessoa.nome}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primario btn-pequeno">
        Marcar
      </button>
    </form>
  );
}
