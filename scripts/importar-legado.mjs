import { createReadStream } from "node:fs";
import postgres from "postgres";

const AREAS = new Set(["administrativo", "civil", "trabalhista"]);
const MARCA = "INSERT INTO `";
const ESCAPES = { 0: "\0", b: "\b", n: "\n", r: "\r", t: "\t", Z: "\u001a" };

class Leitor {
  constructor(aoRegistro) {
    this.aoRegistro = aoRegistro;
    this.texto = "";
    this.i = 0;
    this.fim = false;
    this.estado = "buscar";
    this.tabela = "";
    this.colunas = [];
    this.campos = [];
    this.campo = "";
    this.escape = false;
  }

  empurrar(pedaco) {
    this.texto += pedaco;
    this.consumir();
    if (this.i > 2_000_000 && this.estado !== "texto") {
      this.texto = this.texto.slice(this.i);
      this.i = 0;
    }
  }

  finalizar() {
    this.fim = true;
    this.consumir();
  }

  consumir() {
    while (this.i < this.texto.length) {
      if (!this.passo()) {
        return;
      }
    }
  }

  passo() {
    if (this.estado === "buscar") {
      return this.buscar();
    }
    if (this.estado === "colunas") {
      return this.lerColunas();
    }
    if (this.estado === "texto") {
      return this.lerTexto();
    }
    return this.lerEstrutura();
  }

  buscar() {
    const pos = this.texto.indexOf(MARCA, this.i);
    if (pos === -1) {
      this.i = Math.max(this.i, this.texto.length - MARCA.length);
      return false;
    }
    const fimNome = this.texto.indexOf("`", pos + MARCA.length);
    if (fimNome === -1) {
      this.i = pos;
      return false;
    }
    this.tabela = this.texto.slice(pos + MARCA.length, fimNome);
    this.i = fimNome + 1;
    this.colunas = [];
    this.estado = "colunas";
    return true;
  }

