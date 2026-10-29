/**
 * Logica compartilhada para baixar um arquivo de audio por URL DIRETA e
 * salva-lo em src/assets/sounds/. Usada pelo script de linha de comando e
 * pelo servidor local da pagina /baixar.
 *
 * Apenas URLs diretas de audio sao aceitas. Links do YouTube sao recusados
 * de proposito (Termos de Servico + direitos autorais).
 */

import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SOUNDS_DIR = resolve(__dirname, '..', 'src', 'assets', 'sounds');

const EXT_PERMITIDAS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];

export function sanitizarNome(nome) {
  return String(nome)
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

/**
 * Baixa o audio e grava em src/assets/sounds/<nome>.<ext>.
 * Lanca Error com mensagem amigavel em caso de falha.
 * @returns {Promise<{ fileName: string, relativePath: string, absolutePath: string }>}
 */
export async function downloadSound(url, nomeBruto) {
  if (!url || !nomeBruto) {
    throw new Error('URL e nome sao obrigatorios.');
  }

  if (/youtube\.com|youtu\.be/i.test(url)) {
    throw new Error(
      'Links do YouTube nao sao suportados (Termos de Servico + direitos autorais). ' +
        'Use um link DIRETO .mp3 de uma fonte livre como Pixabay, Mixkit ou Freesound.'
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('URL invalida.');
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error('Use uma URL http(s).');
  }

  const nome = sanitizarNome(nomeBruto);
  if (!nome) {
    throw new Error('Nome invalido apos normalizacao.');
  }

  const ext = extensaoDaUrl(url);
  if (!EXT_PERMITIDAS.includes(ext)) {
    throw new Error(`Extensao ${ext} nao suportada. Use: ${EXT_PERMITIDAS.join(', ')}`);
  }

  const fileName = `${nome}${ext}`;
  const absolutePath = join(SOUNDS_DIR, fileName);

  await mkdir(SOUNDS_DIR, { recursive: true });

  let resposta;
  try {
    resposta = await fetch(url, { redirect: 'follow' });
  } catch (err) {
    throw new Error(`Falha ao conectar: ${err.message}`);
  }

  if (!resposta.ok) {
    throw new Error(`Download falhou: HTTP ${resposta.status} ${resposta.statusText}`);
  }

  const tipo = resposta.headers.get('content-type') || '';
  if (tipo && !/audio|octet-stream|mpeg/i.test(tipo)) {
    // Nao bloqueia, mas sinaliza: pode ser uma pagina HTML em vez de audio.
    console.warn(`[AVISO] Content-Type inesperado: "${tipo}". A URL aponta mesmo para um audio direto?`);
  }

  try {
    await pipeline(Readable.fromWeb(resposta.body), createWriteStream(absolutePath));
  } catch (err) {
    await unlink(absolutePath).catch(() => {});
    throw new Error(`Falha ao gravar o arquivo: ${err.message}`);
  }

  return {
    fileName,
    relativePath: `assets/sounds/${fileName}`,
    absolutePath,
  };
}
