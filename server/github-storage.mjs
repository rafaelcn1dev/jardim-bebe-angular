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
import { lookup } from 'node:dns/promises';
import net from 'node:net';

const GITHUB_API = 'https://api.github.com';

export const EXT_PERMITIDAS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
const SOUNDS_PREFIX = 'src/assets/sounds';
const ANIMALS_PATH = 'src/assets/animals.json';

/**
 * Erro com `status` HTTP sugerido, para o servidor responder com o código certo
 * (400 = entrada inválida, 409 = conflito, 502 = falha de serviço externo).
 */
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function cfg() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) throw new AppError('Servidor sem credencial do GitHub configurada.', 502);
  if (!repo || !repo.includes('/')) {
    throw new AppError('Servidor com repositório mal configurado.', 502);
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
 * Rejeita nomes de arquivo perigosos (travessia de diretório). Só aceita um
 * nome simples como "gato.mp3" — sem "/", "\" ou "..".
 */
export function nomeArquivoSeguro(nome) {
  const limpo = String(nome || '').trim();
  if (!limpo || limpo.includes('/') || limpo.includes('\\') || limpo.includes('..')) {
    return null;
  }
  // Só letras/números/._- e precisa terminar com extensão permitida.
  if (!/^[a-z0-9_.-]+$/i.test(limpo)) return null;
  if (!EXT_PERMITIDAS.some((e) => limpo.toLowerCase().endsWith(e))) return null;
  return limpo;
}

/** Verifica se um IP é privado/loopback/link-local (proteção contra SSRF). */
export function ipEhInterno(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local / metadata (169.254.169.254)
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const baixo = ip.toLowerCase();
    if (baixo === '::1' || baixo === '::') return true; // loopback
    if (baixo.startsWith('fe80')) return true; // link-local
    if (baixo.startsWith('fc') || baixo.startsWith('fd')) return true; // unique local
    if (baixo.startsWith('::ffff:')) return ipEhInterno(baixo.replace('::ffff:', '')); // IPv4 mapeado
    return false;
  }
  return true; // formato desconhecido: trata como inseguro
}

/**
 * Resolve o host e garante que nenhum endereço resolvido é interno. Protege
 * contra SSRF (ex.: endpoint de metadados da nuvem, serviços internos).
 */
