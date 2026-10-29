import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Porta do servidor local (scripts/sound-server.mjs)
const SOUND_SERVER = 'http://localhost:4300';

interface Resultado {
  tipo: 'ok' | 'erro';
  texto: string;
}

@Component({
  selector: 'app-baixar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen w-full bg-gradient-to-b from-sky-200 to-green-200 flex items-center justify-center p-4">
      <div class="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-8">

        <div class="text-center mb-6">
          <h1 class="text-2xl font-black text-green-700 flex items-center justify-center gap-2">
            🎵 Baixar som de animal
          </h1>
          <p class="text-sm text-gray-600 mt-1">
            Cole um link <strong>direto</strong> de áudio (.mp3) e escolha o nome do animal.
          </p>
        </div>

        <form (ngSubmit)="baixar()" class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">Link do áudio (.mp3)</label>
            <input
              type="url"
              name="url"
              [(ngModel)]="url"
              required
              placeholder="https://.../som.mp3"
              class="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">Nome do animal</label>
            <input
              type="text"
              name="nome"
              [(ngModel)]="nome"
              required
              placeholder="gato, cachorro, vaca..."
              class="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <p class="text-xs text-gray-500 mt-1">
              Vira o arquivo <code>assets/sounds/&lt;nome&gt;.mp3</code>. Use o id do animal:
              gato, cachorro, galinha, vaca, sapo, leao, elefante, tigre, arara.
            </p>
          </div>

          <button
            type="submit"
            [disabled]="carregando || !url || !nome"
            class="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <span *ngIf="!carregando">⬇️ Baixar e salvar</span>
            <span *ngIf="carregando">Baixando...</span>
          </button>
        </form>

        <div
          *ngIf="resultado"
          class="mt-4 rounded-xl px-4 py-3 text-sm font-medium"
          [ngClass]="{
            'bg-green-100 text-green-800 border border-green-300': resultado.tipo === 'ok',
            'bg-red-100 text-red-800 border border-red-300': resultado.tipo === 'erro'
          }"
        >
          {{ resultado.texto }}
        </div>

        <div class="mt-6 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1">
          <p class="font-bold text-gray-600">Como usar:</p>
          <p>1. Em um terminal, rode <code>npm run sound-server</code> (deixe aberto).</p>
          <p>2. Em outro, rode <code>npm start</code> e abra esta página.</p>
          <p>3. Fontes de áudio livres: Pixabay, Mixkit, Freesound (CC0).</p>
          <p class="text-amber-700">
            Links do YouTube não são aceitos (Termos de Serviço + direitos autorais).
          </p>
        </div>

        <div class="mt-6 text-center">
          <a routerLink="/" class="text-green-700 font-bold text-sm hover:underline">
            ← Voltar ao jardim
          </a>
        </div>
      </div>
    </div>
  `,
})
export class BaixarComponent {
  url = '';
  nome = '';
  carregando = false;
  resultado: Resultado | null = null;

  async baixar() {
    this.resultado = null;
    this.carregando = true;

    try {
      const resp = await fetch(`${SOUND_SERVER}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: this.url, nome: this.nome }),
      });

      const data = await resp.json();

      if (resp.ok && data.ok) {
        this.resultado = {
          tipo: 'ok',
          texto: `Salvo em ${data.relativePath}. Volte ao jardim e clique no animal para ouvir.`,
        };
      } else {
        this.resultado = {
          tipo: 'erro',
          texto: data.error || 'Falha ao baixar o áudio.',
        };
      }
    } catch {
      this.resultado = {
        tipo: 'erro',
        texto:
          'Não foi possível falar com o servidor local. Rode "npm run sound-server" em um terminal. ' +
          '(No GitHub Pages este recurso não funciona, pois não há servidor.)',
      };
    } finally {
      this.carregando = false;
    }
  }
}
