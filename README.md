# DealVision — Front-end da Sprint 4

Interface do TOTVS AdvisorMind com a identidade visual DealVision: tema escuro, azul elétrico, menu lateral e módulos SmartBriefing AI, Conversational Analytics e VoC Tracker, seguindo as referências fornecidas.

## Esta etapa usa somente HTML e CSS

O projeto é uma **prévia navegável**, sem JavaScript, frameworks, instalação de dependências ou compilação. As telas já representam os fluxos do backend, mas os cadastros, listagens, estatísticas, resultados de IA e gráficos exibidos são **dados ilustrativos**. Eles não são carregados do Oracle.

HTML e CSS não enviam os corpos JSON nem os métodos PUT/DELETE exigidos pela API. Portanto, salvar/editar/excluir cadastros, importar JSON e gerar análises reais ficarão para a próxima etapa, com autorização para acrescentar JavaScript. Os formulários desta versão validam os campos no navegador e abrem uma mensagem de prévia, sem alterar o banco ou chamar a OpenAI.

A exportação de reuniões e a consulta de clientes na página Dados e arquivos já têm links diretos para os endpoints GET do backend local. Esses links dependem da API em execução e não preenchem a interface com dados reais.

## Abrir no VS Code

1. Clone o repositório:

~~~bash
git clone https://github.com/jovexdev/Chalenge_JAVA_FRONT.git
~~~

2. No VS Code, use **File → Open Folder** e abra a pasta clonada.
3. Instale a extensão **Live Server**, de Ritwick Dey, se ainda não estiver instalada. A recomendação já está na pasta .vscode.
4. Clique com o botão direito em **index.html → Open with Live Server**.
5. Normalmente a página abrirá em **http://127.0.0.1:5500**. A porta 5500 já é permitida pelo CORS do backend.

Não crie um projeto Java dentro deste repositório e não copie a pasta src do backend para cá. O backend continua aberto no IntelliJ; o front-end é uma pasta separada no VS Code.

Para receber futuras atualizações, execute **git pull** dentro da pasta do front-end. Não é necessário npm install ou npm run dev.

## Navegação

| Arquivo | Tela |
| --- | --- |
| index.html | Dashboard e acesso aos módulos |
| clientes.html | Lista de clientes, detalhes e formulários de cadastro/edição/exclusão |
| vendedores.html | Equipe, histórico, ticket, senioridade e comissão estimada |
| reunioes.html | Histórico, filtros CSS de temperatura, detalhes e edição/exclusão |
| nova-reuniao.html | Contexto, cliente, vendedor e transcrição |
| reuniao.html | Visão geral e transcrição demonstrativa da reunião |
| smart-briefing.html | Resumo executivo, decisões, riscos e próximos passos |
| analytics.html | Arco de sentimento, tempo de fala, contexto e momento crítico |
| voc-tracker.html | Reclamações, oportunidades, melhorias e recomendações |
| dados.html | Importação visual, arquivo de exemplo e links de exportação/consulta |

A análise detalhada usa o exemplo Banco Safra. Os demais registros são exemplos de carteira para demonstrar os cadastros e o filtro de temperatura.

## O que funciona nesta versão

- Navegação entre as dez páginas.
- Menu lateral e menu móvel, sem JavaScript.
- Filtro de temperatura sobre as três reuniões demonstrativas, feito com radio e CSS.
- Abertura/fechamento dos formulários e confirmações com :target.
- Validação HTML nativa de campos obrigatórios, números mínimos/máximos, limites de texto e casas decimais.
- Abertura da transcrição e orientações com details/summary.
- Download do JSON de exemplo incluído no projeto.
- Links diretos para exportar o JSON real ou consultar clientes na API local, quando o backend estiver disponível.

As confirmações não simulam sucesso no banco: mostram uma mensagem explicando que o fluxo ainda está na etapa visual. O envio demonstrativo de formulários usa uma navegação GET local; os campos podem aparecer na URL, mas não são persistidos. As janelas CSS não implementam recursos de JavaScript como fechamento por Escape, foco automático ou bloqueio de foco dentro do diálogo.

## Integração posterior com o backend

O contrato está documentado em **docs/INTEGRACAO.md**, com os 21 endpoints atuais, campos e códigos de resposta. Os formulários possuem atributos data-api e data-method apenas como referência declarativa; eles não executam chamadas HTTP para a API.

O frontend não recebe usuário/senha Oracle ou chave OpenAI. A conexão do banco continua na **ConexaoFactory** do projeto Java, seguindo o professor; a chave de IA continua configurada no backend. As tabelas Oracle são criadas com os scripts do repositório Java.

O backend atual devolve as três análises em texto no campo resultado. Percentuais de sentimento, séries de gráficos, frequência de temas, contagens de feedback e produtos em cartões ainda não existem como campos estruturados da API. Nesta entrega esses elementos são exemplos visuais, identificados nas telas. A integração deverá primeiro exibir o texto real; gráficos só devem usar métricas efetivamente fornecidas, sem inventar percentuais.

## Arquivos e identidade visual

~~~text
assets/
  styles.css          estilos, cores e responsividade
  logo.svg            marca vetorial para a interface
  icons.svg           ícones vetoriais
  fonts/              Manrope local e licença OFL
  exemplos/           arquivo JSON demonstrativo
docs/
  INTEGRACAO.md       relação entre telas e API
  VALIDACAO.md        verificações da entrega
~~~

A fonte **Manrope** está incluída localmente, com licença SIL Open Font License 1.1 em assets/fonts/OFL.txt. A interface não depende de CDNs para carregar fonte, ícones ou estilos. Fontes oficiais: [Google Fonts / Manrope](https://github.com/google/fonts/tree/main/ofl/manrope).

O projeto usa HTML semântico, labels, foco visível, link para pular navegação, SVGs decorativos identificados, texto alternativo nos gráficos e layouts responsivos. As tabelas usam rolagem horizontal em telas pequenas; os gráficos e cards reorganizam o conteúdo conforme a largura disponível.
