# Catálogo de Personagens

Aplicação web para pesquisar e explorar personagens da série **Rick and Morty**, desenvolvida como 1ª Avaliação da disciplina de Programação Web (UESPI, Tecnologia em Sistemas de Computação, Prof. Eyder Rios). Problema 13.

## Integrantes

- Vitor Correia
- Matheus Silva

## Descrição

O usuário pesquisa personagens pelo nome, filtra por status ou gênero, navega pelas páginas de resultados e abre uma janela com as informações detalhadas de cada personagem. Todos os dados vêm da API em tempo de execução.

## Principais funcionalidades

- **Pesquisa por nome** com correspondência parcial (digitar "rick" encontra todos os personagens com esse trecho no nome) e possibilidade de fazer novas pesquisas a qualquer momento.
- **Listagem** em cartões com nome, imagem, espécie e status.
- **Detalhamento** em janela modal: nome, imagem, espécie, status, gênero, origem, localização atual e quantidade de episódios.
- **Filtros** por status e por gênero, combináveis com a pesquisa por nome.
- **Paginação** dos resultados (a API entrega 20 personagens por página).
- **Estados da interface:** carregando, sucesso, nenhum resultado, nome inválido e erros de comunicação (sem conexão, tempo esgotado, limite de requisições, resposta inesperada), com botão para tentar novamente.
- **Dados ausentes ou desconhecidos** aparecem como "Desconhecido/Desconhecida"; imagem ausente ou que falha ao carregar é substituída por um espaço reservado com o texto "Sem imagem".

## API utilizada

[Rick and Morty API](https://rickandmortyapi.com/), endpoint `/character`.
Documentação: https://rickandmortyapi.com/documentation

Parâmetros usados: `name`, `status`, `gender` e `page`. Quando a busca não encontra ninguém, a API responde `404`, e a aplicação trata esse caso como "nenhum resultado".

## Tecnologias

- HTML5 semântico
- CSS puro (variáveis CSS, grid, flexbox)
- JavaScript puro no navegador, com `fetch`, `async/await`, `AbortController` e o elemento `<dialog>`
- Sem frameworks, sem backend, sem banco de dados

## Como executar

Não há instalação nem build.

1. Clone o repositório:
   ```bash
   git clone <URL-DO-REPOSITORIO>
   cd <PASTA-DO-REPOSITORIO>
   ```
2. Abra o arquivo `index.html` no navegador (duplo clique), **ou** sirva a pasta com um servidor local, por exemplo:
   ```bash
   python3 -m http.server 8000
   ```
   e acesse http://localhost:8000.

É necessária conexão com a internet (API e fontes do Google Fonts). Navegadores atuais (Chrome, Edge, Firefox, Safari) são suportados.

## Estrutura

```
index.html   estrutura da página e formulário
styles.css   estilos e responsividade
script.js    consumo da API, estado e renderização
```

## Acessibilidade

- Campos com `label` visível, mensagens de erro ligadas ao campo (`aria-describedby`, `aria-invalid`).
- Áreas de feedback com `role="status"` para leitores de tela.
- Cartões são botões reais, navegáveis por teclado; o foco é sempre visível.
- A janela de detalhes usa `<dialog>`, que prende o foco, fecha com `Esc` e devolve o foco ao cartão.
- Status indicado por texto e forma, não apenas por cor.
- Animações respeitam `prefers-reduced-motion`.
