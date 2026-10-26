export type Passo = {
  texto: string;
  href?: string;
  rotulo?: string;
};

export type Guia = {
  id: string;
  titulo: string;
  admin: boolean;
  gatilhos: string[];
  relacionados: string[];
  abertura: string;
  passos: Passo[];
};

export type Opcao = { id: string; titulo: string };

export type Resposta =
  | { tipo: "guia"; guia: Guia; soAdmin: boolean }
  | { tipo: "escolha"; texto: string; opcoes: Opcao[] }
  | { tipo: "menu"; texto: string; opcoes: Opcao[] };

const PARADA = new Set([
  "como",
  "uma",
  "um",
  "o",
  "a",
  "os",
  "as",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "que",
  "eu",
  "me",
  "para",
  "pra",
  "pro",
  "no",
  "na",
  "em",
  "por",
  "com",
  "se",
  "ao",
  "aos",
  "nao",
  "sim",
  "qual",
  "onde",
  "quero",
  "preciso",
  "pode",
  "favor",
  "porfavor",
  "obrigado",
  "obrigada",
]);

const GUIAS: Guia[] = [
  {
    id: "cumprir",
    titulo: "Cumprir um prazo",
    admin: false,
    gatilhos: [
      "cumpro prazo",
      "cumprir prazo",
      "marcar cumprido",
      "dar baixa",
      "baixar prazo",
      "concluir prazo",
      "ja fiz o prazo",
      "fiz o prazo",
      "cumprir este prazo",
      "cumpro",
      "cumprir",
    ],
    relacionados: ["cumprir-varios", "meus", "atraso", "desfazer"],
    abertura:
      "Cumprir marca o prazo como feito. A tela pede confirmação antes de gravar.",
    passos: [
      {
        texto:
          "Abra os prazos de hoje, ou Meus prazos se o prazo está no seu nome.",
        href: "/prazos?quando=hoje",
        rotulo: "Abrir prazos de hoje",
      },
      {
        texto:
          "Ache o cartão do prazo em aberto. No fim do cartão, clique no botão verde Cumprir.",
      },
      {
        texto:
          "Abre uma janela no alto da tela: “Você deseja realmente cumprir este prazo?”. Clique em Cumprir para confirmar. Cancelar volta sem marcar.",
      },
      {
        texto:
          "O cartão fica vermelho. Isso significa prazo cumprido. Se era para vários de uma vez, use Cumprir vários.",
        href: "/prazos/meus",
        rotulo: "Abrir meus prazos",
      },
    ],
  },
  {
    id: "cumprir-varios",
    titulo: "Cumprir vários prazos",
    admin: false,
    gatilhos: [
      "cumprir varios",
      "cumprir tudo",
      "cumprir os em aberto",
      "baixar varios",
      "marcar varios cumpridos",
    ],
    relacionados: ["cumprir", "atraso", "meus"],
    abertura:
      "Serve para marcar de uma vez os prazos em aberto de um dia. Na lista do dia também existe o botão Cumprir os em aberto.",
    passos: [
      {
        texto:
          "No menu, clique em Cumprir vários. Ou, na lista do dia, clique em Cumprir os em aberto.",
        href: "/prazos/cumprir",
        rotulo: "Abrir cumprir vários",
      },
      {
        texto: "Escolha o Dia e clique em Ver dia.",
      },
      {
        texto:
          "Marque os prazos um a um, ou clique em Selecionar todos deste dia. O botão verde mostra a conta, por exemplo “Cumprir 3 prazos”.",
      },
      {
        texto:
          "Clique nesse botão. A janela pergunta se você deseja cumprir estes prazos. Clique em Cumprir para gravar, ou em Cancelar para desistir.",
      },
    ],
  },
  {
    id: "desfazer",
    titulo: "Desfazer um prazo cumprido",
    admin: true,
    gatilhos: [
      "desfazer",
      "voltar atras",
      "desmarcar cumprido",
      "errei cumprir",
    ],
    relacionados: ["cumprir", "editar-prazo"],
    abertura: "Só o administrador desfaz um cumprimento.",
    passos: [
      {
        texto:
          "Abra o dia do prazo e clique no chip Cumprido, para ver só os já feitos.",
        href: "/prazos?quando=hoje",
        rotulo: "Abrir prazos de hoje",
      },
      {
        texto:
          "No cartão vermelho, clique em Desfazer. O prazo volta a ficar em aberto.",
      },
    ],
  },
  {
    id: "meus",
    titulo: "Ver os prazos no meu nome",
    admin: false,
    gatilhos: [
      "meus prazos",
      "prazos no meu nome",
      "o que e meu",
      "minha carteira de prazo",
    ],
    relacionados: ["cumprir", "atraso", "hoje"],
    abertura: "Meus prazos lista só o que está destinado a você.",
    passos: [
      {
        texto: "No menu da esquerda, clique em Meus prazos.",
        href: "/prazos/meus",
        rotulo: "Abrir meus prazos",
      },
      {
        texto:
          "Cada cartão é um prazo. O botão verde Cumprir aparece quando ele ainda está em aberto.",
      },
    ],
  },
  {
    id: "atraso",
    titulo: "Ver prazos em atraso",
    admin: false,
    gatilhos: [
      "atraso",
      "atrasados",
      "vencidos",
      "passou do dia",
      "prazo velho",
    ],
    relacionados: ["cumprir", "meus", "adiar"],
    abertura: "Em atraso são os prazos em aberto cuja data já passou.",
    passos: [
      {
        texto:
          "No menu, clique em Em atraso. Na tela inicial, o cartão Em atraso abre a mesma lista.",
        href: "/prazos/atraso",
        rotulo: "Abrir em atraso",
      },
      {
        texto:
          "Para marcar como feito, use o botão verde Cumprir no cartão e confirme na janela.",
      },
    ],
  },
  {
    id: "hoje",
    titulo: "Ver os prazos de hoje",
    admin: false,
    gatilhos: [
      "prazos de hoje",
      "hoje",
      "tela inicial",
      "meu dia",
      "o que tem hoje",
    ],
    relacionados: ["semana", "cumprir", "audiencias"],
    abertura:
      "A tela inicial resume o dia. Os prazos de hoje abrem numa lista.",
    passos: [
      {
        texto: "Clique em Tela inicial, no topo do menu.",
        href: "/",
        rotulo: "Abrir a tela inicial",
      },
      {
        texto:
          "Clique no cartão Prazos de hoje. A lista abre com os chips de filtro no alto.",
        href: "/prazos?quando=hoje",
        rotulo: "Abrir prazos de hoje",
      },
      {
        texto:
          "Os chips filtram: Mostrar todos, Administrativo, Cível, Trabalhista, Cumprido, Não cumprido, Meus prazos e Defesas.",
      },
    ],
  },
  {
    id: "semana",
    titulo: "Ver os prazos da semana",
    admin: false,
    gatilhos: ["prazos da semana", "semana", "esta semana"],
    relacionados: ["hoje", "meus", "resumo"],
    abertura: "A semana útil aparece na tela inicial e numa lista.",
    passos: [
      {
        texto: "Na tela inicial, clique no cartão Prazos da semana.",
        href: "/prazos?quando=semana",
        rotulo: "Abrir prazos da semana",
      },
    ],
  },
  {
    id: "defesa",
    titulo: "Ver e marcar uma defesa",
    admin: false,
    gatilhos: ["defesa", "defesas", "lilas", "contestacao"],
    relacionados: ["criar-prazo", "hoje"],
    abertura:
      "Defesa fica em lilás. Entra quem está marcado como Defesa, ou quem tem a palavra defesa no título. Prazo cumprido continua vermelho.",
    passos: [
      {
        texto: "Abra os prazos do dia e clique no chip Defesas.",
        href: "/prazos?quando=hoje&defesa=1",
        rotulo: "Abrir defesas de hoje",
      },
      {
        texto:
          "Para classificar na hora de agendar, o administrador abre o prazo, no bloco Classificação marca Defesa, e clica em Salvar prazo.",
        href: "/admin/prazos/novo",
        rotulo: "Abrir agendar prazo",
      },
    ],
  },
  {
    id: "imprimir-prazo",
    titulo: "Imprimir um prazo",
    admin: false,
    gatilhos: [
      "imprimir prazo",
      "impressao do prazo",
      "folha do prazo",
      "imprimir",
    ],
    relacionados: ["cumprir", "hoje"],
    abertura: "Cada cartão de prazo tem o botão Imprimir.",
    passos: [
      {
        texto: "Abra o dia ou Meus prazos e ache o cartão.",
        href: "/prazos/meus",
        rotulo: "Abrir meus prazos",
      },
      {
        texto:
          "Clique em Imprimir. Na folha que abrir, use o botão de imprimir do navegador.",
      },
    ],
  },
  {
    id: "criar-prazo",
    titulo: "Agendar um prazo",
    admin: true,
    gatilhos: [
      "agendar prazo",
      "criar prazo",
      "crio prazo",
      "novo prazo",
      "adicionar prazo",
      "lancar prazo",
      "cadastrar prazo",
      "crio",
    ],
    relacionados: ["publicacao", "repetir", "defesa", "sem-advogado"],
    abertura:
      "Só o administrador agenda prazo. O advogado pode ficar em branco: a distribuição é feita depois.",
    passos: [
      {
        texto:
          "No menu, em Painel do administrador, abra Prazos e clique em Adicionar novo.",
        href: "/admin/prazos/novo",
        rotulo: "Abrir agendar prazo",
      },
      {
        texto:
          "Se tiver o texto da intimação, cole em Colar publicação e clique em Sugerir campos. A tela preenche tipo, data e título. Nada grava até você salvar.",
      },
      {
        texto:
          "Confira Tipo, Data e o campo Prazo. Sábado, domingo e feriado pulam para o próximo dia útil.",
      },
      {
        texto:
          "Em Classificação, deixe Prazo comum ou marque Defesa. Observação é livre. O campo Conteúdo não existe mais nesta tela.",
      },
      {
        texto:
          "Marque os advogados se já souber quem fica com o prazo. Pode salvar sem nenhum.",
      },
      {
        texto: "Clique em Salvar prazo, o botão azul no fim do formulário.",
      },
    ],
  },
  {
    id: "publicacao",
    titulo: "Colar uma publicação",
    admin: true,
    gatilhos: ["colar publicacao", "sugerir campos", "intimacao", "publicacao"],
    relacionados: ["criar-prazo"],
    abertura: "A publicação só sugere. Quem grava é o botão Salvar prazo.",
    passos: [
      {
        texto: "Abra Adicionar novo, em Prazos.",
        href: "/admin/prazos/novo",
        rotulo: "Abrir agendar prazo",
      },
      {
        texto: "Cole o texto em Colar publicação e clique em Sugerir campos.",
      },
      {
        texto:
          "Leia os avisos amarelos, ajuste o que faltar e clique em Salvar prazo.",
      },
    ],
  },
  {
    id: "repetir",
    titulo: "Repetir um prazo por meses",
    admin: true,
    gatilhos: [
      "repetir prazo",
      "recorrencia",
      "todo mes",
      "a cada",
      "varios meses",
    ],
    relacionados: ["criar-prazo"],
    abertura: "A repetição só aparece ao criar um prazo novo, não na edição.",
    passos: [
      {
        texto: "Abra Adicionar novo.",
        href: "/admin/prazos/novo",
        rotulo: "Abrir agendar prazo",
      },
      {
        texto:
          "Preencha Repetir por quantos meses e A cada quantos dias. Os dois em branco gravam uma data só.",
      },
      {
        texto: "A tela avisa quantas datas vão nascer. Clique em Salvar prazo.",
      },
    ],
  },
  {
    id: "editar-prazo",
    titulo: "Editar um prazo",
    admin: true,
    gatilhos: [
      "editar prazo",
      "corrigir prazo",
      "mudar prazo",
      "alterar prazo",
    ],
    relacionados: ["excluir-prazo", "adiar", "criar-prazo"],
    abertura: "Só o administrador edita o cadastro do prazo.",
    passos: [
      {
        texto: "Abra o dia do prazo.",
        href: "/prazos?quando=hoje",
        rotulo: "Abrir prazos de hoje",
      },
      {
        texto: "No cartão, clique em Editar.",
      },
      {
        texto: "Mude o que precisar e clique em Salvar prazo.",
      },
    ],
  },
  {
    id: "excluir-prazo",
    titulo: "Excluir um prazo",
    admin: true,
    gatilhos: ["excluir prazo", "apagar prazo", "remover prazo"],
    relacionados: ["editar-prazo", "desfazer"],
    abertura: "Excluir tira o prazo da lista. Não é o mesmo que cumprir.",
    passos: [
      {
        texto: "Abra o dia e, no cartão, clique em Excluir.",
        href: "/prazos?quando=hoje",
        rotulo: "Abrir prazos de hoje",
      },
      {
        texto:
          "Confirme só se tiver certeza. Cumprir deixa o prazo vermelho. Excluir apaga.",
      },
    ],
  },
  {
    id: "adiar",
    titulo: "Adiar prazos de um dia",
    admin: true,
    gatilhos: ["adiar", "mudar a data", "empurrar prazo", "prorrogar"],
    relacionados: ["atraso", "editar-prazo"],
    abertura:
      "Adiar muda a data dos prazos em aberto de um dia. Prazo cumprido fica no dia em que estava. O advogado recebe um aviso na agenda.",
    passos: [
      {
        texto:
          "No menu do administrador, em Prazos, clique em Adiar. Na lista do dia, o atalho se chama Adiar os em aberto.",
        href: "/admin/prazos/adiar",
        rotulo: "Abrir adiar",
      },
      {
        texto: "Escolha o Dia e clique em Ver dia.",
      },
      {
        texto:
          "Confira Nova data. Marque os prazos, ou clique em Selecionar todos deste dia.",
      },
      {
        texto:
          "Clique em Adiar N prazos. O botão só liga depois que algum prazo está marcado.",
      },
    ],
  },
  {
    id: "sem-advogado",
    titulo: "Destinar um prazo sem advogado",
    admin: true,
    gatilhos: [
      "sem advogado",
      "destinar",
      "distribuir",
      "marcar advogado",
      "vencidos sem dono",
      "colocar advogado",
    ],
    relacionados: ["tirar-advogado", "criar-prazo"],
    abertura:
      "Prazo pode nascer sem advogado. A distribuição é uma tela à parte.",
    passos: [
      {
        texto: "Abra Sem advogado, ou Vencidos sem dono se a data já passou.",
        href: "/admin/prazos/sem-advogado",
        rotulo: "Abrir sem advogado",
      },
      {
        texto:
          "No cartão do dia, quando o prazo está em aberto e sem ninguém, aparece Marcar advogado. Escolha a pessoa e grave.",
        href: "/admin/prazos/sem-advogado?fila=atraso",
        rotulo: "Abrir vencidos sem dono",
      },
    ],
  },
  {
    id: "tirar-advogado",
    titulo: "Tirar o advogado de um prazo",
    admin: true,
    gatilhos: ["tirar advogado", "remover advogado", "soltar prazo"],
    relacionados: ["sem-advogado"],
    abertura: "Tira a destinação. O prazo continua na lista, sem dono.",
    passos: [
      {
        texto: "No menu do administrador, em Prazos, clique em Tirar advogado.",
        href: "/admin/prazos/tirar-advogado",
        rotulo: "Abrir tirar advogado",
      },
      {
        texto:
          "Escolha o dia, marque os prazos e confirme. Eles passam a aparecer em Sem advogado.",
      },
    ],
  },
  {
    id: "audiencias",
    titulo: "Ver audiências e perícias",
    admin: false,
    gatilhos: [
      "ver audiencia",
      "minhas audiencia",
      "lista de audiencia",
      "audiencias da semana",
      "calendario de audiencia",
      "sino",
      "ver pericia",
      "vejo pericia",
      "vejo audiencia",
      "pericia",
    ],
    relacionados: ["criar-audiencia", "imprimir-audiencia", "hoje"],
    abertura:
      "Audiência e perícia aparecem na mesma lista. Perícia leva a marca Perícia.",
    passos: [
      {
        texto: "No menu, clique em Audiências.",
        href: "/audiencias",
        rotulo: "Abrir audiências",
      },
      {
        texto:
          "No alto, escolha Semana, Mês ou Próximas. Ao lado, Todas mostra o escritório e Suas mostra só as do seu nome.",
      },
      {
        texto:
          "O sino no topo da tela conta audiências e perícias em aberto no seu nome. Clique nele e, se quiser a lista, em Ver as minhas.",
        href: "/audiencias?minhas=1",
        rotulo: "Abrir as minhas",
      },
    ],
  },
  {
    id: "criar-audiencia",
    titulo: "Criar audiência ou perícia",
    admin: true,
    gatilhos: [
      "criar audiencia",
      "crio audiencia",
      "nova audiencia",
      "adicionar audiencia",
      "lancar audiencia",
      "agendar audiencia",
      "marcar audiencia",
      "criar pericia",
      "crio pericia",
      "nova pericia",
      "agendar pericia",
      "marcar pericia",
      "pericia",
      "crio",
    ],
    relacionados: ["tribunal", "audiencias", "editar-audiencia"],
    abertura:
      "Audiência e perícia nascem na mesma tela. Só o administrador cria.",
    passos: [
      {
        texto:
          "No menu do administrador, em Audiências, clique em Adicionar nova.",
        href: "/admin/audiencias/nova",
        rotulo: "Abrir nova audiência",
      },
      {
        texto:
          "No primeiro bloco, Tipo, marque Audiência ou Perícia. O título da tela e o botão de salvar mudam junto.",
      },
      {
        texto:
          "Digite o número do processo, com ou sem pontos. Se ele já existe no escritório, escolha na lista. Se não existe, a tela consulta o tribunal e preenche vara, local e partes.",
      },
      {
        texto:
          "Confira Local. Se o tribunal não mandar o foro, a cidade que estiver escrita na vara entra no Local. Data e hora você informa: é o horário do escritório.",
      },
      {
        texto:
          "Preencha forma, modalidade, preposto e observação se precisar. Marque os advogados.",
      },
      {
        texto:
          "Clique em Salvar audiência ou Salvar perícia. Para apagar o número e limpar o que foi puxado, apague o campo Núm. processo: vara, local e partes saem juntos. A data digitada fica.",
      },
    ],
  },
  {
    id: "tribunal",
    titulo: "Puxar vara e partes do tribunal",
    admin: true,
    gatilhos: [
      "puxar tribunal",
      "consultar tribunal",
      "infosimples",
      "vara e partes",
      "numero novo",
    ],
    relacionados: ["criar-audiencia"],
    abertura:
      "A consulta vale para TJSP e TRTs, no 1º grau, quando o número está completo e ainda não está no escritório.",
    passos: [
      {
        texto: "Abra uma audiência nova e cole o número completo.",
        href: "/admin/audiencias/nova",
        rotulo: "Abrir nova audiência",
      },
      {
        texto:
          "Espere a frase Consultando o tribunal. Se não preencher, clique em Puxar vara e partes no tribunal.",
      },
      {
        texto:
          "Reclamante e reclamado vêm da consulta. O Local recebe o foro ou, se não houver foro, a cidade que está dentro da vara.",
      },
    ],
  },
  {
    id: "editar-audiencia",
    titulo: "Editar ou excluir audiência",
    admin: true,
    gatilhos: [
      "editar audiencia",
      "excluir audiencia",
      "apagar audiencia",
      "corrigir audiencia",
      "editar pericia",
    ],
    relacionados: ["criar-audiencia", "audiencias"],
    abertura: "A lista do administrador abre a ficha para editar ou excluir.",
    passos: [
      {
        texto: "Em Audiências, clique em Listar.",
        href: "/admin/audiencias",
        rotulo: "Abrir a lista",
      },
      {
        texto:
          "Clique no cartão. Mude os campos e clique em Salvar, ou em Excluir no fim da ficha.",
      },
    ],
  },
  {
    id: "imprimir-audiencia",
    titulo: "Imprimir as audiências da semana",
    admin: false,
    gatilhos: [
      "imprimir audiencia",
      "imprimir a semana",
      "folha de audiencia",
      "imprimir",
    ],
    relacionados: ["audiencias"],
    abertura: "A impressão sai pela semana do dia que você está vendo.",
    passos: [
      {
        texto: "Abra Audiências.",
        href: "/audiencias",
        rotulo: "Abrir audiências",
      },
      {
        texto: "Clique em Imprimir a semana. Na folha, use o botão Imprimir.",
      },
    ],
  },
  {
    id: "contatos",
    titulo: "Achar um contato",
    admin: false,
    gatilhos: [
      "contato",
      "agenda de contato",
      "telefone",
      "cliente",
      "achar pessoa",
    ],
    relacionados: ["novo-contato", "pesquisar"],
    abertura:
      "Contatos ficam no grupo Agenda do menu, separado das audiências.",
    passos: [
      {
        texto: "No menu, abra Agenda e clique em Visualizar ou em Listar.",
        href: "/agenda",
        rotulo: "Abrir a agenda",
      },
      {
        texto:
          "Use a busca da própria tela, ou a busca do topo do menu, para achar nome, telefone ou e-mail.",
        href: "/agenda/lista",
        rotulo: "Abrir a lista",
      },
    ],
  },
  {
    id: "novo-contato",
    titulo: "Adicionar ou editar um contato",
    admin: false,
    gatilhos: [
      "novo contato",
      "adicionar contato",
      "cadastrar contato",
      "editar contato",
      "salvar contato",
    ],
    relacionados: ["contatos"],
    abertura: "Contato novo e contato editado usam o mesmo formulário.",
    passos: [
      {
        texto:
          "No menu, em Agenda, clique em Adicionar novo. Para editar, abra a pessoa na lista.",
        href: "/agenda/nova",
        rotulo: "Abrir novo contato",
      },
      {
        texto:
          "Preencha nome, telefones, e-mail e endereço. Clique em Salvar contato.",
      },
    ],
  },
  {
    id: "pesquisar",
    titulo: "Pesquisar prazo ou audiência",
    admin: false,
    gatilhos: ["pesquisar", "buscar", "procurar", "caixa de busca"],
    relacionados: ["perguntar", "contatos"],
    abertura: "A busca do menu olha processo, parte, cliente e local.",
    passos: [
      {
        texto:
          "No alto do menu escuro, digite na caixa Buscar prazo ou audiência e confirme.",
        href: "/busca",
        rotulo: "Abrir a pesquisa",
      },
      {
        texto:
          "A resposta separa prazos e audiências. Clique no item para ir ao dia.",
      },
    ],
  },
  {
    id: "perguntar",
    titulo: "Perguntar o que está na carteira",
    admin: false,
    gatilhos: ["perguntar", "quantos prazos", "o que a sylvamo", "carteira"],
    relacionados: ["pesquisar", "resumo"],
    abertura:
      "Perguntar responde com prazos e audiências já gravados. Não ensina o caminho e não cria prazo. Para o caminho, use este botão Ajuda.",
    passos: [
      {
        texto: "No menu, clique em Perguntar.",
        href: "/perguntar",
        rotulo: "Abrir perguntar",
      },
      {
        texto:
          "Escreva a pergunta, por exemplo o cliente e a semana, e confirme. A resposta cita o que já está lançado.",
      },
    ],
  },
  {
    id: "resumo",
    titulo: "Ver o resumo do dia",
    admin: false,
    gatilhos: ["resumo", "resumo do dia", "painel do dia"],
    relacionados: ["hoje", "audiencias"],
    abertura:
      "O resumo junta prazos e audiências de um dia, com filtro de advogado.",
    passos: [
      {
        texto: "No menu, clique em Resumo do dia.",
        href: "/resumo",
        rotulo: "Abrir o resumo",
      },
    ],
  },
  {
    id: "conta",
    titulo: "Alterar meus dados",
    admin: false,
    gatilhos: [
      "alterar dados",
      "meu nome",
      "meu email",
      "meu celular",
      "meu login",
    ],
    relacionados: ["senha", "avisos"],
    abertura: "Nome, e-mail, celular e login ficam em Alterar dados.",
    passos: [
      {
        texto: "No menu, clique em Alterar dados.",
        href: "/conta",
        rotulo: "Abrir alterar dados",
      },
      {
        texto:
          "No cartão Dados pessoais, ajuste os campos e clique em Salvar dados.",
      },
    ],
  },
  {
    id: "senha",
    titulo: "Alterar minha senha",
    admin: false,
    gatilhos: ["senha", "trocar senha", "esqueci a senha", "nova senha"],
    relacionados: ["conta"],
    abertura:
      "A senha troca na mesma tela dos seus dados. O escritório não vê a senha nova.",
    passos: [
      {
        texto: "Abra Alterar dados.",
        href: "/conta",
        rotulo: "Abrir alterar dados",
      },
      {
        texto:
          "No cartão Alterar senha, preencha Senha atual e Senha nova. Clique em Salvar senha.",
      },
    ],
  },
  {
    id: "avisos",
    titulo: "Ver avisos de prazo",
    admin: false,
    gatilhos: ["aviso", "avisos", "mudaram a data", "notificacao"],
    relacionados: ["conta", "adiar"],
    abertura:
      "Aviso de prazo aparece quando alguém muda a data de um prazo seu. Não é e-mail.",
    passos: [
      {
        texto:
          "Abra Alterar dados. Os avisos ficam no alto da página, antes dos formulários.",
        href: "/conta",
        rotulo: "Abrir alterar dados",
      },
      {
        texto:
          "O número ao lado de Alterar dados, no menu, conta os avisos ainda não lidos.",
      },
    ],
  },
  {
    id: "anos",
    titulo: "Ver outros anos",
    admin: false,
    gatilhos: ["outros anos", "ano passado", "calendario anual"],
    relacionados: ["hoje", "audiencias"],
    abertura:
      "Outros anos abre o calendário fora do mês que está na tela inicial.",
    passos: [
      {
        texto: "No menu, clique em Outros anos.",
        href: "/anos",
        rotulo: "Abrir outros anos",
      },
    ],
  },
  {
    id: "tema",
    titulo: "Mudar a cor da tela",
    admin: false,
    gatilhos: ["tema", "modo escuro", "modo claro", "escuro", "claro"],
    relacionados: ["conta"],
    abertura: "O botão de sol e lua fica no topo, ao lado do sino.",
    passos: [
      {
        texto:
          "No canto superior, clique no botão com o sol ou a lua. A tela alterna entre clara e escura.",
      },
    ],
  },
  {
    id: "sair",
    titulo: "Sair da agenda",
    admin: false,
    gatilhos: ["sair", "saio", "logout", "encerrar", "deslogar"],
    relacionados: ["senha"],
    abertura: "Sair encerra a sessão neste navegador.",
    passos: [
      {
        texto: "No canto superior direito, clique em Sair.",
      },
    ],
  },
  {
    id: "publicacao-antiga",
    titulo: "Ler a publicação antiga de um prazo",
    admin: false,
    gatilhos: ["ver publicacao", "publicacao antiga", "texto da intimacao"],
    relacionados: ["publicacao", "hoje"],
    abertura:
      "Prazo antigo ainda guarda o texto colado. O formulário novo não tem mais o campo Conteúdo.",
    passos: [
      {
        texto: "Abra o dia do prazo.",
        href: "/prazos?quando=hoje",
        rotulo: "Abrir prazos de hoje",
      },
      {
        texto:
          "No cartão, se existir, clique em Ver publicação. O texto abre ali mesmo. Prazo novo não mostra esse bloco.",
      },
    ],
  },
  {
    id: "conectar",
    titulo: "Conectar uma inteligência ao escritório",
    admin: true,
    gatilhos: ["conectar ia", "inteligencia", "mcp", "token"],
    relacionados: ["perguntar", "relatorios"],
    abertura:
      "Conectar IA cria um acesso só de leitura para uma ferramenta externa consultar a agenda. Não cria prazo nem audiência.",
    passos: [
      {
        texto: "No fim do menu do administrador, clique em Conectar IA.",
        href: "/admin/mcp",
        rotulo: "Abrir conectar IA",
      },
      {
        texto:
          "Siga as instruções da própria tela para gerar o acesso e copiar a configuração.",
      },
    ],
  },
  {
    id: "relatorios",
    titulo: "Abrir relatórios",
    admin: true,
    gatilhos: ["relatorio", "relatorios", "planilha"],
    relacionados: ["resumo", "usuarios"],
    abertura: "Relatórios ficam no painel do administrador.",
    passos: [
      {
        texto: "No fim do menu do administrador, clique em Relatórios.",
        href: "/admin/relatorios",
        rotulo: "Abrir relatórios",
      },
    ],
  },
  {
    id: "usuarios",
    titulo: "Cadastrar um usuário",
    admin: true,
    gatilhos: [
      "usuario",
      "usuarios",
      "novo advogado",
      "cadastrar login",
      "acesso",
    ],
    relacionados: ["senha", "sem-advogado"],
    abertura: "Quem entra na agenda é cadastrado pelo administrador.",
    passos: [
      {
        texto:
          "No menu do administrador, em Usuários, clique em Adicionar novo.",
        href: "/admin/usuarios/novo",
        rotulo: "Abrir novo usuário",
      },
      {
        texto:
          "Para corrigir alguém que já existe, abra Listar e clique na pessoa.",
        href: "/admin/usuarios",
        rotulo: "Abrir a lista",
      },
    ],
  },
];

