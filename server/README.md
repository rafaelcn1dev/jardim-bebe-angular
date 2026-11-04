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
3. O Render detecta o commit e **redeploya o frontend** automaticamente, agora
   com o som novo embutido nos assets.
4. Enquanto o redeploy não termina, o próprio backend serve o som por
   `GET /sounds/<arquivo>` (proxy do GitHub raw), então o preview já toca.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `GITHUB_TOKEN` | sim | Personal Access Token (fine-grained) com escrita em **Contents** do repositório. |
| `GITHUB_REPO` | sim | `usuario/repositorio`, ex.: `rafaelcn1dev/jardim-bebe-angular`. |
| `GITHUB_BRANCH` | não | Branch de destino. Padrão: `main`. |
| `ALLOWED_ORIGIN` | recomendada | Origem do frontend para CORS, ex.: `https://jardim-bebe-angular.onrender.com`. Padrão: `*`. |
| `PORT` | não | O Render injeta automaticamente. |

## Rodar localmente (opcional)

```bash
cd server
GITHUB_TOKEN=xxx GITHUB_REPO=usuario/repo node index.mjs
```

> Em desenvolvimento normal você não precisa deste backend: o `npm start` da
> raiz já sobe o `scripts/sound-server.mjs`, que grava direto no disco.
