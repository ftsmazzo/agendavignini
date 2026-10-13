import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fonte = Source_Sans_3({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-source",
});

const temaInicial = `(function(){try{var t=localStorage.getItem("tema");var escuro=t==="escuro"||(t!=="claro"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(escuro)document.documentElement.classList.add("dark");}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Agenda Coelho Vignini",
  description: "Prazos, audiências e contatos do escritório.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${fonte.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Script estático, sem dado de usuário: aplica o tema antes da pintura. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: texto fixo do repositório */}
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
