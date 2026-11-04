#!/usr/bin/env node
/**
 * Backend de PRODUÇÃO para a página /baixar (Render Web Service, plano free).
 *
 * Diferente do scripts/sound-server.mjs (que grava no disco local em
 * desenvolvimento), este servidor persiste os sons e animais fazendo COMMIT
 * no repositório do GitHub (ver server/github-storage.mjs). Assim, no site
 * publicado, criar/baixar/enviar/editar sons funciona e NÃO se perde a cada
 * deploy — o próprio commit dispara um novo deploy com o conteúdo embutido.
 *
 * Endpoints (iguais aos do servidor local, para o frontend reaproveitar):
 *   GET  /api/health          -> status simples
 *   GET  /api/sounds          -> lista os sons existentes no repo
 *   GET  /sounds/<arquivo>     -> serve/proxy de um som (para preview/fallback)
 *   POST /api/download        body { url, nome }
 *   POST /api/upload?nome=&arquivo=   corpo binário
 *   POST /api/copy            body { origem, nome }
 *   POST /api/animal          body { animal }
 *
 * Variáveis de ambiente:
 *   GITHUB_TOKEN   (obrigatória) PAT fine-grained com escrita em Contents
 *   GITHUB_REPO    (obrigatória) "usuario/repositorio"
 *   GITHUB_BRANCH  (opcional, padrão "main")
 *   ALLOWED_ORIGIN (recomendada) origem do frontend p/ CORS; em produção NÃO
 *                  deve ficar "*". Se não definida, o CORS fica restrito e
 *                  bloqueia chamadas de navegador de outras origens.
 *   WRITE_SECRET   (opcional) se definida, as rotas de escrita exigem o header
 *                  "x-write-secret" com esse valor. Camada extra de proteção.
 *   FRONTEND_DEPLOY_HOOK (recomendada) Deploy Hook do frontend no Render.
 *   PORT           (Render injeta automaticamente)
 */

import { createServer } from 'node:http';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import {
  downloadSound,
  saveAnimal,
  saveSoundBytes,
  listSounds,
  copySound,
  nomeArquivoSeguro,
  EXT_PERMITIDAS,
} from './github-storage.mjs';

const PORT = Number(process.env.PORT) || 4300;
// Origem do frontend para CORS. Sem valor, cai para o próprio domínio do
// serviço (efetivamente bloqueando navegadores de outras origens) em vez de "*".
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const WRITE_SECRET = process.env.WRITE_SECRET || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
// Deploy Hook do site estático (frontend) no Render. Quando definido, o backend
// dispara um redeploy do frontend após gravar no GitHub, garantindo que o
// conteúdo novo entre no build publicado mesmo que o webhook automático falhe.
const FRONTEND_DEPLOY_HOOK = process.env.FRONTEND_DEPLOY_HOOK || '';

/**
 * Dispara o redeploy do frontend chamando o Deploy Hook do Render.
 * Não lança erro: se o hook não estiver configurado ou falhar, apenas registra.
 */
async function dispararDeployFrontend() {
  if (!FRONTEND_DEPLOY_HOOK) {
    console.log('[deploy] FRONTEND_DEPLOY_HOOK não definido; pulando redeploy automático.');
    return;
  }
  try {
    const resp = await fetch(FRONTEND_DEPLOY_HOOK, { method: 'POST' });
    console.log(`[deploy] hook do frontend chamado: HTTP ${resp.status}`);
  } catch (err) {
    console.warn(`[deploy] falha ao chamar o hook do frontend: ${err.message}`);
  }
}

const MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};

function corsHeaders(extra = {}) {
  return {
    // Sem ALLOWED_ORIGIN definida, não libera CORS para nenhuma origem externa.
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN || 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-write-secret',
    ...extra,
  };
}

/**
 * Se WRITE_SECRET estiver configurado, exige o header "x-write-secret" igual.
 * Comparação em tempo constante para evitar vazamento por timing. Quando o
 * segredo não está definido, não bloqueia (mantém compatibilidade).
 */
