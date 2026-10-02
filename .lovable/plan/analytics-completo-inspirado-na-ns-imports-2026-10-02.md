# Analytics completo inspirado na NS Imports

## Objetivo
Ampliar a aba Analytics da Mega Cell com o mesmo conjunto de informações exibido no projeto NS Imports, preservando o visual e a identidade da Mega Cell.

## O que será adicionado
- Indicadores de visitantes, visualizações, sessões, taxa de rejeição e duração média.
- Comparação percentual com o período anterior e pequenos gráficos de tendência.
- Filtros: hoje, 24 horas, 7, 30 e 90 dias, além de intervalo personalizado.
- Gráfico por hora ou por dia, alternando entre visitantes e visualizações.
- Listas de páginas mais acessadas, origens de tráfego, países, dispositivos, navegadores, sistemas operacionais e campanhas UTM.
- Contador de pessoas online e atualização manual/automática.
- Estados claros para carregamento, ausência de dados e erro.

## Rastreamento
- Evoluir o registro atual para identificar visitantes e sessões sem armazenar dados pessoais.
- Registrar páginas vistas, origem, campanha, tipo de aparelho, navegador, sistema e país.
- Usar atualizações periódicas enquanto a página estiver visível para medir tempo de sessão e presença online.
- Continuar ignorando o painel administrativo e acessos de administradores.

## Dados e segurança
- Criar as estruturas e o relatório agregado necessários no Lovable Cloud.
- Manter os dados brutos inacessíveis ao público; apenas administradores autenticados poderão consultar os relatórios.
- Filtrar robôs conhecidos no recebimento dos eventos.

## Validação
- Confirmar que visitas públicas aparecem no painel.
- Conferir os filtros, gráfico, listas e atualização online em computador e celular.
- Verificar que o painel administrativo não gera visitas e que não há erros visuais ou de execução.
