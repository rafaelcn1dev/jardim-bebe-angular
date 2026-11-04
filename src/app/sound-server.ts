/**
 * Descobre a URL base do servidor de sons conforme o ambiente.
 *
 * - Em desenvolvimento (localhost/127.0.0.1): usa o servidor local que o
 *   `npm start` sobe junto com o app (scripts/sound-server.mjs, porta 4300).
 * - Em produção (site publicado): usa o backend Node hospedado no Render, que
 *   persiste os sons via commit no GitHub (pasta server/).
 *
 * A URL de produção pode ser sobrescrita em runtime definindo
 * `window.__SOUND_SERVER__` (ex.: injetado no index.html), o que evita precisar
 * recompilar caso o endereço do backend mude.
 */

const DEV_SOUND_SERVER = 'http://localhost:4300';

// Ajuste aqui o endereço do backend de produção (Web Service no Render).
const PROD_SOUND_SERVER = 'https://jardim-bebe-sound-server.onrender.com';

export const EH_LOCALHOST = /^(localhost|127\.0\.0\.1)$/.test(
  typeof location !== 'undefined' ? location.hostname : 'localhost'
);

function resolveSoundServer(): string {
  const override = (globalThis as any)?.__SOUND_SERVER__;
  if (typeof override === 'string' && override) return override.replace(/\/+$/, '');
  return EH_LOCALHOST ? DEV_SOUND_SERVER : PROD_SOUND_SERVER;
}

/** URL base (sem barra final) do servidor de sons para o ambiente atual. */
export const SOUND_SERVER = resolveSoundServer();
