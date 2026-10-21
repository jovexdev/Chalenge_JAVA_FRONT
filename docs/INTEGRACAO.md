# Integração prevista — DealVision e AdvisorMind

## Estado atual

O frontend desta entrega é HTML/CSS. Não há scripts ou requisições fetch. Dados exibidos são exemplos e os formulários não gravam no Oracle. A integração dinâmica depende de uma próxima etapa com JavaScript.

Backend: repositório **jovexdev/Sprint4_Java**, executado no IntelliJ, base **http://localhost:8080/api**. Frontend: este repositório, aberto no VS Code, preferencialmente pelo Live Server na porta 5500.

A API é a única responsável por acessar o Oracle e chamar a OpenAI. Nenhum segredo ou configuração de banco deve fazer parte do front. Os atributos data-api/data-method nos formulários indicam a intenção futura, sem efetuar essas operações nesta versão.

## Endpoints existentes — 21 operações

| Tela / recurso | Operação | Método e caminho |
| --- | --- | --- |
| Clientes | Listar | GET /clientes |
| Clientes | Buscar por ID | GET /clientes/{id} |
| Clientes | Criar | POST /clientes |
| Clientes | Alterar | PUT /clientes/{id} |
| Clientes | Excluir | DELETE /clientes/{id} |
| Vendedores | Listar | GET /vendedores |
| Vendedores | Buscar por ID | GET /vendedores/{id} |
| Vendedores | Criar | POST /vendedores |
| Vendedores | Alterar | PUT /vendedores/{id} |
| Vendedores | Excluir | DELETE /vendedores/{id} |
| Reuniões | Listar / filtrar | GET /reunioes?clienteId=1&vendedorId=1 |
| Reuniões | Buscar por ID | GET /reunioes/{id} |
| Reuniões | Criar | POST /reunioes |
| Reuniões | Alterar | PUT /reunioes/{id} |
| Reuniões | Excluir | DELETE /reunioes/{id} |
| Dashboard | Estatísticas | GET /relatorios/estatisticas |
| SmartBriefing | Gerar análise | POST /reunioes/{id}/analises/smart-briefing |
| Analytics | Gerar análise | POST /reunioes/{id}/analises/conversational-analytics |
| VoC Tracker | Gerar análise | POST /reunioes/{id}/analises/voc-tracker |
| Dados e arquivos | Importar reuniões | POST /reunioes/importar |
| Dados e arquivos | Exportar reuniões | GET /reunioes/exportar |

O filtro visual por temperatura existente na página HTML funciona apenas com os três exemplos. A API atual filtra reuniões por clienteId e vendedorId; não possui parâmetro de temperatura. Na integração, essa filtragem pode ser aplicada na lista recebida, usando o campo calculado temperaturaComercial.

## Campos de entrada

**Cliente:** id, nome (até 100), empresa (até 150).

~~~json
{"id":4,"nome":"Nome do contato","empresa":"Empresa S/A"}
~~~

**Vendedor:** id, nome (até 100), cargo e setor (até 50), totalReunioes (inteiro não negativo), ticketMedioNegociado (não negativo, até duas casas decimais).

~~~json
{"id":4,"nome":"Nome do vendedor","cargo":"Consultor","setor":"ERP","totalReunioes":0,"ticketMedioNegociado":0}
~~~

**Reunião:** id, clienteId obrigatório e existente, vendedorId opcional e existente quando informado, transcricao obrigatória (até 100.000 caracteres).

~~~json
{"id":4,"clienteId":1,"vendedorId":1,"transcricao":"Transcrição integral da conversa."}
~~~

ID é informado manualmente, positivo e único. PUT exige os campos editáveis completos; id no corpo pode ser omitido ou precisa coincidir com a URL. Em reuniões, transformar a opção vazia de vendedor em null ou omitir vendedorId; não enviar string vazia como número.

As respostas de reunião incluem cliente e vendedor completos. Para atualizar, extrair seus IDs e enviar o formato de entrada acima. Não reenviar os objetos completos ou campos calculados como se fossem entradas.

## Campos calculados e estatísticas

Cliente: perfilComercial. Vendedor: nivelSenioridade e comissaoEstimada. Reunião: temperaturaComercial e duracaoEstimadaMinutos. Esses campos são de leitura e seguem as regras do Java.

Estatísticas: totalReunioes, empresasAtendidas, reuniaoMaisExtensaId, clienteReuniaoMaisExtensa, reunioesQuentes, reunioesMornas, reunioesFrias e duracaoTotalEstimadaMinutos. As quantidades de clientes e vendedores podem ser obtidas nas listas correspondentes.

A API não possui data, título livre, gravação de chamada, autenticação de usuário ou status de processamento da reunião. Esses campos não foram acrescentados aos formulários de entrada. totalReunioes de vendedor é um histórico informado; não é atualizado automaticamente quando uma reunião é cadastrada.

## Resultados de IA

As três rotas retornam:

~~~json
{"reuniaoId":1,"tipo":"SMART_BRIEFING","resultado":"Texto retornado pela IA..."}
~~~

Os prompts do backend usam seções em texto. A interface deverá renderizar resultado como texto seguro, preservando quebras de linha e evitando tratar a resposta como HTML. As análises não são persistidas e cada solicitação real pode consumir créditos da conta configurada no backend.

Os cartões organizados, indicadores de sentimento, Talk-to-Listen Ratio, séries de gráfico, frequência de termos e contadores de VoC nas telas atuais são ilustrativos. O contrato não oferece esses dados como JSON estruturado. Uma integração fiel deve mostrar o texto real e só habilitar indicadores adicionais quando houver dados apropriados; nunca converter ausência de métrica em percentual inventado.

## Importação e exportação

A importação recebe o conteúdo do arquivo como uma lista JSON, e não multipart/form-data. Na etapa com JavaScript será necessário ler o arquivo e enviar o texto com Content-Type: application/json. O lote máximo é de 500 reuniões. O formato legado sem cliente.id é suportado. O backend reverte o lote inteiro em caso de erro, sem sobrescrever IDs existentes.

A exportação já funciona por link GET, pois o backend retorna Content-Disposition: attachment. Ela inclui reuniões e vínculos, mas não é backup completo de cadastros independentes.

## HTTP e estados de interface a conectar

| HTTP | Comportamento futuro |
| --- | --- |
| 200 | Renderizar consulta, alteração, importação ou resultado de IA |
| 201 | Confirmar cadastro e recarregar a lista |
| 204 | Confirmar exclusão e remover/recarregar o registro |
| 400 | Mostrar mensagem de validação, mantendo o preenchimento |
| 404 | Informar que registro ou vínculo não foi encontrado |
| 409 | Explicar ID duplicado ou vínculo que impede exclusão |
| 502 | Mostrar falha da integração de IA |
| 503 | Informar indisponibilidade ou configuração pendente do backend |

Erros retornam timestamp, status, mensagem e caminho. A próxima etapa também precisará de estados de carregamento, listas vazias e prevenção de submissões duplicadas. Nesta etapa, a prévia não simula sucesso dessas operações.

CORS do Java permite localhost:5500 e 127.0.0.1:5500, além de localhost:5173 e localhost:3000. Outra porta deve ser autorizada no backend pela configuração FRONTEND_ORIGINS.
