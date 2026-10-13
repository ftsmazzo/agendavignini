export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    return;
  }

  const { aplicarMigracoes } = await import("@/db/migrate");
  await aplicarMigracoes(url);
}
