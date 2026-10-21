# Integração com o AdvisorMind Java

Base padrão: **http://localhost:8080/api**. Configuração por navegador em Dados e conexão. Erros contêm status, mensagem, caminho e timestamp. A interface apresenta a mensagem real da API; falhas não são substituídas por dados de exemplo.

## Endpoints consumidos

| Método | Caminho relativo a /api | Operação |
| --- | --- | --- |
| GET / POST | /clientes | Listar / cadastrar |
| GET / PUT / DELETE | /clientes/{id} | Consultar / atualizar / excluir |
| GET / POST | /vendedores | Listar / cadastrar |
| GET / PUT / DELETE | /vendedores/{id} | Consultar / atualizar / excluir |
| GET / POST | /reunioes | Listar / cadastrar |
| GET / PUT / DELETE | /reunioes/{id} | Consultar / atualizar / excluir |
| GET | /relatorios/estatisticas | Estatísticas do dashboard |
| POST | /reunioes/{id}/analises/smart-briefing | SmartBriefing |
| POST | /reunioes/{id}/analises/conversational-analytics | Analytics |
| POST | /reunioes/{id}/analises/voc-tracker | Voz do Cliente |
| GET | /reunioes/exportar | Baixar reuniões JSON |
| POST | /reunioes/importar | Importar lista JSON |

A listagem Java também aceita clienteId e vendedorId. A tela aplica busca e filtros sobre a lista recebida. Links vindos dos detalhes de cliente/vendedor preenchem os filtros pela URL.

## Corpos dos formulários

- Cliente: **{id, nome, empresa}**. Nome até 100 e empresa até 150 caracteres.
- Vendedor: **{id, nome, cargo, setor, totalReunioes, ticketMedioNegociado}**. Nome até 100, cargo/setor até 50; histórico inteiro não negativo; ticket não negativo, com até duas casas decimais.
- Reunião: **{id, clienteId, vendedorId, transcricao}**. Cliente existente obrigatório; vendedor existente ou null; transcrição não vazia até 100.000 caracteres.

IDs positivos até 2.147.483.647. Edição preserva o ID e envia o corpo completo sem propriedades calculadas. Cadastro retorna 201, atualização 200 e exclusão 204. Não há repetição automática de gravações após timeout.

Importação usa objetos cliente/vendedor aninhados, conforme o formato exportado pelo Java, e application/json, sem multipart. O navegador verifica lista de 1 a 500 itens e arquivo até 60 MB; o Java valida conteúdo e transação. O limite real do servidor também se aplica.

## Respostas e regras

- Reunião inclui cliente/vendedor, temperaturaComercial e duracaoEstimadaMinutos.
- Vendedor inclui nivelSenioridade e comissaoEstimada; cliente inclui perfilComercial.
- Estatísticas: totalReunioes, empresasAtendidas, reuniaoMaisExtensaId, clienteReuniaoMaisExtensa, reunioesQuentes, reunioesMornas, reunioesFrias e duracaoTotalEstimadaMinutos.
- IA: **{reuniaoId, tipo, resultado}**. O POST não exige corpo; o Java lê a transcrição pelo ID.

400: validação. 404: registro inexistente. 409: ID duplicado/vínculo que impede exclusão. 502: falha ou resposta inválida do provedor. 503: banco/IA indisponível ou chave ausente.

Classificações, comissões e durações vêm do Java. Não foram alteradas suas regras nem a ConexaoFactory. Resultados de IA são texto; títulos reconhecidos viram cartões e a resposta integral continua disponível. Percentuais só são representados quando explícitos e coerentes.

## Conexão, cache e acessibilidade

Endereço da API no localStorage; resultados de IA e última seleção no sessionStorage. Cache considera API, ID, módulo e transcrição exata. Não há cache de listas como substituto do Oracle. Falhas de armazenamento não impedem exibir a análise atual.

Formulários impedem duplo envio, preservam valores em erros e usam diálogo nativo com foco/Escape. Durante gravação o diálogo aguarda o término. Mensagens e carregamentos usam estados de acessibilidade.

Credenciais, chave, modelo, validações definitivas e tratamento de exceções permanecem no Java.
