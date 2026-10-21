# Validação da integração — 21/10/2026

## Testes automatizados

13 testes do frontend aprovados com Node.js:
- Configuração da URL, protocolos e rejeição de credenciais embutidas.
- JSON UTF-8, métodos de gravação e resposta DELETE 204.
- Erros do Java, conflito 409, falha de rede e timeout.
- Exportação como blob e importação como lista JSON.
- Divisão de seções da IA e fallback para texto integral.
- Percentuais explícitos/coerentes para o gráfico de participação.
- Cache separado por API, reunião, módulo e transcrição; invalidação.

## Integração com o Oracle real

A API local em execução foi consultada com o cliente HTTP do próprio frontend. Registros temporários próprios validaram:
- Cadastro, leitura, atualização e exclusão de cliente, vendedor e reunião.
- Vínculos entre entidades, transcrição com acentos/quebras de linha e vendedor opcional.
- Senioridade, temperatura, filtro por cliente e estatísticas do Java.
- Bloqueio 409 ao tentar excluir cliente vinculado.
- Exportação, reimportação com novo ID e rejeição de importação duplicada.

Somente os registros temporários do teste foram removidos; os cadastros anteriores foram preservados. O dashboard no navegador exibiu os dados existentes do Oracle.

## Navegador

- Cadastro/edição de cliente, conflito de ID sem sobrescrita e preservação dos valores do formulário.
- Cadastro de vendedor e exibição da senioridade/comissão calculadas pelo Java.
- Cadastro de reunião com cliente/vendedor, navegação ao detalhe e edição para remover vendedor/alterar transcrição.
- Três módulos executados do frontend até o Java e seu cliente HTTP de IA, em ambiente isolado com banco de testes e provedor simulado.
- Resultados renderizados nos cartões; Analytics usa percentuais retornados pelo provedor.
- Alterar transcrição invalida as análises da sessão.
- Filtro real de temperatura e estado vazio; navegação/menu em largura de 390 px.
- Mensagem de API desligada e recuperação pelo formulário Dados e conexão.
- Revisão visual do dashboard conectado ao Oracle.
- 300 referências locais dos HTML conferidas sem arquivos ausentes; ícones usados conferidos; sintaxe do JavaScript validada.

## Limites e ambiente

Nenhuma chamada paga à OpenAI foi feita nesta validação. A execução real das IAs exige chave válida, acesso ao modelo e crédito/limite disponível na conta configurada no Java. Os fluxos de resposta foram testados com provedor simulado.

O formulário de arquivo foi validado pelo contrato automatizado e pelo ciclo real de exportação/importação HTTP no Oracle; a seleção nativa de arquivo não foi automatizada pelo navegador.

O backend de produção, a ConexaoFactory e suas regras foram preservados. Banco de testes e provedor simulado foram usados somente na validação e não fazem parte do frontend publicado. Análises ficam na sessão do navegador, pois a API atual não oferece persistência desses resultados no Oracle.