  lerColunas() {
    const valores = this.texto.indexOf("VALUES", this.i);
    if (valores === -1) {
      return false;
    }
    this.colunas = [
      ...this.texto.slice(this.i, valores).matchAll(/`([^`]+)`/g),
    ].map((item) => item[1]);
    this.i = valores + "VALUES".length;
    this.estado = "entre";
    return true;
  }

  lerTexto() {
    const char = this.texto[this.i];
    if (this.escape) {
      this.campo += ESCAPES[char] ?? char;
      this.escape = false;
      this.i += 1;
      return true;
    }
    if (char === "\\") {
      if (this.i + 1 >= this.texto.length) {
        return false;
      }
      this.escape = true;
      this.i += 1;
      return true;
    }
    if (char === "'") {
      this.campos.push(this.campo);
      this.campo = "";
      this.i += 1;
      this.estado = "depois";
      return true;
    }
    this.campo += char;
    this.i += 1;
    return true;
  }

  lerEstrutura() {
    const char = this.texto[this.i];
    if (char === " " || char === "\n" || char === "\r" || char === "\t") {
      this.i += 1;
      return true;
    }

    if (this.estado === "entre") {
      if (char === "(") {
        this.campos = [];
        this.estado = "valor";
      } else if (char === ";") {
        this.estado = "buscar";
      }
      this.i += 1;
      return true;
    }

    if (this.estado === "valor") {
      if (char === "'") {
        this.campo = "";
        this.escape = false;
        this.estado = "texto";
        this.i += 1;
        return true;
      }
      if (this.texto.startsWith("NULL", this.i)) {
        this.campos.push(null);
        this.i += 4;
        this.estado = "depois";
        return true;
      }
      const resto = this.texto.slice(this.i);
      const numero = resto.match(/^-?\d+(?:\.\d+)?/);
      if (!numero) {
        return false;
      }
      const completo =
        this.i + numero[0].length < this.texto.length || this.fim;
      if (!completo) {
        return false;
      }
      this.campos.push(numero[0]);
      this.i += numero[0].length;
      this.estado = "depois";
      return true;
    }

    if (char === ",") {
      this.i += 1;
      this.estado = "valor";
      return true;
    }
    if (char === ")") {
      this.emitir();
      this.i += 1;
      this.estado = "entre";
      return true;
    }
    return false;
  }

  emitir() {
    const registro = {};
    this.colunas.forEach((coluna, indice) => {
      registro[coluna] = this.campos[indice] ?? null;
    });
    this.aoRegistro(this.tabela, registro);
  }
}

async function percorrer(caminho, aoRegistro) {
  const pendencias = [];
  const leitor = new Leitor((tabela, registro) => {
    pendencias.push([tabela, registro]);
  });
  const stream = createReadStream(caminho, {
    encoding: "utf8",
    highWaterMark: 256 * 1024,
  });
  for await (const pedaco of stream) {
    leitor.empurrar(pedaco);
    while (pendencias.length > 0) {
      const [tabela, registro] = pendencias.shift();
      await aoRegistro(tabela, registro);
    }
  }
  leitor.finalizar();
  while (pendencias.length > 0) {
    const [tabela, registro] = pendencias.shift();
    await aoRegistro(tabela, registro);
  }
}

function testarLeitor() {
  const dump = [
    "INSERT INTO `agenda` (`id`, `nome`, `telefone`, `celular`, `email`, `endereco`, `nascimento`) VALUES",
    "(1, 'Ana', '1', NULL, '', 'rua', '0000-00-00'),",
    "(2, 'Boa', '2', '9', 'a@b.c', 'com \\'aspas\\'', '1990-01-02');",
    "INSERT INTO `usuarios` (`id`, `login`, `ativo`) VALUES",
    "(7, 'Ada', '1');",
  ].join("\n");
  const linhas = [];
  const leitor = new Leitor((tabela, registro) =>
    linhas.push([tabela, registro]),
  );
  for (let indice = 0; indice < dump.length; indice += 3) {
    leitor.empurrar(dump.slice(indice, indice + 3));
  }
  leitor.finalizar();
  const esperado =
    linhas.length === 3 &&
    linhas[1][1].endereco === "com 'aspas'" &&
    linhas[2][1].login === "Ada";
  if (!esperado) {
    console.error(JSON.stringify(linhas));
    process.exit(1);
  }
  console.log("leitor ok");
}

function calendarioValido(ano, mes, dia) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

function dataValida(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const [ano, mes, dia] = valor.split("-").map(Number);
  return ano >= 1900 && ano <= 2100 && calendarioValido(ano, mes, dia);
}

function horaValida(valor) {
  if (typeof valor !== "string") {
    return false;
  }
  const match = valor.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) {
    return false;
  }
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  const hora = Number(match[4]);
  const minuto = Number(match[5]);
  const segundo = Number(match[6]);
  return (
    ano >= 1900 &&
    ano <= 2100 &&
    hora <= 23 &&
    minuto <= 59 &&
    segundo <= 59 &&
    calendarioValido(ano, mes, dia)
  );
}

function textoOuVazio(valor) {
  return typeof valor === "string" ? valor : "";
}

function nuloSeVazio(valor) {
  if (typeof valor !== "string" || valor.trim() === "") {
    return null;
  }
  return valor;
}

function inteiro(valor) {
  if (typeof valor !== "string" || !/^\d+$/.test(valor)) {
    return null;
  }
  return Number(valor);
}

function somar(mapa, chave) {
  mapa[chave] = (mapa[chave] ?? 0) + 1;
}

async function gravarLote(tx, tabela, lote) {
  if (lote.length === 0) {
    return 0;
  }
  const quantidade = lote.length;
  if (tabela === "usuarios") {
    await tx`insert into usuarios ${tx(lote, "id", "nome", "sobrenome", "email", "celular", "login", "senha_hash", "algoritmo_senha", "ativo", "entra_no_relatorio", "papel")}`;
  } else if (tabela === "contatos") {
    await tx`insert into contatos ${tx(lote, "id", "nome", "telefone", "celular", "email", "endereco", "nascimento")}`;
  } else if (tabela === "prazos") {
    await tx`insert into prazos ${tx(lote, "id", "area", "data", "observacao", "conteudo", "titulo", "situacao", "cumprido_por_id", "cumprido_em")}`;
  } else if (tabela === "prazos_usuarios") {
    await tx`insert into prazos_usuarios ${tx(lote, "prazo_id", "usuario_id")}`;
  } else if (tabela === "audiencias") {
    await tx`insert into audiencias ${tx(lote, "id", "numero_processo", "vara", "local", "reclamante", "reclamado", "preposto", "data_hora", "observacao")}`;
  } else if (tabela === "audiencias_usuarios") {
    await tx`insert into audiencias_usuarios ${tx(lote, "audiencia_id", "usuario_id")}`;
  }
  lote.length = 0;
  return quantidade;
}

function usuarioDe(registro) {
  const grupo = registro.grupo === "admin" ? "admin" : "usuario";
  return {
    id: inteiro(registro.id),
    nome: textoOuVazio(registro.nome),
    sobrenome: textoOuVazio(registro.sobrenome),
    email: nuloSeVazio(registro.email),
    celular: nuloSeVazio(registro.celular),
    login: textoOuVazio(registro.login).trim(),
    senha_hash: textoOuVazio(registro.senha),
    algoritmo_senha: "md5",
    ativo: registro.ativo === "1",
    entra_no_relatorio: registro.relatorio === "1",
    papel: grupo,
  };
}

async function importar(caminho, url) {
  const usuarios = [];
  const pulados = {};
  await percorrer(caminho, (tabela, registro) => {
    if (tabela === "usuarios") {
      usuarios.push(usuarioDe(registro));
    }
  });

  const sql = postgres(url, { max: 1, connect_timeout: 30 });
  const idsUsuarios = new Set(usuarios.map((item) => item.id));
  const idsPrazos = new Set();
  const idsAudiencias = new Set();
  const lotes = {
    contatos: [],
    prazos: [],
    prazos_usuarios: [],
    audiencias: [],
    audiencias_usuarios: [],
  };

  try {
    await sql.begin(async (tx) => {
      await tx`truncate table auditoria, audiencias_usuarios, prazos_usuarios, audiencias, prazos, contatos, usuarios restart identity cascade`;
      await gravarLote(tx, "usuarios", usuarios);

      await percorrer(caminho, async (tabela, registro) => {
        if (tabela === "agenda") {
          lotes.contatos.push({
            id: inteiro(registro.id),
            nome: textoOuVazio(registro.nome),
            telefone: textoOuVazio(registro.telefone),
            celular: nuloSeVazio(registro.celular),
            email: nuloSeVazio(registro.email),
            endereco: nuloSeVazio(registro.endereco),
            nascimento: dataValida(registro.nascimento)
              ? registro.nascimento
              : null,
          });
          if (lotes.contatos.length >= 200) {
            await gravarLote(tx, "contatos", lotes.contatos);
          }
        } else if (tabela === "audiencias") {
          if (!horaValida(registro.datahora)) {
            somar(pulados, "audiencia_sem_data");
            return;
          }
          const id = inteiro(registro.id);
          idsAudiencias.add(id);
          lotes.audiencias.push({
            id,
            numero_processo: textoOuVazio(registro.numprocesso),
            vara: textoOuVazio(registro.vara),
            local: textoOuVazio(registro.local),
            reclamante: nuloSeVazio(registro.reclamante),
            reclamado: nuloSeVazio(registro.reclamado),
            preposto: nuloSeVazio(registro.preposto),
            data_hora: `${registro.datahora.replace(" ", "T")}-03:00`,
            observacao: nuloSeVazio(registro.observacao),
          });
          if (lotes.audiencias.length >= 200) {
            await gravarLote(tx, "audiencias", lotes.audiencias);
          }
        } else if (tabela === "prazos") {
          if (!dataValida(registro.data) || !AREAS.has(registro.tipo)) {
            somar(
              pulados,
              !AREAS.has(registro.tipo)
                ? `area_${registro.tipo}`
                : "prazo_sem_data",
            );
            return;
          }
          const id = inteiro(registro.id);
          const autor = inteiro(registro.status);
          idsPrazos.add(id);
          const hora = horaValida(registro.datahoracumprido)
            ? `${registro.datahoracumprido.replace(" ", "T")}-03:00`
            : dataValida(registro.data_cumprido)
              ? `${registro.data_cumprido}T12:00:00-03:00`
              : null;
          lotes.prazos.push({
            id,
            area: registro.tipo,
            data: registro.data,
            observacao: textoOuVazio(registro.observacao),
            conteudo: textoOuVazio(registro.conteudo),
            titulo: textoOuVazio(registro.prazo) || "(sem título)",
            situacao: autor && autor > 0 ? "cumprido" : "aberto",
            cumprido_por_id: autor && idsUsuarios.has(autor) ? autor : null,
            cumprido_em: autor && autor > 0 ? hora : null,
          });
          if (lotes.prazos.length >= 80) {
            const quantidade = await gravarLote(tx, "prazos", lotes.prazos);
            if (quantidade && idsPrazos.size % 8000 < 80) {
              console.log(`prazos ${idsPrazos.size}`);
            }
          }
        } else if (tabela === "prazosUsuarios") {
          const prazoId = inteiro(registro.idPrazo);
          const usuarioId = inteiro(registro.idUsuario);
          if (!idsPrazos.has(prazoId) || !idsUsuarios.has(usuarioId)) {
            somar(pulados, "vinculo_prazo");
            return;
          }
          await gravarLote(tx, "prazos", lotes.prazos);
          lotes.prazos_usuarios.push({
            prazo_id: prazoId,
            usuario_id: usuarioId,
          });
        } else if (tabela === "audienciasUsuarios") {
          await gravarLote(tx, "audiencias", lotes.audiencias);
          const audienciaId = inteiro(registro.idAudiencia);
          const usuarioId = inteiro(registro.idUsuario);
          if (!idsAudiencias.has(audienciaId) || !idsUsuarios.has(usuarioId)) {
            somar(pulados, "vinculo_audiencia");
            return;
          }
          lotes.audiencias_usuarios.push({
            audiencia_id: audienciaId,
            usuario_id: usuarioId,
          });
        }
      });

      await gravarLote(tx, "contatos", lotes.contatos);
      await gravarLote(tx, "audiencias", lotes.audiencias);
      await gravarLote(tx, "prazos", lotes.prazos);
      await gravarLote(tx, "prazos_usuarios", lotes.prazos_usuarios);
      await gravarLote(tx, "audiencias_usuarios", lotes.audiencias_usuarios);

      await tx`select setval(pg_get_serial_sequence('usuarios', 'id'), coalesce((select max(id) from usuarios), 1), true)`;
      await tx`select setval(pg_get_serial_sequence('contatos', 'id'), coalesce((select max(id) from contatos), 1), true)`;
      await tx`select setval(pg_get_serial_sequence('prazos', 'id'), coalesce((select max(id) from prazos), 1), true)`;
      await tx`select setval(pg_get_serial_sequence('audiencias', 'id'), coalesce((select max(id) from audiencias), 1), true)`;
    });

    const [contagem] =
      await sql`select (select count(*)::int from prazos) as prazos, (select count(*)::int from usuarios) as usuarios, (select count(*)::int from contatos) as contatos, (select count(*)::int from audiencias) as audiencias`;
    console.log(JSON.stringify({ contagem, pulados }));
  } finally {
    await sql.end();
  }
}

const argumento = process.argv[2];
if (argumento === "--teste") {
  testarLeitor();
} else if (argumento === "--contagem" && process.argv[3]) {
  const totais = {};
  await percorrer(process.argv[3], (tabela) => {
    somar(totais, tabela);
  });
  console.log(JSON.stringify(totais));
} else if (argumento && process.env.DATABASE_URL) {
  await importar(argumento, process.env.DATABASE_URL);
} else {
  console.error(
    "Uso: DATABASE_URL=... node scripts/importar-legado.mjs caminho.sql",
  );
  process.exit(1);
}