function escritaAutorizada(req) {
  if (!WRITE_SECRET) return true;
  const enviado = req.headers['x-write-secret'];
  if (typeof enviado !== 'string' || enviado.length === 0) return false;
  const a = Buffer.from(enviado);
  const b = Buffer.from(WRITE_SECRET);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sendJson(res, status, data) {
  res.writeHead(status, corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
  res.end(JSON.stringify(data));
}

/**
 * Serve um som fazendo proxy do conteúdo "raw" do GitHub. Isso garante que,
 * logo após criar/enviar um som (e antes do redeploy do frontend terminar), o
 * preview e o fallback de áudio já consigam tocá-lo.
 */
async function serveSom(res, nomeArquivo) {
  const ext = '.' + (nomeArquivo.toLowerCase().split('.').pop() || '');
  if (!MIME[ext]) {
    res.writeHead(404, corsHeaders());
    res.end('not found');
    return;
  }
  if (!GITHUB_REPO.includes('/')) {
    res.writeHead(500, corsHeaders());
    res.end('GITHUB_REPO not configured');
    return;
  }
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/src/assets/sounds/${encodeURIComponent(nomeArquivo)}`;
  try {
    const upstream = await fetch(rawUrl);
    if (!upstream.ok) {
      res.writeHead(404, corsHeaders());
      res.end('not found');
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(200, corsHeaders({
      'Content-Type': MIME[ext],
      'Content-Length': buf.length,
      'Cache-Control': 'no-cache',
    }));
    res.end(buf);
  } catch {
    res.writeHead(502, corsHeaders());
    res.end('upstream error');
  }
}

function lerCorpo(req, limite) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let tamanho = 0;
    req.on('data', (chunk) => {
      tamanho += chunk.length;
      if (tamanho > limite) {
        reject(new Error('Corpo da requisição grande demais.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  // Saúde / raiz
  if (req.method === 'GET' && (req.url === '/' || req.url === '/api/health')) {
    sendJson(res, 200, {
      ok: true,
      servico: 'jardim-bebe-sound-server',
      repo: GITHUB_REPO || null,
      extensoes: EXT_PERMITIDAS,
    });
    return;
  }

  // Lista de sons
  if (req.method === 'GET' && req.url === '/api/sounds') {
    try {
      const sons = await listSounds();
      sendJson(res, 200, { ok: true, sons });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
    }
    return;
  }

  // Servir/propagar um som (preview + fallback)
  if (req.method === 'GET' && req.url.startsWith('/sounds/')) {
    const nomeArquivo = decodeURIComponent(req.url.replace('/sounds/', '').split('?')[0]);
    const seguro = nomeArquivoSeguro(nomeArquivo); // rejeita ".." e "/"
    if (!seguro) {
      res.writeHead(400, corsHeaders());
      res.end('bad request');
      return;
    }
    await serveSom(res, seguro);
    return;
  }

  // Upload (corpo binário; nome/arquivo na query string)
  if (req.method === 'POST' && req.url.startsWith('/api/upload')) {
    if (!escritaAutorizada(req)) {
      sendJson(res, 401, { ok: false, error: 'Não autorizado.' });
      return;
    }
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const nome = url.searchParams.get('nome') || '';
      const arquivo = url.searchParams.get('arquivo') || '';
      const buffer = await lerCorpo(req, 15 * 1024 * 1024);
      const result = await saveSoundBytes(buffer, nome, arquivo);
      await dispararDeployFrontend();
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 400, { ok: false, error: err.message });
    }
    return;
  }

  // Rotas JSON
  const rotasJson = {
    '/api/download': (p) => downloadSound(p.url, p.nome),
    '/api/animal': (p) => saveAnimal(p.animal),
    '/api/copy': (p) => copySound(p.origem, p.nome),
  };

  if (req.method === 'POST' && rotasJson[req.url]) {
    if (!escritaAutorizada(req)) {
      sendJson(res, 401, { ok: false, error: 'Não autorizado.' });
      return;
    }
    try {
      const raw = await lerCorpo(req, 1_000_000);
      let payload;
      try {
        payload = JSON.parse(raw.toString('utf8') || '{}');
      } catch {
        sendJson(res, 400, { ok: false, error: 'JSON inválido.' });
        return;
      }
      const result = await rotasJson[req.url](payload);
      // Gravou no GitHub com sucesso -> garante o redeploy do frontend.
      await dispararDeployFrontend();
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      sendJson(res, err.status || 400, { ok: false, error: err.message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Rota não encontrada.' });
});

server.listen(PORT, () => {
  console.log(`[sound-server] ouvindo na porta ${PORT}`);
  console.log(`[sound-server] repo: ${GITHUB_REPO || '(GITHUB_REPO não definido)'} branch: ${GITHUB_BRANCH}`);
  console.log(`[sound-server] CORS origin: ${ALLOWED_ORIGIN || '(restrito: nenhuma origem externa)'}`);
  console.log(`[sound-server] segredo de escrita: ${WRITE_SECRET ? 'exigido' : 'não exigido'}`);
  console.log(`[sound-server] deploy hook frontend: ${FRONTEND_DEPLOY_HOOK ? 'configurado' : 'NÃO configurado'}`);
});
