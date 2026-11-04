const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export function chaveOpenRouter() {
  return process.env.OPENROUTER_API_KEY?.trim() || "";
}

export async function chatOpenRouter(entrada: {
  model?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}) {
  const chave = chaveOpenRouter();
  if (!chave) {
    throw new Error("OPENROUTER_API_KEY ausente");
  }

  const corpo: Record<string, unknown> = {
    model:
      entrada.model ?? process.env.RELATORIO_IA_MODELO ?? "openai/gpt-4o-mini",
    messages: entrada.messages,
    max_tokens: entrada.maxTokens ?? 4000,
    temperature: entrada.temperature ?? 0,
  };
  if (entrada.json) {
    corpo.response_format = { type: "json_object" };
  }

  const resposta = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "https://agendacv.com.br",
      "X-Title": "Agenda Coelho Vignini",
    },
    body: JSON.stringify(corpo),
  });

  const dados = (await resposta.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!resposta.ok) {
    throw new Error(dados.error?.message || `OpenRouter ${resposta.status}`);
  }

  return dados.choices?.[0]?.message?.content ?? "";
}
