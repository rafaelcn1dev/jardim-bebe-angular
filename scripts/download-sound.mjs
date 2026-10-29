#!/usr/bin/env node
/**
 * Baixa o áudio de um vídeo do YouTube (ou de uma URL direta) e salva em
 * src/assets/sounds/.
 *
 * Uso:
 *   node scripts/download-sound.mjs <url> <nome>
 *
 * Exemplos:
 *   node scripts/download-sound.mjs "https://www.youtube.com/watch?v=XXXXXXX" gato
 *   node scripts/download-sound.mjs "https://exemplo.com/miado.mp3" gato
 *
 * - <url>  : link do YouTube OU link direto para um arquivo de áudio.
 * - <nome> : nome do arquivo (sem extensão). Será salvo como
 *            src/assets/sounds/<nome>.mp3
 *
 * PRÉ-REQUISITOS:
 *   1. yt-dlp instalado e disponível no PATH
 *      https://github.com/yt-dlp/yt-dlp
 *   2. ffmpeg instalado e disponível no PATH (necessário para converter em mp3)
 *   3. Node.js v22+ (recomendado pelo yt-dlp para o YouTube em 2026)
 *
 * ATENÇÃO: baixe apenas conteúdo que você tem direito de usar. Respeite os
 * termos de serviço do YouTube e as licenças dos materiais.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function printUsageAndExit() {
  console.error('Uso: node scripts/download-sound.mjs <url> <nome>');
  console.error('Exemplo: node scripts/download-sound.mjs "https://www.youtube.com/watch?v=XXXX" gato');
  process.exit(1);
}

const [, , url, nome] = process.argv;

if (!url || !nome) {
  printUsageAndExit();
}

// Sanitiza o nome para evitar caminhos estranhos
const safeName = nome.replace(/[^\w.-]+/g, '_');

const outputDir = path.join(process.cwd(), 'src', 'assets', 'sounds');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// %(ext)s permite que o yt-dlp escolha a extensão e o ffmpeg converta para mp3
const outputTemplate = path.join(outputDir, `${safeName}.%(ext)s`);

const args = [
  '-x',                        // extrai apenas o áudio
  '--audio-format', 'mp3',     // converte para mp3
  '--audio-quality', '0',      // melhor qualidade
  '-o', outputTemplate,        // template de saída
  '--no-playlist',             // se for playlist, baixa só o vídeo da URL
  url,
];

try {
  console.log(`Baixando áudio de: ${url}`);
  console.log(`Salvando em: ${outputDir}/${safeName}.mp3`);
  execFileSync('yt-dlp', args, { stdio: 'inherit' });
  console.log('✔ Download e conversão concluídos!');
} catch (error) {
  console.error('\n✖ Falha ao baixar o áudio.');
  console.error('Verifique se:');
  console.error('  - yt-dlp está instalado e no PATH');
  console.error('  - ffmpeg está instalado e no PATH');
  console.error('  - Node.js v22+ está instalado (recomendado para o YouTube)');
  console.error('  - a URL é válida e acessível');
  if (error?.code === 'ENOENT') {
    console.error('\nDetalhe: comando "yt-dlp" não encontrado no PATH.');
  }
  process.exit(1);
}