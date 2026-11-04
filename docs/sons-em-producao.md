# Como os sons funcionam em produção — guia explicativo

Este documento explica, do começo ao fim, como a página **"Baixar"** (criar e
editar sons/animais) passou a funcionar no site publicado no Render, e como as
peças se conectam. É escrito para você entender o sistema sem precisar ler todo
o código.

---

## 1. O problema original

O jardim tem duas telas:

- **Jardim** (`/`): mostra os animais e toca os sons.
- **Baixar** (`/baixar`): cria um animal novo ou edita o som/fala de um existente.

A tela "Baixar" precisa **gravar arquivos** (os `.mp3`) e **atualizar uma lista**
(`animals.json`). No seu computador isso é fácil: um pequeno servidor local
(`scripts/sound-server.mjs`) grava direto no disco.

Mas o site publicado no Render é um **site estático**. Site estático não tem
"disco para escrever" nem um servidor rodando o tempo todo — ele só entrega
arquivos prontos. Por isso a tela publicada mostrava o aviso *"Criação/edição de
sons indisponível aqui"*. Não era um bug: era uma limitação real de site
estático.

---

## 2. A ideia da solução

Para gravar algo em produção, precisávamos de um **servidor de verdade** (um
"backend"). E, para o conteúdo **persistir** (não sumir a cada atualização do
site) sem pagar nada, usamos um truque:

> **O backend salva os arquivos fazendo um `commit` no seu próprio repositório
> do GitHub, via API.**

Pense no GitHub como o "banco de dados" dos sons. Quando você cria um som:

1. O backend recebe o arquivo.
2. O backend faz um commit no GitHub (como se você tivesse feito `git push`).
3. O Render vê o commit e **reconstrói o site** com o som novo embutido.

Isso é gratuito, durável (fica versionado no Git) e simples de entender.

---

## 3. As peças do sistema

Hoje existem **dois serviços** no Render, ambos ligados ao mesmo repositório:

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Frontend (site estático)│        │  Backend (Web Service Node)   │
│  jardim-bebe-angular      │        │  jardim-bebe-sound-server      │
│  Angular compilado        │        │  server/index.mjs              │
│  onrender.com             │        │  ...sound-server.onrender.com  │
└────────────┬─────────────┘        └───────────────┬──────────────┘
             │  (navegador do usuário)               │
             │  POST /api/upload, /api/copy...        │
             └──────────────────────────────────────▶│
                                                      │  commit via API
                                                      ▼
                                           ┌──────────────────────┐
                                           │       GitHub          │
                                           │  src/assets/sounds/   │
                                           │  src/assets/animals.json
                                           └───────────┬──────────┘
                                                        │ Deploy Hook
                                                        ▼
                                           (Render reconstrói o frontend)
```

### Frontend — `jardim-bebe-angular`
O app Angular de sempre, agora com um detalhe: ele sabe **com qual servidor de
sons falar** dependendo de onde está rodando. Essa escolha vive em
`src/app/sound-server.ts`:

- Em `localhost` → fala com o servidor local (`http://localhost:4300`).
- No site publicado → fala com o backend do Render.

### Backend — `jardim-bebe-sound-server`
Um servidor Node pequeno (pasta `server/`), **sem nenhuma dependência externa**
(usa só o que vem no Node). Ele expõe os mesmos endpoints do servidor local,
para o frontend reaproveitar o mesmo código. A diferença é que, em vez de gravar
no disco, ele grava no GitHub.

### GitHub
É onde os arquivos realmente ficam. Cada som vira um arquivo em
`src/assets/sounds/` e cada animal vira uma entrada em `src/assets/animals.json`.

---

## 4. O fluxo completo de um upload (passo a passo)

Quando você, no celular, cria um animal com som na página `/baixar`:

1. **Frontend → Backend.** O navegador envia o som para o backend
   (`POST /api/upload`, `/api/copy` ou `/api/download`) e, em seguida, os dados
   do animal (`POST /api/animal`).
2. **Backend → GitHub.** O backend grava o `.mp3` e atualiza o `animals.json`
   fazendo **commits** no repositório (arquivo `server/github-storage.mjs`).
3. **Backend → Deploy Hook.** Logo após gravar, o backend chama o **Deploy
   Hook** do frontend (uma URL secreta do Render). Isso **força o site a ser
   reconstruído** com o conteúdo novo. É o que garante que o animal apareça no
   jardim publicado, mesmo que o deploy automático do GitHub não dispare.
4. **Preview imediato.** Enquanto o site reconstrói (leva 1–2 min), o backend já
   consegue servir o som por `GET /sounds/<arquivo>` (ele busca o arquivo "cru"
   do GitHub). Por isso o preview e o primeiro play funcionam na hora.

