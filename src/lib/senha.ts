import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";

const ARGON = {
  iterations: 2,
  parallelism: 1,
  memorySize: 19456,
  hashLength: 32,
} as const;

function md5Hex(senha: string) {
  return createHash("md5").update(senha, "utf8").digest("hex");
}

export function md5Confere(senha: string, hash: string) {
  const calculado = Buffer.from(md5Hex(senha));
  const gravado = Buffer.from(hash.toLowerCase());
  return (
    calculado.length === gravado.length && timingSafeEqual(calculado, gravado)
  );
}

export function gerarArgon2id(senha: string) {
  return argon2id({
    password: senha,
    salt: randomBytes(16),
    ...ARGON,
    outputType: "encoded",
  });
}

export function argonConfere(senha: string, hash: string) {
  return argon2Verify({ password: senha, hash });
}
