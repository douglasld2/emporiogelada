/**
 * ============================================
 * CONFIGURAÇÃO CENTRALIZADA DA LOJA
 * ============================================
 *
 * Este arquivo contém TODAS as informações personalizáveis da loja.
 * Para adaptar o site para um novo cliente, modifique apenas este arquivo.
 */

export const storeConfig = {
  // ============================================
  // INFORMAÇÕES BÁSICAS DA LOJA
  // ============================================
  name: "Empório Gelada",
  shortName: "Empório Gelada",
  tagline: "Bebidas, Destilados & Tabacaria",
  description:
    "Sua casa de bebidas premium desde 2016. Cervejas geladas, destilados selecionados, vinhos e muito mais.",
  foundedYear: 2016,

  // ============================================
  // CONTATO
  // ============================================
  contact: {
    phone: "+55 (32) 3236-5994",
    phoneClean: "553232365994",
    email: "contato@emporiogelada.com.br",
    emailSupport: "suporte@emporiogelada.com.br",
    whatsappMessage:
      "Olá! Gostaria de mais informações sobre os produtos da Empório Gelada.",
    hours: "Seg-Sab: 10h - 22h",
  },

  // ============================================
  // ENDEREÇO
  // ============================================
  address: {
    street: "Av. Pedro Henrique Krambeck, nº 1249",
    neighborhood: "Centro",
    city: "Juiz de Fora",
    state: "MG",
    country: "Brasil",
    zipCode: "36015-260",
    full: "Av. Pedro Henrique Krambeck, nº 1249, Centro, Juiz de Fora - MG",
  },

  // ============================================
  // REDES SOCIAIS
  // ============================================
  social: {
    instagram: "https://instagram.com/emporiogelada",
    facebook: "https://facebook.com/emporiogelada",
    pinterest: "",
    tiktok: "",
  },

  // ============================================
  // VERIFICAÇÃO DE IDADE
  // ============================================
  ageVerification: {
    enabled: true,
    minimumAge: 18,
    title: "Verificação de Idade",
    message:
      "Este site contém produtos alcoólicos e de tabaco. Você confirma que tem 18 anos ou mais?",
    confirmText: "Sim, tenho 18 anos ou mais",
    denyText: "Não, sou menor de idade",
    deniedMessage:
      "Desculpe, você precisa ter 18 anos ou mais para acessar este site.",
  },

  // ============================================
  // PÁGINA "SOBRE" (About)
  // ============================================
  about: {
    heroTitle: "Nossa História",
    heroSubtitle: "Excelência que se constrói ao longo do tempo",
    quote: "Há 10 anos elevando padrões e brindando histórias.",

    philosophy: {
      title: "Nossa Filosofia",
      paragraphs: [
        "Mais do que uma loja, somos especialistas em proporcionar experiências. Ao longo dos anos, nos tornamos referência em           bebidas premium, reunindo uma curadoria que vai de cervejas artesanais sempre geladas a destilados importados,                 passando por vinhos selecionados e uma tabacaria completa.",
      ],
    },

    craftsmanship: {
      title: "Qualidade & Tradição",
      subtitle: "Desde 2016, servindo com qualidade e paixão.",
      items: [
        {
          title: "Variedade",
          description:
            "Nossa linha de produtos vai além: carnes selecionadas, linguiças especiais, petiscos, molhos e temperos que elevam              o seu churrasco a outro nível.",
        },
        {
          title: "Qualidade",
          description:
            "Sempre à frente, acompanhamos as tendências e ampliamos constantemente nosso portfólio. A inclusão da nossa área                de tabacaria reforça esse compromisso. ",
        },
        {
          title: "Atendimento",
          description:
            "Nossa essência permanece a mesma desde o início: atendimento próximo, conhecimento de produto e compromisso                     genuíno com cada cliente. ",
        },
      ],
    },
  },

  // ============================================
  // POLÍTICAS
  // ============================================
  policies: {
    shipping: {
      title: "Política de Entrega",
      content: [
        "Realizamos entregas para todo o Brasil via Correios (PAC e SEDEX).",
        "O prazo de entrega varia de acordo com a localidade e o método escolhido.",
        "Produtos frágeis como vinhos e destilados são embalados com cuidado especial para garantir que cheguem em perfeitas condições.",
        "Não nos responsabilizamos por atrasos causados pelos Correios ou por condições climáticas adversas.",
      ],
    },
    returns: {
      title: "Política de Trocas e Devoluções",
      content: [
        "Aceitamos trocas e devoluções em até 7 dias após o recebimento do produto.",
        "O produto deve estar lacrado, sem sinais de uso e na embalagem original.",
        "Em caso de produto danificado durante o transporte, entre em contato imediatamente com fotos do dano.",
        "Produtos de tabacaria abertos não podem ser devolvidos por questões higiênicas.",
      ],
    },
    privacy: {
      title: "Política de Privacidade",
      content: [
        "Seus dados pessoais são tratados com total confidencialidade e segurança.",
        "Não compartilhamos suas informações com terceiros sem seu consentimento.",
        "Utilizamos seus dados apenas para processar pedidos e melhorar sua experiência de compra.",
        "Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato conosco.",
      ],
    },
    ageRestriction: {
      title: "Restrição de Idade",
      content: [
        "A venda de bebidas alcoólicas e produtos de tabaco é proibida para menores de 18 anos.",
        "Ao realizar uma compra, o cliente confirma ter 18 anos ou mais.",
        "Reservamo-nos o direito de solicitar comprovação de idade a qualquer momento.",
        "O descumprimento desta política resultará no cancelamento imediato do pedido.",
      ],
    },
  },

  // ============================================
  // TEXTOS DO FOOTER
  // ============================================
  footer: {
    copyright: "Todos os direitos reservados.",
    ageWarning:
      "Proibida a venda de bebidas alcoólicas e produtos de tabaco para menores de 18 anos.",
    developer: {
      name: "SalvaCode",
      url: "https://salvacode.com",
    },
  },

  // ============================================
  // SEO & META TAGS
  // ============================================
  seo: {
    title: "Empório Gelada | Bebidas, Destilados & Tabacaria",
    ogTitle: "Empório Gelada",
    ogDescription:
      "Sua casa de bebidas premium desde 2016. Cervejas geladas, destilados selecionados, vinhos e tabacaria.",
  },

  // ============================================
  // CORES PRINCIPAIS (para referência)
  // ============================================
  colors: {
    primary: "#000000", // Azul escuro - cor principal
    secondary: "#c9a96e", // Dourado âmbar - cor secundária
    accent: "#8b1a1a", // Vinho/bordô - destaque
    background: "#f8f5f0", // Creme - fundo
    text: "#000000", // Texto escuro
    muted: "#6B7280", // Texto secundário
  },

  // ============================================
  // MOEDA E LOCALIZAÇÃO
  // ============================================
  locale: {
    currency: "BRL",
    currencySymbol: "R$",
    language: "pt-BR",
    country: "Brasil",
  },

  // ============================================
  // MENSAGENS E TEXTOS DIVERSOS
  // ============================================
  messages: {
    emptyCart: "Sua sacola está vazia",
    addToCart: "Adicionar à Sacola",
    checkout: "Finalizar Compra",
    continueShopping: "Continuar Comprando",
    orderConfirmation: "Pedido Confirmado!",
    thankYou: "Obrigado pela sua compra!",
  },

  // ============================================
  // SUPORTE
  // ============================================
  support: {
    phoneDisplay: "+55 (32) 3236-5994",
    hours: "Seg-Sab: 10h - 22h",
  },

  // ============================================
  // CATEGORIAS PRINCIPAIS (exibidas na navegação)
  // ============================================
  mainCategories: [
    { label: "Vinhos", slug: "vinhos" },
    { label: "Destilados", slug: "destilados" },
    { label: "Cervejas", slug: "cervejas" },
    { label: "Tabacaria", slug: "tabacaria" },
    { label: "Kits & Presentes", slug: "kits" },
  ],
};

export const {
  name,
  shortName,
  contact,
  address,
  about,
  footer,
  seo,
  colors,
  locale,
  messages,
  support,
} = storeConfig;

export type StoreConfig = typeof storeConfig;
