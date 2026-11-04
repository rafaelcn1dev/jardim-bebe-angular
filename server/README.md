# Backend de sons (produção) — jardim-bebe

Este é o servidor que faz a página **/baixar** funcionar no site publicado
(onrender.com). Diferente do servidor local (`scripts/sound-server.mjs`), que
grava no disco da sua máquina, este backend **persiste os arquivos fazendo
commit no repositório do GitHub** — assim nada se perde entre deploys e tudo é
de graça.

## Como funciona

1. A página `/baixar` (frontend) envia o som/animal para este backend.
2. O backend grava o arquivo em `src/assets/sounds/` e/ou atualiza
   `src/assets/animals.json` **via API do GitHub** (um commit no repo).
3. O backend chama o **Deploy Hook** do frontend, forçando um novo deploy com o
   conteúdo recém-commitado.
4. Enquanto o redeploy não termina, o próprio backend serve o som por
   `GET /sounds/<arquivo>` (proxy do GitHub raw), então o preview já toca.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GITHUB_TOKEN` | sim | Personal Access Token (fine-grained) com escrita em **Contents** do repositório. |
| `GITHUB_REPO` | sim | `usuario/repositorio`, ex.: `rafaelcn1dev/jardim-bebe-angular`. |
| `GITHUB_BRANCH` | não | Branch de destino. Padrão: `main`. |
| `ALLOWED_ORIGIN` | recomendada | Origem do frontend para CORS, ex.: `https://jardim-bebe-angular.onrender.com`. **Se não definida, o CORS fica restrito** (nenhuma origem externa de navegador é liberada) — nunca cai para `*`. |
| `WRITE_SECRET` | opcional | Se definida, as rotas de escrita exigem o header `x-write-secret` com esse valor. Camada extra para impedir que terceiros gravem no seu repositório. Quando ausente, as rotas ficam abertas (compatível com o comportamento anterior). |
| `FRONTEND_DEPLOY_HOOK` | recomendada | Deploy Hook do site estático (frontend) no Render. Quando definido, o backend força o redeploy do frontend após cada mudança, garantindo a sincronização mesmo que o webhook automático do GitHub não dispare. |
| `PORT` | não | O Render injeta automaticamente. |

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Status do serviço. |
| GET | `/api/sounds` | Lista os sons existentes no repositório. |
| GET | `/sounds/<arquivo>` | Serve um som (proxy do GitHub raw). Usado para preview e fallback. |
| POST | `/api/download` | Baixa um áudio por URL direta e commita. Body: `{ url, nome }`. |
| POST | `/api/upload?nome=&arquivo=` | Envia bytes de um arquivo (corpo binário). |
| POST | `/api/copy` | Reaproveita um som existente. Body: `{ origem, nome }`. |
| POST | `/api/animal` | Cria/atualiza um animal em `animals.json`. Body: `{ animal }`. |

As quatro rotas POST são de **escrita** (geram commit) e respeitam o
`WRITE_SECRET`.

## Segurança

Este backend grava no seu repositório usando um token com permissão de escrita,
então ele tem algumas proteções embutidas:

- **Anti-SSRF** no `/api/download`: resolve o host e **recusa endereços
  internos** (loopback, redes privadas `10/8`, `172.16/12`, `192.168/16`,
  link-local `169.254`, incluindo o IP de metadados da nuvem). A validação é
  refeita a cada redirecionamento.
- **Anti-travessia de diretório**: nomes de arquivo com `..`, `/` ou `\` são
  rejeitados; a origem de uma cópia precisa existir de verdade na pasta de sons.
- **CORS restrito**: sem `ALLOWED_ORIGIN`, nenhuma origem externa é liberada.
- **Segredo de escrita opcional** (`WRITE_SECRET`), comparado em tempo constante.
- **Limites de tamanho**: 15 MB para áudio, 1 MB para JSON.
- **Gravação concorrente** em `animals.json` com retry automático em conflito
  (HTTP 409 da API do GitHub).

## Testes

```bash
cd server
npm test        # node --test (sem dependências)
```

Cobrem as funções de maior risco: sanitização de nomes, rejeição de travessia
de diretório e detecção de IP interno (anti-SSRF).

## Rodar localmente (opcional)

```bash
cd server
GITHUB_TOKEN=xxx GITHUB_REPO=usuario/repo node index.mjs
```

> Em desenvolvimento normal você não precisa deste backend: o `npm start` da
> raiz já sobe o `scripts/sound-server.mjs`, que grava direto no disco.
