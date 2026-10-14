import Link from "next/link";
import { emailDeContato, numeroWhatsapp } from "@/lib/contatos";

export function AcoesContato({
  id,
  telefone,
  celular,
  email,
}: {
  id: number;
  telefone: string;
  celular: string | null;
  email: string | null;
}) {
  const zap = numeroWhatsapp(celular, telefone);
  const correio = emailDeContato(email);

  return (
    <div className="flex flex-wrap gap-2">
      {zap ? (
        <a
          href={`https://wa.me/${zap}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-done px-4 py-2 text-lg font-semibold text-done-ink"
        >
          WhatsApp
        </a>
      ) : null}
      {correio ? (
        <a
          href={`mailto:${correio}`}
          className="border border-line bg-sheet px-4 py-2 text-lg font-semibold text-ink"
        >
          E-mail
        </a>
      ) : null}
      <Link
        href={`/agenda/${id}`}
        className="border border-line bg-sheet px-4 py-2 text-lg font-semibold text-ink"
      >
        Editar
      </Link>
    </div>
  );
}
