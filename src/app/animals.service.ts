import { Injectable } from '@angular/core';
import { Animal, AnimalData, BASE_ANIMALS, BG_CLASSES } from './animals';

const LOCAL_KEY = 'jardim.animais-extras';
const EXTRAS_URL = 'assets/animals.json';

@Injectable({ providedIn: 'root' })
export class AnimalsService {
  /**
   * Monta a lista completa de animais:
   *  base (codigo) + extras persistidos (assets/animals.json) + extras locais
   *  (localStorage, so deste navegador). Dedup por id, com a base tendo
   *  prioridade e os extras locais sobrescrevendo os do json.
   */
  async loadAll(): Promise<Animal[]> {
    const fromJson = await this.fetchJsonExtras();
    const fromLocal = this.readLocalExtras();

    const byId = new Map<string, AnimalData>();
    for (const a of BASE_ANIMALS) byId.set(a.id, a);
    for (const a of fromJson) byId.set(a.id, a);
    for (const a of fromLocal) byId.set(a.id, a);

    return [...byId.values()].map((a) => ({ ...a, animState: 'idle' }));
  }

  private async fetchJsonExtras(): Promise<AnimalData[]> {
    try {
      const resp = await fetch(EXTRAS_URL, { cache: 'no-cache' });
      if (!resp.ok) return [];
      const data = await resp.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  private readLocalExtras(): AnimalData[] {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /** Salva um animal extra no localStorage (persistencia que funciona no Pages). */
  saveLocalExtra(animal: AnimalData): void {
    const extras = this.readLocalExtras().filter((a) => a.id !== animal.id);
    extras.push(animal);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(extras));
  }

  /** Gera uma posicao distribuida para um novo animal, evitando colisao grosseira. */
  nextPosition(existing: { x: number; y: number }[]): { x: number; y: number } {
    // Grade simples dentro do mundo (3000 x 1200), com margem.
    const cols = 6;
    const marginX = 300;
    const marginY = 250;
    const stepX = (3000 - marginX * 2) / (cols - 1);
    const stepY = 220;
    for (let i = 0; i < 60; i++) {
      const x = Math.round(marginX + (i % cols) * stepX);
      const y = Math.round(marginY + Math.floor(i / cols) * stepY);
      const colide = existing.some((p) => Math.abs(p.x - x) < 180 && Math.abs(p.y - y) < 180);
      if (!colide) return { x, y };
    }
    // Fallback aleatorio
    return {
      x: Math.round(marginX + Math.random() * (3000 - marginX * 2)),
      y: Math.round(marginY + Math.random() * (1200 - marginY * 2)),
    };
  }

  pickBgClass(index: number): string {
    return BG_CLASSES[index % BG_CLASSES.length];
  }
}
