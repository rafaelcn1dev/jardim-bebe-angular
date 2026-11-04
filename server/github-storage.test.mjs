/**
 * Testes das funções puras de maior risco do backend de sons.
 * Usa o test runner nativo do Node (sem dependências): `node --test`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizarNome, nomeArquivoSeguro, ipEhInterno } from './github-storage.mjs';

test('sanitizarNome: normaliza acentos, espaços e maiúsculas', () => {
  assert.equal(sanitizarNome('Leão'), 'leao');
  assert.equal(sanitizarNome('  Cão Feliz  '), 'cao-feliz');
  assert.equal(sanitizarNome('Pato#1!'), 'pato-1');
});

test('sanitizarNome: remove tentativa de travessia de diretório', () => {
  // Pontos e barras não sobrevivem: viram hífen/são removidos.
  assert.equal(sanitizarNome('../../etc/passwd'), 'etc-passwd');
  assert.equal(sanitizarNome('..'), '');
});

test('nomeArquivoSeguro: aceita nomes simples válidos', () => {
  assert.equal(nomeArquivoSeguro('gato.mp3'), 'gato.mp3');
  assert.equal(nomeArquivoSeguro('vaca_feliz.wav'), 'vaca_feliz.wav');
});

test('nomeArquivoSeguro: rejeita travessia e caracteres inválidos', () => {
  assert.equal(nomeArquivoSeguro('../../package.json'), null);
  assert.equal(nomeArquivoSeguro('../gato.mp3'), null);
  assert.equal(nomeArquivoSeguro('pasta/gato.mp3'), null);
  assert.equal(nomeArquivoSeguro('gato..mp3'), null); // contém ".."
  assert.equal(nomeArquivoSeguro('gato.exe'), null); // extensão não permitida
  assert.equal(nomeArquivoSeguro(''), null);
});

test('ipEhInterno: detecta IPs privados/loopback/link-local', () => {
  assert.equal(ipEhInterno('127.0.0.1'), true);
  assert.equal(ipEhInterno('10.0.0.5'), true);
  assert.equal(ipEhInterno('172.16.0.1'), true);
  assert.equal(ipEhInterno('192.168.1.10'), true);
  assert.equal(ipEhInterno('169.254.169.254'), true); // metadados da nuvem
  assert.equal(ipEhInterno('::1'), true);
  assert.equal(ipEhInterno('fe80::1'), true);
});

test('ipEhInterno: aceita IPs públicos', () => {
  assert.equal(ipEhInterno('8.8.8.8'), false);
  assert.equal(ipEhInterno('1.1.1.1'), false);
  assert.equal(ipEhInterno('140.82.112.3'), false); // github.com
});
