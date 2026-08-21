# Mega Cell Lajeado

Quero criar um site de e-commerce/catálogo para venda de produtos seminovos da linha Apple (iPhones, MacBooks, iPads, Apple Watches). Use Supabase como backend.

ESTRUTURA GERAL (landing page pública em "/"):

1. HEADER
- Logo/nome da loja à esquerda (texto ou ícone + nome)
- Indicador de status "● Atualizado agora" (mostra a hora da última atualização do estoque)
- Link para Instagram da loja (ícone + @usuario), abre em nova aba
- Badge "Estoque ao vivo"

2. HERO
- Título grande: nome da loja + subtítulo em itálico com o que vende (ex: "Apple seminovos")
- Parágrafo curto explicando a proposta (produtos selecionados, revisados, em tempo real)
- Contador dinâmico: "X — produtos disponíveis" (busca o total do banco de dados)
- Localização da loja (ícone de pin + cidade/estado)
- Badge de credibilidade (ex: "✅ Produtos selecionados e revisados")

3. FILTROS E BUSCA
- Campo de busca por texto (filtra por nome/modelo do produto)
- Dropdown de ordenação: "Maior preço", "Menor preço", "Ordem por categoria"
- Filtro por categoria em abas/botões: "Todos", "iPhones", "MacBooks", "iPads", "Apple Watches"
- Estado de "Carregando..." enquanto busca os dados

4. GRID DE PRODUTOS
- Grid responsivo de cards de produto
- Cada card exibe: foto do produto, nome/modelo, especificações principais (armazenamento, cor, estado de conservação), preço, e categoria
- A FOTO do produto é clicável e redireciona para a URL personalizada cadastrada naquele produto (abre em nova aba)
- Cada card tem um BOTÃO de CTA (ex: "Falar no WhatsApp" ou texto customizável) que também redireciona para a URL personalizada do produto
- Clique no restante do card (fora da foto/botão) abre modal com mais fotos e descrição completa, e dentro do modal também existe o mesmo botão de CTA
- Produtos vêm de uma tabela no Supabase (não hardcoded), para que o admin possa editar e o site atualize automaticamente

5. FOOTER
- Copyright com ano dinâmico + nome da empresa (razão social)
- Endereço completo da loja
- Link do Instagram novamente

DESIGN
- Tema escuro, moderno, minimalista, estética premium (inspirado em Apple Store)
- Tipografia limpa, bastante espaço em branco, cantos arredondados nos cards
- Cores neutras (preto/cinza escuro) com um ou dois acentos de cor para preço/CTA
- Totalmente responsivo (mobile-first)

BANCO DE DADOS (Supabase)
Crie uma tabela "products" com colunas:
- id (uuid, primary key)
- name (texto)
- category (texto: iphone, macbook, ipad, watch)
- price (numeric)
- description (texto)
- specs (texto ou jsonb, ex: armazenamento, cor, condição)
- images (array de urls ou texto)
- is_available (boolean)
- cta_url (texto) — URL personalizável para onde o clique no produto/botão deve redirecionar (ex: link de WhatsApp com mensagem pronta, tipo "https://wa.me/55XXXXXXXXXXX?text=mensagem")
- cta_label (texto) — texto exibido no botão, editável (ex: "Falar no WhatsApp", "Comprar agora"), com valor padrão sugerido
- created_at / updated_at (timestamp)

