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

import { downloadSound } from './sound-lib.mjs';
import process from 'node:process';

async function main() {
  const [url, nomeBruto] = process.argv.slice(2);

  if (!url || !nomeBruto) {
    console.error('Uso: node scripts/download-sound.mjs <url> <nome>');
    console.error('Ex.: node scripts/download-sound.mjs "https://site.com/miado.mp3" gato');
    process.exit(1);
  }

  try {
    const { relativePath } = await downloadSound(url, nomeBruto);
    console.log(`\n[OK] Audio salvo: ${relativePath}`);
    console.log('Clique no animal correspondente no app para ouvir.');
  } catch (err) {
    console.error(`[ERRO] ${err.message}`);
    process.exit(1);
  }
}

main();