async function garantirHostPublico(hostname) {
  // Se já for um IP literal, valida direto.
  if (net.isIP(hostname)) {
    if (ipEhInterno(hostname)) throw new AppError('Endereço de destino não permitido.', 400);
    return;
  }
  let enderecos;
  try {
    enderecos = await lookup(hostname, { all: true });
  } catch {
    throw new AppError('Não foi possível resolver o endereço informado.', 400);
  }
  if (!enderecos.length) throw new AppError('Endereço não encontrado.', 400);
  for (const { address } of enderecos) {
    if (ipEhInterno(address)) throw new AppError('Endereço de destino não permitido.', 400);
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
    // 409 = conflito de sha (escrita concorrente). Sinaliza para retry.
    if (resp.status === 409) {
      throw new AppError(`Conflito de versão ao gravar ${path}.`, 409);
    }
    // 401/403 = problema de token/permissão/limite -> falha de serviço externo.
    const status = resp.status === 401 || resp.status === 403 ? 502 : 400;
    throw new AppError(`Falha ao gravar no repositório (HTTP ${resp.status}).`, status);
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
  if (!url || !nomeBruto) throw new AppError('URL e nome são obrigatórios.');

  if (/youtube\.com|youtu\.be/i.test(url)) {
    throw new AppError(
      'Links do YouTube não são suportados (Termos de Serviço + direitos autorais). ' +
        'Use um link DIRETO .mp3 de uma fonte livre como Pixabay, Mixkit ou Freesound.'
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('URL inválida.');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new AppError('Use uma URL http(s).');

  const nome = sanitizarNome(nomeBruto);
  if (!nome) throw new AppError('Nome inválido após normalização.');

  const ext = extensaoDaUrl(url);
  if (!EXT_PERMITIDAS.includes(ext)) {
    throw new AppError(`Extensão ${ext} não suportada. Use: ${EXT_PERMITIDAS.join(', ')}`);
  }

  // Segue redirects manualmente, validando o host a cada salto (proteção SSRF:
  // impede que uma URL pública redirecione para um endereço interno).
  const MAX_REDIRECTS = 5;
  let urlAtual = parsed;
  let resposta;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await garantirHostPublico(urlAtual.hostname);
    try {
      resposta = await fetch(urlAtual.href, { redirect: 'manual' });
    } catch (err) {
      throw new AppError(`Falha ao conectar: ${err.message}`, 502);
    }
    // Redirecionamento?
    if (resposta.status >= 300 && resposta.status < 400 && resposta.headers.get('location')) {
      if (i === MAX_REDIRECTS) throw new AppError('Excesso de redirecionamentos.', 502);
      try {
        urlAtual = new URL(resposta.headers.get('location'), urlAtual);
      } catch {
        throw new AppError('Redirecionamento inválido.', 502);
      }
      if (!/^https?:$/.test(urlAtual.protocol)) {
        throw new AppError('Redirecionamento para protocolo não permitido.', 400);
      }
      continue;
    }
    break;
  }
  if (!resposta.ok) {
    throw new AppError(`Download falhou: HTTP ${resposta.status} ${resposta.statusText}`, 502);
  }

  const arrayBuf = await resposta.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  if (buffer.length === 0) throw new AppError('O áudio baixado está vazio.');
  if (buffer.length > 15 * 1024 * 1024) throw new AppError('Áudio muito grande (limite 15 MB).');

  const fileName = `${nome}${ext}`;
  await putFile(`${SOUNDS_PREFIX}/${fileName}`, buffer, `som: adiciona ${fileName} via /baixar`);

  return { fileName, relativePath: `assets/sounds/${fileName}` };
}

/** Grava bytes enviados por upload em src/assets/sounds/<nome>.<ext>. */
export async function saveSoundBytes(buffer, nomeBruto, nomeArquivoOriginal = '') {
  if (!buffer || buffer.length === 0) throw new AppError('Arquivo vazio.');
  if (buffer.length > 15 * 1024 * 1024) throw new AppError('Arquivo muito grande (limite 15 MB).');

  const nome = sanitizarNome(nomeBruto);
  if (!nome) throw new AppError('Nome inválido após normalização.');

  const m = String(nomeArquivoOriginal).toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/);
  const ext = m ? `.${m[1]}` : '.mp3';
  if (!EXT_PERMITIDAS.includes(ext)) {
    throw new AppError(`Extensão ${ext} não suportada. Use: ${EXT_PERMITIDAS.join(', ')}`);
  }

  const fileName = `${nome}${ext}`;
  await putFile(`${SOUNDS_PREFIX}/${fileName}`, buffer, `som: envia ${fileName} via /baixar`);

  return { fileName, relativePath: `assets/sounds/${fileName}` };
}

/** Copia um som existente para um novo id (reaproveita um arquivo já no repo). */
export async function copySound(origemArquivo, nomeDestinoBruto) {
  // Rejeita travessia de diretório e valida o formato do nome de origem.
  const origem = nomeArquivoSeguro(origemArquivo);
  if (!origem) throw new AppError('Arquivo de origem inválido.');

  const nome = sanitizarNome(nomeDestinoBruto);
  if (!nome) throw new AppError('Nome de destino inválido.');

  // A origem precisa existir de fato na pasta de sons (evita ler fora dela).
  const existentes = await listSounds();
  if (!existentes.includes(origem)) {
    throw new AppError(`Som de origem "${origem}" não encontrado.`, 404);
  }

  const bytes = await getSoundBytes(origem);
  if (!bytes) throw new AppError(`Som de origem "${origem}" não encontrado.`, 404);

  const ext = origem.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac)$/);
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
    throw new AppError('Animal inválido: id, name e emoji são obrigatórios.');
  }

  const id = sanitizarNome(animal.id);
  if (!id) throw new AppError('id inválido após normalização.');

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

  // Read-modify-write em animals.json. Como é um único arquivo, duas gravações
  // simultâneas podem conflitar (409 no GitHub). Tentamos de novo relendo o
  // conteúdo mais recente antes de desistir.
  const MAX_TENTATIVAS = 4;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
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
    try {
      await putFile(ANIMALS_PATH, conteudo, `animais: salva "${id}" via /baixar`);
      return { animal: registro, total: semDuplicado.length };
    } catch (err) {
      // Só faz retry em conflito de versão; outros erros sobem na hora.
      if (err instanceof AppError && err.status === 409 && tentativa < MAX_TENTATIVAS) {
        continue;
      }
      throw err;
    }
  }
  throw new AppError('Não foi possível salvar o animal após várias tentativas (conflito).', 409);
}
