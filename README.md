# neto.bio

Site pessoal e agregador de links estático, com um painel de gerenciamento que roda somente no computador do autor.

O projeto mantém as duas ideias separadas:

- `content/site.json` é a fonte do conteúdo;
- `admin/` é o painel local;
- `src/` contém o gerador e o estilo do site;
- `public/` é a versão estática pronta para hospedagem.

Não existe painel, banco de dados ou código de servidor em produção. O visitante do `neto.bio` continua recebendo apenas HTML, CSS e imagens.

O CSS publicado recebe um nome versionado pelo conteúdo. Isso impede que o navegador combine HTML novo com uma folha de estilos antiga mantida em cache.

## Requisitos

- Node.js 18 ou mais recente;
- Git configurado, caso queira publicar pelo painel.

Não há dependências para instalar.

## Usar o painel

No diretório do projeto, execute:

```powershell
npm run admin
```

O navegador abre em `http://127.0.0.1:4173`. O painel permite:

- editar perfil, redes sociais, cores e rodapé;
- organizar as seções e links da home;
- criar e editar páginas internas;
- criar atalhos como `neto.bio/whatsapp`;
- gerar e visualizar a versão estática;
- criar um commit e publicar a versão no GitHub.

Use **Salvar** para manter um rascunho em `content/site.json`. Use **Gerar agora** para atualizar `public/`. Use **Publicar no GitHub** somente depois de conferir a prévia.

## Gerar sem abrir o painel

```powershell
npm run build
```

## Verificar o projeto

```powershell
npm run check
```

## Como a publicação funciona

Ao publicar, o painel:

1. valida e salva o conteúdo;
2. gera a pasta `public/`;
3. adiciona ao Git somente `content/site.json` e `public/`;
4. cria um commit com a mensagem informada;
5. envia a branch atual para `origin`.

Outras alterações existentes no repositório não são incluídas nesse commit.

## URLs existentes

As rotas antigas foram preservadas. O gerenciador também inclui o atalho `/whatsapp/`. Atalhos geram uma página HTML pequena com redirecionamento imediato e um link de segurança para navegadores sem JavaScript.
