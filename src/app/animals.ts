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
