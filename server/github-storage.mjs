/**
 * Armazenamento persistente e GRATUITO usando a API do GitHub.
 *
 * Em produção (Render, site estático/efêmero) não há disco durável: tudo que é
 * gravado some no próximo deploy. Para os sons e animais criados pela página
 * /baixar persistirem de verdade, este módulo faz COMMIT dos arquivos direto no
 * repositório do GitHub (Contents API). O Render detecta o commit e redeploya
 * com o conteúdo novo já embutido.
 *
 * Requer as variáveis de ambiente:
 *   GITHUB_TOKEN  -> Personal Access Token (fine-grained) com permissão de
 *                    escrita em "Contents" no repositório.
 *   GITHUB_REPO   -> "usuario/repositorio" (ex.: "rafaelcn1dev/jardim-bebe-angular")
 *   GITHUB_BRANCH -> branch de destino (opcional, padrão "main")
 *
 * Observação sobre direitos autorais: downloads por URL continuam recusando
 * links do YouTube (Termos de Serviço + direitos autorais).
 */

import { Buffer } from 'node:buffer';

const GITHUB_API = 'https://api.github.com';

export const EXT_PERMITIDAS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
const SOUNDS_PREFIX = 'src/assets/sounds';
const ANIMALS_PATH = 'src/assets/animals.json';

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) throw new Error('GITHUB_TOKEN não configurado no servidor.');
  if (!repo || !repo.includes('/')) {
    throw new Error('GITHUB_REPO inválido. Use o formato "usuario/repositorio".');
  }
  return { token, repo, branch };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'jardim-bebe-sound-server',
  };
}

