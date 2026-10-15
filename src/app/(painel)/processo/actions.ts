"use server";

import { exigirUsuario } from "@/lib/acesso";
import { consultarTribunal, type VistaTribunal } from "@/lib/infosimples";
import { numeroDoProcesso } from "@/lib/publicacao";

export type EstadoTribunal = {
  erro: string;
  consulta: VistaTribunal | null;
};

export async function buscarNoTribunal(
  _estado: EstadoTribunal | null,
  formData: FormData,
): Promise<EstadoTribunal> {
  const usuario = await exigirUsuario();
  if (usuario.papel !== "admin") {
    return { erro: "Só o administrador consulta o tribunal.", consulta: null };
  }
  const numero = String(formData.get("numero") ?? "").trim();
  if (numeroDoProcesso(numero) !== numero) {
    return {
      erro: "Informe um número de processo no padrão CNJ.",
      consulta: null,
    };
  }
  return consultarTribunal(numero);
}
