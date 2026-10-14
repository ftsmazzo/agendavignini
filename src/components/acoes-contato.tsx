import Link from "next/link";
import { emailDeContato, numerosDoContato } from "@/lib/contatos";

export function NumerosContato({
  telefone,
  celular,
}: {
  telefone: string;
  celular: string | null;
}) {
  const numeros = numerosDoContato(celular, telefone);
  if (numeros.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {numeros.map((numero) => (
        <li
          key={numero.id}
          className="flex items-center gap-2 text-xl text-ink"
        >
          <span>{numero.texto}</span>
          {numero.whatsapp ? (
            <a
              href={`https://wa.me/${numero.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
            >
              <span className="sr-only">WhatsApp {numero.texto}</span>
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M20.5 3.5A11 11 0 0 0 2.1 17.8L1 23l5.3-1.1A11 11 0 0 0 20.5 3.5zM12 20.5a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.2.8.8-3.1-.2-.3A9.1 9.1 0 1 1 12 20.5zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.4.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4.1 4 4 0 0 0 1.5.5 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.2-.3-.2-.6-.3z"
                />
              </svg>
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AcoesContato({
  id,
  email,
}: {
  id: number;
  email: string | null;
}) {
  const correio = emailDeContato(email);

  return (
    <div className="flex flex-wrap gap-2">
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