export function sanitizarNome(nome) {
  return String(nome)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
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
 * Busca um arquivo do repo. Retorna { sha, contentBase64 } ou null se não existir.
 */
async function getFile(path) {
  const { token, repo, branch } = cfg();
  const url = `${GITHUB_API}/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`;
  const resp = await fetch(url, { headers: headers(token) });
  if (resp.status === 404) return null;
  if (!resp.ok) {
    throw new Error(`GitHub GET ${path} falhou: HTTP ${resp.status}`);
  }
  const data = await resp.json();
  return { sha: data.sha, contentBase64: (data.content || '').replace(/\n/g, '') };
}

/**
 * Cria ou atualiza um arquivo no repo (commit). `content` deve ser Buffer.
 */
async function putFile(path, contentBuffer, mensagem) {
  const { token, repo, branch } = cfg();
  const existente = await getFile(path).catch(() => null);
  const url = `${GITHUB_API}/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const body = {
    message: mensagem,
    content: contentBuffer.toString('base64'),
    branch,
  };
  if (existente?.sha) body.sha = existente.sha;

  const resp = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    let detalhe = '';
    try {
      const j = await resp.json();
      detalhe = j.message ? ` (${j.message})` : '';
    } catch {}
    throw new Error(`GitHub PUT ${path} falhou: HTTP ${resp.status}${detalhe}`);
  }
  return resp.json();
}

/** Lê os bytes de um arquivo de som do repo. Retorna Buffer ou null. */
async function getSoundBytes(fileName) {
  const file = await getFile(`${SOUNDS_PREFIX}/${fileName}`);
  if (!file) return null;
  return Buffer.from(file.contentBase64, 'base64');
}

// ---------------------------------------------------------------------------
// API pública (mesma forma do sound-lib.mjs local, mas gravando no GitHub)
// ---------------------------------------------------------------------------

/** Baixa um áudio por URL direta e faz commit em src/assets/sounds/<nome>.<ext>. */
export async function downloadSound(url, nomeBruto) {
  if (!url || !nomeBruto) throw new Error('URL e nome são obrigatórios.');

  if (/youtube\.com|youtu\.be/i.test(url)) {
    throw new Error(
      'Links do YouTube não são suportados (Termos de Serviço + direitos autorais). ' +
        'Use um link DIRETO .mp3 de uma fonte livre como Pixabay, Mixkit ou Freesound.'
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('URL inválida.');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Use uma URL http(s).');

  const nome = sanitizarNome(nomeBruto);
  if (!nome) throw new Error('Nome inválido após normalização.');

  const ext = extensaoDaUrl(url);
  if (!EXT_PERMITIDAS.includes(ext)) {
    throw new Error(`Extensão ${ext} não suportada. Use: ${EXT_PERMITIDAS.join(', ')}`);
  }

  let resposta;
  try {
    resposta = await fetch(url, { redirect: 'follow' });
  } catch (err) {
    throw new Error(`Falha ao conectar: ${err.message}`);
  }
  if (!resposta.ok) {
    throw new Error(`Download falhou: HTTP ${resposta.status} ${resposta.statusText}`);
  }

  const arrayBuf = await resposta.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  if (buffer.length === 0) throw new Error('O áudio baixado está vazio.');
  if (buffer.length > 15 * 1024 * 1024) throw new Error('Áudio muito grande (limite 15 MB).');

  const fileName = `${nome}${ext}`;
  await putFile(`${SOUNDS_PREFIX}/${fileName}`, buffer, `som: adiciona ${fileName} via /baixar`);

  return { fileName, relativePath: `assets/sounds/${fileName}` };
}

/** Grava bytes enviados por upload em src/assets/sounds/<nome>.<ext>. */
export async function saveSoundBytes(buffer, nomeBruto, nomeArquivoOriginal = '') {
  if (!buffer || buffer.length === 0) throw new Error('Arquivo vazio.');
  if (buffer.length > 15 * 1024 * 1024) throw new Error('Arquivo muito grande (limite 15 MB).');

  const nome = sanitizarNome(nomeBruto);
  if (!nome) throw new Error('Nome inválido após normalização.');

  const m = String(nomeArquivoOriginal).toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/);
  const ext = m ? `.${m[1]}` : '.mp3';
  if (!EXT_PERMITIDAS.includes(ext)) {
    throw new Error(`Extensão ${ext} não suportada. Use: ${EXT_PERMITIDAS.join(', ')}`);
  }

  const fileName = `${nome}${ext}`;
  await putFile(`${SOUNDS_PREFIX}/${fileName}`, buffer, `som: envia ${fileName} via /baixar`);

  return { fileName, relativePath: `assets/sounds/${fileName}` };
}

/** Copia um som existente para um novo id (reaproveita um arquivo já no repo). */
export async function copySound(origemArquivo, nomeDestinoBruto) {
  const origem = String(origemArquivo || '').replace(/[^a-z0-9_.-]/gi, '');
  const ext = origem.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/);
  if (!ext) throw new Error('Arquivo de origem inválido.');

  const nome = sanitizarNome(nomeDestinoBruto);
  if (!nome) throw new Error('Nome de destino inválido.');

  const bytes = await getSoundBytes(origem);
  if (!bytes) throw new Error(`Som de origem "${origem}" não encontrado.`);

  const fileName = `${nome}${ext[0]}`;
  await putFile(`${SOUNDS_PREFIX}/${fileName}`, bytes, `som: copia ${origem} -> ${fileName}`);

  return { fileName, relativePath: `assets/sounds/${fileName}` };
}

/** Lista os arquivos de áudio presentes em src/assets/sounds/. */
export async function listSounds() {
  const { token, repo, branch } = cfg();
  const url = `${GITHUB_API}/repos/${repo}/contents/${SOUNDS_PREFIX}?ref=${encodeURIComponent(branch)}`;
  const resp = await fetch(url, { headers: headers(token) });
  if (resp.status === 404) return [];
  if (!resp.ok) throw new Error(`GitHub listar sons falhou: HTTP ${resp.status}`);
  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((f) => f.type === 'file')
    .map((f) => f.name)
    .filter((n) => EXT_PERMITIDAS.some((e) => n.toLowerCase().endsWith(e)))
    .sort();
}

/** Adiciona/atualiza um animal em src/assets/animals.json (commit). */
export async function saveAnimal(animal) {
  if (!animal || !animal.id || !animal.name || !animal.emoji) {
    throw new Error('Animal inválido: id, name e emoji são obrigatórios.');
  }

  const id = sanitizarNome(animal.id);
  if (!id) throw new Error('id inválido após normalização.');

  const registro = {
    id,
    name: String(animal.name).trim(),
    emoji: String(animal.emoji).trim(),
    bgClass: animal.bgClass || 'bg-pink-100',
    soundType: animal.soundType || '',
    x: Number.isFinite(animal.x) ? animal.x : 500,
    y: Number.isFinite(animal.y) ? animal.y : 400,
    size: Number.isFinite(animal.size) ? animal.size : 8,
    message: String(animal.message || '').trim(),
  };

  const atual = await getFile(ANIMALS_PATH);
  let animais = [];
  if (atual) {
    try {
      animais = JSON.parse(Buffer.from(atual.contentBase64, 'base64').toString('utf8'));
      if (!Array.isArray(animais)) animais = [];
    } catch {
      animais = [];
    }
  }

  const semDuplicado = animais.filter((a) => a.id !== id);
  semDuplicado.push(registro);

  const conteudo = Buffer.from(JSON.stringify(semDuplicado, null, 2) + '\n', 'utf8');
  await putFile(ANIMALS_PATH, conteudo, `animais: salva "${id}" via /baixar`);

  return { animal: registro, total: semDuplicado.length };
}