IMPORTANTE sobre o campo cta_url: cada produto tem sua própria URL totalmente independente, configurada manualmente pelo admin produto a produto (não gerar automaticamente). O admin é quem escreve a URL completa já com o número de WhatsApp e a mensagem personalizada que quiser (ex: usando o formato https://wa.me/NUMERO?text=MENSAGEM, mas o campo deve aceitar qualquer URL, não só WhatsApp).

Crie também uma tabela "store_settings" com colunas para nome da loja, link do Instagram, endereço, cidade/estado, e timestamp da última atualização — tudo isso deve poder ser editado pelo admin e refletir automaticamente na landing page.

ÁREA ADMINISTRATIVA (rota "/admin")
- Crie uma rota separada em "/admin" que NÃO tem nenhum link ou botão visível na landing page pública — só é acessível digitando a URL diretamente
- A rota "/admin" deve exigir login (autenticação por e-mail/senha via Supabase Auth) antes de mostrar qualquer conteúdo
- Após o login, mostrar um painel administrativo com:
  - Lista de todos os produtos cadastrados (com busca e filtro)
  - Botão para adicionar novo produto, com formulário contendo TODOS os campos da tabela "products", incluindo:
    - Upload de imagens (múltiplas fotos por produto)
    - Campo de texto para "URL do botão/CTA" (cta_url) com helper text explicando que pode ser um link de WhatsApp, Instagram, ou qualquer site
    - Campo de texto para "Texto do botão" (cta_label)
    - Preview ao vivo de como o card vai aparecer na landing page, igual ao preview do Elementor
  - Botão para editar produto existente (reabre o mesmo formulário com os dados preenchidos, incluindo cta_url e cta_label)
  - Botão para excluir produto
  - Toggle para marcar produto como disponível/indisponível
  - Seção para editar as configurações gerais da loja (nome, Instagram, endereço, cidade) que aparecem na landing page
- Apenas usuários autenticados (cadastrados manualmente por mim no Supabase) podem acessar esse painel; bloquear acesso de qualquer usuário não autenticado com redirecionamento para uma tela de login simples
- Toda alteração feita no admin deve refletir automaticamente na landing page pública (sem precisar de novo deploy), já que os dados vêm do Supabase em tempo real

REQUISITOS TÉCNICOS
- Usar React + Tailwind CSS
- Integrar Supabase para banco de dados e autenticação
- Buscar produtos com React Query ou similar, com loading state
- Estrutura de rotas: "/" (pública) e "/admin" (protegida por login)
- Validar que o campo cta_url seja uma URL válida antes de salvar
- Otimizar para SEO básico na página pública (title, meta description)

Comece criando a landing page pública com os dados mockados primeiro (incluindo o comportamento de clique na foto e no botão indo para uma URL de exemplo), depois conecte ao Supabase, e por último implemente a área "/admin" com autenticação e o formulário completo de edição de produtos com o campo de URL personalizável.

TESTES E VERIFICAÇÃO DE FALHAS
Antes de considerar o projeto pronto, realize uma verificação completa e corrija qualquer falha encontrada nos seguintes pontos:
- Teste o carregamento da landing page com a tabela "products" vazia, com poucos itens e com muitos itens (garantir que não quebra em nenhum cenário)
- Teste todos os filtros de categoria e confirme que o contador de produtos disponíveis atualiza corretamente
- Teste a busca por texto com termos existentes, inexistentes, e campo vazio
- Teste as três opções de ordenação (maior preço, menor preço, categoria) e confirme que a lista reordena corretamente
- Teste o clique na foto do produto e no botão de CTA, confirmando que ambos abrem a cta_url correta em nova aba, inclusive quando a URL está vazia ou mal formatada (não deve travar a página, deve ter um fallback ou aviso)
- Teste a abertura e fechamento do modal de detalhes do produto, incluindo navegação entre múltiplas imagens
- Teste o acesso à rota "/admin" sem estar logado (deve redirecionar para login e nunca expor dados)
- Teste login com credenciais corretas e incorretas no admin
- Teste criação, edição e exclusão de produtos no admin, confirmando que a landing page pública reflete a mudança sem precisar recarregar manualmente
- Teste o upload de imagens no admin, incluindo arquivos grandes, formatos inválidos, e upload de múltiplas imagens ao mesmo tempo
- Teste a validação do campo cta_url no admin (URL inválida deve mostrar erro antes de salvar)
- Teste o toggle de disponibilidade do produto e confirme que produtos marcados como indisponíveis não aparecem (ou aparecem corretamente sinalizados, conforme definido) na landing page
- Teste responsividade em mobile, tablet e desktop em todas as telas (landing page e admin)
- Teste comportamento em conexão lenta (loading states devem aparecer e não travar a interface)
- Revise console do navegador e logs do Supabase em busca de erros ou warnings, e corrija todos antes de finalizar
- Garanta que não há flickering, travamentos, ou delays perceptíveis nas transições entre estados (loading → carregado, filtro aplicado, modal abrindo/fechando)

Ao final, me informe quais testes foram realizados e se algum problema foi encontrado e corrigido.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://megacell-lajeado.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bb2ac0de-7cf7-43a5-aca9-1d92f7d074cc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