const POR_ID = new Map(GUIAS.map((guia) => [guia.id, guia]));

export function guiaPorId(id: string) {
  return POR_ID.get(id) ?? null;
}

export function sugestoes(admin: boolean) {
  const ids = admin
    ? [
        "cumprir",
        "criar-audiencia",
        "criar-prazo",
        "audiencias",
        "senha",
        "sem-advogado",
      ]
    : ["cumprir", "audiencias", "meus", "atraso", "senha", "contatos"];
  return ids
    .map((id) => POR_ID.get(id))
    .filter((guia): guia is Guia => Boolean(guia))
    .map((guia) => ({ id: guia.id, titulo: guia.titulo }));
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nucleo(texto: string) {
  return normalizar(texto)
    .split(" ")
    .filter((parte) => parte.length > 1 && !PARADA.has(parte))
    .join(" ");
}

function radical(palavra: string) {
  if (palavra.length < 6 || !/(ar|er|ir)$/.test(palavra)) {
    return "";
  }
  const base = palavra.slice(0, -2);
  return base.length >= 4 ? base : "";
}

function casa(pergunta: string, palavra: string) {
  if (pergunta.includes(palavra)) {
    return true;
  }
  const base = radical(palavra);
  if (!base) {
    return false;
  }
  return pergunta.split(" ").some((parte) => {
    if (!parte.startsWith(base)) {
      return false;
    }
    return parte.length - base.length <= 3;
  });
}

function pontos(pergunta: string, guia: Guia) {
  let total = 0;
  for (const bruto of guia.gatilhos) {
    const gatilho = nucleo(bruto);
    if (gatilho.length < 4) {
      continue;
    }
    const palavras = gatilho.split(" ").filter((palavra) => palavra.length > 2);
    if (palavras.every((palavra) => casa(pergunta, palavra))) {
      total += 30 + gatilho.length;
      continue;
    }
    if (palavras.length < 2) {
      continue;
    }
    total += palavras.filter((palavra) => casa(pergunta, palavra)).length;
  }
  return total;
}

function menu(admin: boolean, texto: string): Resposta {
  return { tipo: "menu", texto, opcoes: sugestoes(admin) };
}

export function responder(texto: string, admin: boolean): Resposta {
  const limpo = nucleo(texto);
  if (!limpo || /^(oi|ola|ajuda|menu|inicio|comecar)$/.test(limpo)) {
    return menu(
      admin,
      "Pode perguntar com suas palavras. Eu mostro a tela e o botão, do começo ao fim.",
    );
  }
  const ranque = GUIAS.map((guia) => ({ guia, valor: pontos(limpo, guia) }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const primeiro = ranque[0];
  if (!primeiro || primeiro.valor < 8) {
    return menu(
      admin,
      "Não achei esse caminho. Escolha um destes, ou pergunte de outro jeito. Por exemplo: como cumpro um prazo.",
    );
  }
  const proximos = ranque
    .filter((item) => item.valor >= primeiro.valor * 0.82 && item.valor >= 12)
    .slice(0, 3);
  if (proximos.length > 1) {
    return {
      tipo: "escolha",
      texto: "Pode ser mais de um caminho. Qual destes?",
      opcoes: proximos.map((item) => ({
        id: item.guia.id,
        titulo: item.guia.titulo,
      })),
    };
  }
  return {
    tipo: "guia",
    guia: primeiro.guia,
    soAdmin: primeiro.guia.admin && !admin,
  };
}
