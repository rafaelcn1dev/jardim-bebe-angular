export interface Animal {
  id: string;
  name: string;
  emoji: string;
  bgClass: string;
  soundType: string;
  x: number;
  y: number;
  size: number;
  animState: string;
  message: string;
}

/**
 * Tipo de dado persistido (sem o estado de UI `animState`, que e sempre
 * recalculado em runtime). Usado tanto no animals.json quanto no localStorage.
 */
export interface AnimalData {
  id: string;
  name: string;
  emoji: string;
  bgClass: string;
  soundType: string;
  x: number;
  y: number;
  size: number;
  message: string;
}

/** Lista base dos animais que sempre existem no jardim. */
export const BASE_ANIMALS: AnimalData[] = [
  { id: 'gato', name: 'Gato', emoji: '🐱', bgClass: 'bg-orange-100', soundType: 'meow', x: 400, y: 350, size: 8, message: 'Miau! Miau!' },
  { id: 'cachorro', name: 'Cachorro', emoji: '🐶', bgClass: 'bg-amber-100', soundType: 'bark', x: 850, y: 400, size: 8, message: 'Au! Au!' },
  { id: 'galinha', name: 'Galinha', emoji: '🐔', bgClass: 'bg-yellow-100', soundType: 'cluck', x: 1300, y: 450, size: 8, message: 'Có-có-ró-có!' },
  { id: 'vaca', name: 'Vaca', emoji: '🐮', bgClass: 'bg-stone-100', soundType: 'moo', x: 1750, y: 380, size: 8, message: 'Muuu!' },
  { id: 'sapo', name: 'Sapo', emoji: '🐸', bgClass: 'bg-emerald-100', soundType: 'croak', x: 650, y: 600, size: 8, message: 'Ribit! Ribit!' },
  { id: 'leao', name: 'Leão', emoji: '🦁', bgClass: 'bg-amber-200', soundType: 'roar', x: 2150, y: 350, size: 8, message: 'Roar! Rawr!' },
  { id: 'elefante', name: 'Elefante', emoji: '🐘', bgClass: 'bg-slate-200', soundType: 'trumpet', x: 2550, y: 420, size: 8, message: 'Fruuuu!' },
  { id: 'tigre', name: 'Tigre', emoji: '🐯', bgClass: 'bg-orange-200', soundType: 'tiger', x: 1100, y: 620, size: 8, message: 'Grrr!' },
  { id: 'arara', name: 'Arara', emoji: '🦜', bgClass: 'bg-red-100', soundType: 'bird', x: 300, y: 220, size: 8, message: 'Squawk! Lindo!' },
];

/** Classes de fundo disponiveis para novos animais (ciclo simples). */
export const BG_CLASSES = [
  'bg-pink-100', 'bg-purple-100', 'bg-indigo-100', 'bg-teal-100',
  'bg-lime-100', 'bg-cyan-100', 'bg-rose-100', 'bg-fuchsia-100',
];

/** Sugestao de animal para criar um novo (id, nome, emoji e fala prontos). */
export interface AnimalSugestao {
  id: string;
  name: string;
  emoji: string;
  message: string;
}

/**
 * Catalogo de animais sugeridos para criar novos no jardim. A pagina /baixar
 * mostra apenas os que ainda nao foram cadastrados.
 */
export const CATALOGO_ANIMAIS: AnimalSugestao[] = [
  { id: 'cavalo', name: 'Cavalo', emoji: '🐴', message: 'Iiihaa!' },
  { id: 'porco', name: 'Porco', emoji: '🐷', message: 'Oinc! Oinc!' },
  { id: 'ovelha', name: 'Ovelha', emoji: '🐑', message: 'Béee!' },
  { id: 'pato', name: 'Pato', emoji: '🦆', message: 'Quá! Quá!' },
  { id: 'macaco', name: 'Macaco', emoji: '🐵', message: 'Uh uh ah ah!' },
  { id: 'coelho', name: 'Coelho', emoji: '🐰', message: 'Plim plim!' },
  { id: 'urso', name: 'Urso', emoji: '🐻', message: 'Grrrão!' },
  { id: 'panda', name: 'Panda', emoji: '🐼', message: 'Nhom nhom!' },
  { id: 'coruja', name: 'Coruja', emoji: '🦉', message: 'Uhú! Uhú!' },
  { id: 'pinguim', name: 'Pinguim', emoji: '🐧', message: 'Pru pru!' },
  { id: 'abelha', name: 'Abelha', emoji: '🐝', message: 'Bzzzz!' },
  { id: 'cobra', name: 'Cobra', emoji: '🐍', message: 'Sssss!' },
  { id: 'peixe', name: 'Peixe', emoji: '🐟', message: 'Blub blub!' },
  { id: 'golfinho', name: 'Golfinho', emoji: '🐬', message: 'Iii iii!' },
  { id: 'baleia', name: 'Baleia', emoji: '🐳', message: 'Uuuuu!' },
  { id: 'cabra', name: 'Cabra', emoji: '🐐', message: 'Mééé!' },
  { id: 'rato', name: 'Rato', emoji: '🐭', message: 'Squick!' },
  { id: 'galo', name: 'Galo', emoji: '🐓', message: 'Có-có-ri-có!' },
  { id: 'peru', name: 'Peru', emoji: '🦃', message: 'Glu glu!' },
  { id: 'raposa', name: 'Raposa', emoji: '🦊', message: 'Ring-ding!' },
  { id: 'lobo', name: 'Lobo', emoji: '🐺', message: 'Auuuuu!' },
  { id: 'unicornio', name: 'Unicórnio', emoji: '🦄', message: 'Iiihaa mágico!' },
  { id: 'girafa', name: 'Girafa', emoji: '🦒', message: 'Hum hum!' },
  { id: 'zebra', name: 'Zebra', emoji: '🦓', message: 'Nhii!' },
];
