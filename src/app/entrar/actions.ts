"use server";

import { redirect } from "next/navigation";
import { autenticar } from "@/lib/autenticar";

export async function entrar(formData: FormData) {
  const login = String(formData.get("login") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const ok = await autenticar(login, senha);
  if (!ok) {
    redirect("/entrar?erro=1");
  }
  redirect("/");
}
