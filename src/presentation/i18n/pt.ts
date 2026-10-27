/**
 * Todo texto visivel do app mora aqui (regra do CLAUDE.md).
 * Codigo em ingles, interface em portugues.
 */
export const pt = {
  app: {
    name: "Fluente365",
    tagline: "Inglês de verdade, 20 minutos por dia.",
  },
  nav: {
    today: "Hoje",
    progress: "Meu progresso",
    profile: "Perfil",
  },
  auth: {
    signInTitle: "Entrar no Fluente365",
    signInSubtitle: "Use seu e-mail ou sua conta Google.",
    email: "E-mail",
    emailPlaceholder: "voce@exemplo.com",
    password: "Senha",
    passwordPlaceholder: "mínimo de 8 caracteres",
    signIn: "Entrar",
    signUp: "Criar conta",
    signOut: "Sair",
    signOutError: "Não foi possível sair. Tente de novo.",
    withGoogle: "Continuar com Google",
    noAccount: "Ainda não tem conta?",
    hasAccount: "Já tem conta?",
    checkEmail: "Enviamos um link de confirmação para o seu e-mail.",
    genericError: "Não foi possível entrar. Confira os dados e tente de novo.",
    weakPassword: "A senha precisa ter pelo menos 8 caracteres.",
    invalidEmail: "Digite um e-mail válido.",
  },
  today: {
    title: "Sua sessão de hoje",
    greeting: "Bom te ver por aqui",
    reviewsDue: "revisões para hoje",
    noReviews: "Nenhuma revisão pendente — comece a lição do dia.",
    extraQueue: "na fila de revisão extra",
    startSession: "Começar os 20 minutos",
    rescueSession: "Sessão de resgate (5 min)",
    streak: "dias seguidos",
    shields: "escudos",
    vocabulary: "palavras no seu vocabulário",
    levels: "Seu nível por habilidade",
    comingSoon: "A sessão diária completa chega na Fase 1.",
  },
  skills: {
    reading: "Leitura",
    listening: "Escuta",
    writing: "Escrita",
    speaking: "Fala",
  },
  offline: {
    title: "Você está sem internet",
    body: "Suas revisões já baixadas continuam funcionando. Assim que a conexão voltar, tudo sincroniza sozinho.",
    retry: "Tentar de novo",
  },
  errors: {
    unexpectedTitle: "Algo deu errado",
    unexpectedBody: "Tente novamente. Se continuar, avise o administrador.",
    notFoundTitle: "Página não encontrada",
    notFoundBody: "O endereço que você abriu não existe.",
    backHome: "Voltar para o início",
  },
} as const;

export type Translations = typeof pt;
