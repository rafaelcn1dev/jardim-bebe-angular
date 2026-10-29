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
 * Endpoint:
 *   POST /api/download   body JSON: { "url": "...", "nome": "gato" }
 *
 * So funciona em desenvolvimento local. No GitHub Pages (estatico) nao ha
 * backend, entao a pagina avisa que o recurso esta indisponivel.
 */

import { createServer } from 'node:http';
import process from 'node:process';
import { downloadSound } from './sound-lib.mjs';

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

  if (req.method === 'POST' && req.url === '/api/download') {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // Protecao simples contra payload gigante
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
        const result = await downloadSound(payload.url, payload.nome);
        console.log(`[OK] ${result.relativePath}`);
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

server.listen(PORT, () => {
  console.log(`Servidor de sons ouvindo em http://localhost:${PORT}`);
  console.log('Endpoint: POST /api/download  { url, nome }');
  console.log('Deixe este terminal aberto enquanto usa a pagina /baixar.');
});