Resumindo a cadeia:

> **upload → commit no GitHub → Deploy Hook → site reconstruído → animal no jardim**

Tudo automático. Você não precisa dar `git push` manual.

---

## 5. Por que o backend "demora" no primeiro acesso

O backend está no **plano gratuito** do Render, que **hiberna** após um tempo
sem uso. No primeiro acesso depois de parado, ele leva ~30–50s para "acordar".
Não é erro — é a economia do plano free. Nas telas isso aparece como
"Conectando ao servidor de sons...". Se um dia isso incomodar, dá para manter o
backend acordado com um "ping" periódico gratuito (ex.: GitHub Actions), mas não
é necessário para funcionar.

---

## 6. Segurança (o que protegemos e por quê)

O backend tem a chave do seu repositório (um token do GitHub com permissão de
escrita). Isso é poderoso, então adicionamos proteções:

- **Anti-SSRF no `/api/download`.** Esse endpoint baixa um áudio de uma URL que
  o usuário informa. Sem proteção, alguém poderia pedir para o servidor acessar
  endereços internos da nuvem (um ataque chamado SSRF). O backend agora
  **resolve o endereço e recusa qualquer IP interno** (loopback, redes privadas,
  o IP de metadados da nuvem), inclusive após redirecionamentos.
- **Anti-travessia de diretório.** Nomes de arquivo com `..` ou `/` são
  rejeitados, para ninguém conseguir ler/escrever fora da pasta de sons.
- **CORS restrito.** Só a origem do seu frontend pode chamar o backend pelo
  navegador (configurado em `ALLOWED_ORIGIN`). Sem essa variável, o backend não
  libera nenhuma origem externa.
- **Segredo de escrita opcional (`WRITE_SECRET`).** Se você definir essa
  variável, as rotas que gravam passam a exigir um header secreto. É uma camada
  extra para impedir que estranhos gravem no seu repositório. Veja a seção 8.
- **Limites de tamanho e conflito.** Áudio até 15 MB; gravações simultâneas no
  `animals.json` têm retry automático em caso de conflito.

---

## 7. Variáveis de ambiente (no painel do Render, serviço backend)

| Variável | Para quê |
|---|---|
| `GITHUB_TOKEN` | Autoriza o backend a gravar no repositório. **Secreta.** |
| `GITHUB_REPO` | Qual repositório, ex.: `rafaelcn1dev/jardim-bebe-angular`. |
| `GITHUB_BRANCH` | Branch de destino (padrão `main`). |
| `ALLOWED_ORIGIN` | Origem do frontend para liberar o CORS. |
| `FRONTEND_DEPLOY_HOOK` | URL que dispara o redeploy do frontend. |
| `WRITE_SECRET` | (Opcional) exige header secreto nas gravações. |

---

## 8. Recomendação de proteção extra (opcional, mas recomendada)

Hoje, se alguém descobrir o endereço do backend, poderia tentar criar sons no
seu repositório. Para fechar isso, ative o `WRITE_SECRET`:

1. No Render, serviço **backend** → **Environment** → adicione:
   - `WRITE_SECRET` = um texto secreto qualquer (ex.: uma senha longa).
2. No frontend, o mesmo valor precisa ser enviado no header `x-write-secret`
   das chamadas de escrita.

> Observação: isso exige um pequeno ajuste no frontend para enviar o header.
> Hoje o `WRITE_SECRET` está preparado no backend mas **desligado** (sem a
> variável, as rotas continuam abertas, como antes). Se você quiser ativar,
> me avise que eu faço o ajuste no frontend junto.

---

## 9. Onde está cada coisa no código

| Arquivo | Papel |
|---|---|
| `server/index.mjs` | O servidor HTTP: rotas, CORS, segredo, proxy de sons, disparo do Deploy Hook. |
| `server/github-storage.mjs` | Grava/lê no GitHub (commits), validações e proteções. |
| `server/github-storage.test.mjs` | Testes das funções de risco. |
| `server/README.md` | Referência rápida do backend. |
| `src/app/sound-server.ts` | Decide a URL do servidor de sons (dev x produção). |
| `src/app/baixar.component.ts` | A tela de criar/editar sons. |
| `src/app/jardim.component.ts` | Toca os sons (com fallback para o backend). |
| `scripts/sound-server.mjs` | Servidor **local** de desenvolvimento (grava no disco). |

---

## 10. Como desenvolver localmente

Nada mudou no fluxo local:

```bash
npm start
```

Isso sobe o app Angular **e** o servidor de sons local juntos. Em `localhost` o
frontend fala com esse servidor local (porta 4300), que grava direto no disco —
não envolve GitHub nem o backend de produção.
