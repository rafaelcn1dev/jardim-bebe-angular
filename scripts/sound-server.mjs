#!/usr/bin/env node
/**
 * Servidor local para a pagina /baixar.
 *
 * A pagina Angular roda no navegador e NAO consegue gravar arquivos no disco.
 * Este pequeno servidor Node recebe o pedido da pagina, baixa o audio por URL
 * DIRETA e grava em src/assets/sounds/.
 *
 * Uso (em um terminal separado, junto com `npm start`):
 *   npm run sound-server
 *
 * Endpoints:
 *   POST /api/download   body JSON: { "url": "...", "nome": "gato" }
 *   POST /api/upload?nome=gato&arquivo=som.mp3   body: bytes do arquivo
 *   POST /api/animal     body JSON: { "animal": {...} }
 *
 * So funciona em desenvolvimento local. No GitHub Pages (estatico) nao ha
 * backend, entao a pagina avisa que o recurso esta indisponivel.
 */

import { createServer } from 'node:http';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { downloadSound, saveAnimal, saveSoundBytes, SOUNDS_DIR } from './sound-lib.mjs';

const MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};

const PORT = Number(process.env.SOUND_SERVER_PORT) || 4300;

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  // Pre-flight CORS
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  // GET /sounds/<arquivo>: serve os audios direto do disco (inclusive os
  // recem-criados, que o `ng serve` so passa a servir apos reiniciar).
  if (req.method === 'GET' && req.url.startsWith('/sounds/')) {
    const nomeArquivo = basename(decodeURIComponent(req.url.replace('/sounds/', '').split('?')[0]));
    const ext = extname(nomeArquivo).toLowerCase();
    const caminho = join(SOUNDS_DIR, nomeArquivo);

    // So serve de dentro de SOUNDS_DIR e extensoes de audio conhecidas.
    if (!MIME[ext] || !caminho.startsWith(SOUNDS_DIR)) {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
      res.end('not found');
      return;
    }

    try {
      const info = await stat(caminho);
      res.writeHead(200, {
        'Content-Type': MIME[ext],
        'Content-Length': info.size,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      createReadStream(caminho).pipe(res);
    } catch {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
      res.end('not found');
    }
    return;
  }

  // Upload de arquivo (corpo binario). Nome e nome-original vem na query string.
  // Ex.: POST /api/upload?nome=gato&arquivo=meu-som.mp3
  if (req.method === 'POST' && req.url.startsWith('/api/upload')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const nome = url.searchParams.get('nome') || '';
    const arquivo = url.searchParams.get('arquivo') || '';

    const chunks = [];
    let tamanho = 0;
    req.on('data', (chunk) => {
      tamanho += chunk.length;
      if (tamanho > 15 * 1024 * 1024) {
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const result = await saveSoundBytes(buffer, nome, arquivo);
        console.log(`[OK] upload ${result.relativePath}`);
        sendJson(res, 200, { ok: true, ...result });
      } catch (err) {
        console.error(`[ERRO] ${err.message}`);
        sendJson(res, 400, { ok: false, error: err.message });
      }
    });
    return;
  }

  const rotas = {
    '/api/download': async (payload) => {
      const result = await downloadSound(payload.url, payload.nome);
      console.log(`[OK] som ${result.relativePath}`);
      return result;
    },
    '/api/animal': async (payload) => {
      const result = await saveAnimal(payload.animal);
      console.log(`[OK] animal "${result.animal.id}" salvo (total: ${result.total})`);
      return result;
    },
  };

  if (req.method === 'POST' && rotas[req.url]) {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
      }
    });
    req.on('end', async () => {
      let payload;
      try {
        payload = JSON.parse(raw || '{}');
      } catch {
        sendJson(res, 400, { ok: false, error: 'JSON invalido.' });
        return;
      }

      try {
        const result = await rotas[req.url](payload);
        sendJson(res, 200, { ok: true, ...result });
      } catch (err) {
        console.error(`[ERRO] ${err.message}`);
        sendJson(res, 400, { ok: false, error: err.message });
      }
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Rota nao encontrada.' });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[sons] Porta ${PORT} ja em uso. Provavelmente o servidor de sons ja esta rodando — ok, seguindo.`);
    // Nao derruba o `npm start`: o Angular continua servindo normalmente.
    return;
  }
  console.error('[sons] Erro no servidor de sons:', err.message);
});

server.listen(PORT, () => {
  console.log(`Servidor de sons ouvindo em http://localhost:${PORT}`);
  console.log('Endpoints: POST /api/download | /api/upload | /api/animal');
  console.log('Iniciado junto com o app (npm start).');
});
