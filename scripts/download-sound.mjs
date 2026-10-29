#!/usr/bin/env node
/**
 * Baixa um arquivo de áudio por URL direta e salva em src/assets/sounds/.
 *
 * Uso:
 *   node scripts/download-sound.mjs <url> <nome>
 *
 * Exemplos:
 *   node scripts/download-sound.mjs "https://exemplo.com/miado.mp3" gato
 *   node scripts/download-sound.mjs "https://exemplo.com/som.wav" cachorro
 *
 * - <url>  : link DIRETO para um arquivo de audio (.mp3, .wav, .ogg, .m4a).
 *            Use fontes livres como Pixabay, Mixkit ou Freesound (CC0).
 * - <nome> : nome do animal / do arquivo (sem extensao). O arquivo sera
 *            salvo como src/assets/sounds/<nome>.mp3 (ou a extensao da URL).
 *
 * ATENCAO: nao use este script com links do YouTube ou de conteudo protegido
 * por direitos autorais. Use apenas audio que voce tem permissao para usar.
 */

import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOUNDS_DIR = resolve(__dirname, '..', 'src', 'assets', 'sounds');

const EXT_PERMITIDAS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];

function sanitizarNome(nome) {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9_-]+/g, '-')   // troca o resto por hifen
    .replace(/^-+|-+$/g, '');
}

function extensaoDaUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.(mp3|wav|ogg|m4a|aac)$/);
    return match ? `.${match[1]}` : '.mp3';
  } catch {
    return '.mp3';
  }
}

async function main() {
  const [url, nomeBruto] = process.argv.slice(2);

  if (!url || !nomeBruto) {
    console.error('Uso: node scripts/download-sound.mjs <url> <nome>');
    console.error('Ex.: node scripts/download-sound.mjs "https://site.com/miado.mp3" gato');
    process.exit(1);
  }

  if (/youtube\.com|youtu\.be/i.test(url)) {
    console.error('\n[ERRO] Links do YouTube nao sao suportados.');
    console.error('Baixar audio do YouTube viola os Termos de Servico e pode');
    console.error('infringir direitos autorais. Use fontes de audio livres como');
    console.error('Pixabay, Mixkit ou Freesound (CC0) e passe o link DIRETO .mp3.\n');
    process.exit(1);
  }

  const nome = sanitizarNome(nomeBruto);
  if (!nome) {
    console.error('[ERRO] Nome invalido apos normalizacao.');
    process.exit(1);
  }

  const ext = extensaoDaUrl(url);
  if (!EXT_PERMITIDAS.includes(ext)) {
    console.error(`[ERRO] Extensao ${ext} nao suportada. Use: ${EXT_PERMITIDAS.join(', ')}`);
    process.exit(1);
  }

  const destino = join(SOUNDS_DIR, `${nome}${ext}`);

  console.log(`Baixando: ${url}`);
  console.log(`Salvando em: ${destino}`);

  await mkdir(SOUNDS_DIR, { recursive: true });

  let resposta;
  try {
    resposta = await fetch(url, { redirect: 'follow' });
  } catch (err) {
    console.error(`[ERRO] Falha ao conectar: ${err.message}`);
    process.exit(1);
  }

  if (!resposta.ok) {
    console.error(`[ERRO] Download falhou: HTTP ${resposta.status} ${resposta.statusText}`);
    process.exit(1);
  }

  const tipo = resposta.headers.get('content-type') || '';
  if (tipo && !/audio|octet-stream|mpeg/i.test(tipo)) {
    console.warn(`[AVISO] Content-Type inesperado: "${tipo}". `);
    console.warn('        Verifique se a URL aponta para um arquivo de audio direto.');
  }

  try {
    await pipeline(Readable.fromWeb(resposta.body), createWriteStream(destino));
  } catch (err) {
    await unlink(destino).catch(() => {});
    console.error(`[ERRO] Falha ao gravar o arquivo: ${err.message}`);
    process.exit(1);
  }

  console.log(`\n[OK] Audio salvo: assets/sounds/${nome}${ext}`);
  console.log('Clique no animal correspondente no app para ouvir.');
}

main();
