# DealVision — Frontend integrado da Sprint 4

Interface do AdvisorMind em **HTML, CSS e JavaScript puro**, conectada à [API Java](https://github.com/jovexdev/Sprint4_Java). Mantém a identidade DealVision com tema escuro, azul elétrico e módulos de inteligência comercial.

## Executar no VS Code

1. Clone este repositório ou execute **git pull** na cópia já aberta no VS Code:

~~~powershell
git clone https://github.com/jovexdev/Chalenge_JAVA_FRONT.git
~~~

2. No IntelliJ, execute **AdvisorMindApplication** do backend com **Java 21**. A API deve responder em **http://localhost:8080/api/clientes**.
3. Abra a pasta do frontend no VS Code. Instale a extensão **Live Server**, de Ritwick Dey, recomendada pelo projeto.
4. Clique com o botão direito em **index.html → Open with Live Server**.
5. Use **http://127.0.0.1:5500** ou **http://localhost:5500**. A porta 5500 está configurada no projeto.

Não é necessário instalar dependências ou compilar o frontend. Abra pelo servidor HTTP; clicar duas vezes no HTML e usar file:// não atende aos módulos JavaScript e ao CORS.

## Preparar o backend

- A conexão Oracle continua em **ConexaoFactory**, conforme o exemplo do professor, com Class.forName e DriverManager.getConnection. O frontend usa a API.
- As tabelas **T_TOTVS_CLIENTE**, **T_TOTVS_VENDEDOR** e **T_TOTVS_REUNIAO** precisam existir no mesmo usuário Oracle. No repositório Java, use o script de criação para uma base nova ou **database/02-migracao-sprint3-oracle.sql** para a Sprint 3. Leia o script antes de executar e preserve os dados existentes.
- Para as análises, configure **OPENAI_API_KEY** nas variáveis de ambiente da execução Java do IntelliJ e reinicie o backend. O modelo continua configurado no Java por OPENAI_MODEL, com padrão gpt-4o-mini.
- As origens **http://localhost:5500** e **http://127.0.0.1:5500** já são permitidas pelo CORS padrão do Java. Se mudar a porta, ajuste FRONTEND_ORIGINS na execução Java e reinicie a API.

Não coloque usuário/senha Oracle ou chave de IA no frontend. O endereço da API pode ser ajustado em **Dados e conexão**; o padrão é **http://localhost:8080/api**.

## Funcionalidades

| Tela | Integração |
| --- | --- |
| Dashboard | Estatísticas do Java, totais reais e pipeline por temperatura |
| Clientes | Listar, buscar, detalhar, cadastrar, editar e excluir no banco |
| Vendedores | CRUD completo, histórico, ticket, senioridade e comissão calculados pelo Java |
| Reuniões | Lista, busca, filtros por cliente/vendedor/temperatura, edição, exclusão e exportação |
| Nova reunião | Cliente obrigatório, vendedor opcional e transcrição até 100.000 caracteres |
| Detalhes | Participantes, transcrição, duração estimada, temperatura e módulos |
| SmartBriefing AI | Resumo executivo, temas, decisões, próximos passos e engajamento |
| Conversational Analytics | Sentimento, participação, temas e momento crítico |
| VoC Tracker | Reclamações, sugestões, elogios, oportunidades e recomendações |
| Dados e conexão | Configurar/testar API, importar reuniões e exportar JSON |

IDs são inteiros positivos informados manualmente, como exige a API. IDs existentes geram conflito. Clientes e vendedores com reuniões vinculadas não podem ser excluídos; a mensagem do Java aparece na janela.

O histórico de reuniões do vendedor é um campo do cadastro usado pelas regras originais. Não é incrementado automaticamente ao cadastrar uma transcrição. A duração é uma estimativa do backend, e a temperatura segue suas regras de palavras-chave.

## Utilizar as IAs

1. Cadastre um cliente, opcionalmente um vendedor e uma reunião com a transcrição.
2. Abra a reunião e escolha um dos módulos.
3. Confira a reunião no seletor e clique em **Gerar análise**.
4. Consulte os cartões ou **Resultado completo da IA**. Use **Baixar análise** para salvar o texto.

Chamadas ocorrem somente ao clicar em Gerar análise/Gerar novamente e usam a conta configurada no Java. Reabrir uma tela não dispara análise. O resultado fica no sessionStorage, separado por API, reunião, módulo e transcrição. Editar a reunião invalida o resultado anterior. O backend atual não persiste análises no Oracle; fechar a sessão do navegador encerra esse cache.

A API retorna texto. O frontend organiza os títulos dos prompts do Java e conserva a resposta completa quando o formato varia. O gráfico de participação só aparece se a IA informar percentuais válidos de vendedor/cliente que somem 100%. São estimativas baseadas na transcrição. Não são inventadas séries de sentimento, contagens, datas ou métricas ausentes da API.

## Importar e exportar

A exportação baixa o JSON real do banco. Importe até 500 reuniões no formato legado do Java:

~~~json
[
  {
    "id": 10,
    "cliente": {"nome": "Contato de exemplo", "empresa": "Empresa de exemplo"},
    "transcricao": "Vendedor: Qual a necessidade?\nCliente: Precisamos integrar os processos."
  }
]
~~~

Altere o ID do exemplo se ele já existir. O cliente pode ser localizado por nome/empresa ou criado na importação. Se informar ID de cliente existente, nome e empresa precisam corresponder. Para vincular um vendedor cadastrado, inclua **"vendedor": {"id": 1}**. A importação usa objetos aninhados, não clienteId/vendedorId do formulário. Uma falha desfaz todo o lote. Não há sobrescrita automática.

## Organização e testes

~~~text
assets/js/api.js       transporte HTTP, configuração e erros
assets/js/analysis.js  interpretação dos resultados e cache
assets/js/app.js       páginas, formulários, filtros e operações
assets/styles.css     identidade visual e responsividade
assets/fonts/         Manrope local e licença OFL
assets/exemplos/       JSON de exemplo
docs/INTEGRACAO.md     contrato e decisões da interface
docs/VALIDACAO.md      verificações executadas
tests/                testes do contrato do frontend
~~~

Testes de desenvolvimento usam Node.js 20 ou superior, sem bibliotecas adicionais:

~~~powershell
npm test
~~~

Node não é necessário para usar o frontend pelo Live Server. A fonte Manrope inclui licença SIL OFL. Fonte, ícones e estilos são locais. A interface inclui navegação por teclado, diálogos nativos com Escape, mensagens de erro, estados vazios e carregamento.
