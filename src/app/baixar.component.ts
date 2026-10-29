import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Animal, AnimalData, AnimalSugestao, CATALOGO_ANIMAIS } from './animals';
import { AnimalsService } from './animals.service';

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
            🎵 Som e animais do jardim
          </h1>
          <p class="text-sm text-gray-600 mt-1">
            Escolha um animal (ou crie um novo) e adicione o som dele.
          </p>
        </div>

        <form (ngSubmit)="salvar()" class="space-y-4">

          <!-- Seletor de animal -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">Animal</label>
            <select
              name="selecao"
              [(ngModel)]="selecao"
              class="w-full rounded-xl border border-gray-300 px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option *ngFor="let a of animais" [value]="a.id">{{ a.emoji }} {{ a.name }}</option>
              <option value="__novo__">➕ Criar novo animal</option>
            </select>
          </div>

          <!-- Campos extras para animal novo -->
          <div *ngIf="selecao === '__novo__'" class="space-y-3 bg-green-50 border border-green-200 rounded-xl p-3">

            <!-- Escolha do animal disponivel (catalogo) -->
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Qual animal?</label>
              <select
                name="escolhaCatalogo"
                [(ngModel)]="escolhaCatalogo"
                (ngModelChange)="aoEscolherCatalogo()"
                class="w-full rounded-xl border border-gray-300 px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option *ngFor="let s of disponiveis" [value]="s.id">{{ s.emoji }} {{ s.name }}</option>
                <option value="__custom__">✏️ Outro (personalizado)</option>
              </select>
              <p *ngIf="disponiveis.length === 0" class="text-xs text-amber-700 mt-1">
                Todos os animais sugeridos já estão no jardim. Use "personalizado" para criar um diferente.
              </p>
            </div>

            <!-- Campos manuais apenas no modo personalizado -->
            <div *ngIf="escolhaCatalogo === '__custom__'" class="space-y-3">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Nome do animal</label>
                <input
                  type="text"
                  name="novoNome"
                  [(ngModel)]="novoNome"
                  placeholder="Ex.: Camelo"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div class="flex gap-3">
                <div class="w-24">
                  <label class="block text-sm font-bold text-gray-700 mb-1">Emoji</label>
                  <input
                    type="text"
                    name="novoEmoji"
                    [(ngModel)]="novoEmoji"
                    maxlength="4"
                    placeholder="🐫"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-bold text-gray-700 mb-1">Fala / mensagem</label>
                  <input
                    type="text"
                    name="novaMensagem"
                    [(ngModel)]="novaMensagem"
                    placeholder="Ex.: Bléé!"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
            </div>

            <!-- Previa do animal escolhido no catalogo -->
            <div *ngIf="escolhaCatalogo !== '__custom__'" class="flex items-center gap-3 text-sm text-gray-600">
              <span class="text-3xl">{{ novoEmoji }}</span>
              <span>Vai criar <strong>{{ novoNome }}</strong> dizendo "{{ novaMensagem }}".</span>
            </div>
          </div>

          <!-- Link do audio -->
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
            <p class="text-xs text-gray-500 mt-1">
              Link <strong>direto</strong> de áudio. Fontes livres: Pixabay, Mixkit, Freesound (CC0).
            </p>
          </div>

          <button
            type="submit"
            [disabled]="carregando || !url || (selecao === '__novo__' && (!novoNome || !novoEmoji) && escolhaCatalogo === '__custom__') || (selecao === '__novo__' && escolhaCatalogo !== '__custom__' && disponiveis.length === 0)"
            class="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <span *ngIf="!carregando">⬇️ Salvar</span>
            <span *ngIf="carregando">Salvando...</span>
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
export class BaixarComponent implements OnInit {
  animais: Animal[] = [];
  selecao = '';

  // Catalogo de animais ainda nao cadastrados + opcao personalizada
  disponiveis: AnimalSugestao[] = [];
  escolhaCatalogo = '';

  // Campos de animal novo (preenchidos pelo catalogo ou manualmente)
  novoNome = '';
  novoEmoji = '';
  novaMensagem = '';

  url = '';
  carregando = false;
  resultado: Resultado | null = null;

  constructor(private animalsService: AnimalsService) {}

  async ngOnInit() {
    await this.recarregar();
    this.selecao = this.animais[0]?.id ?? '__novo__';
  }

  private async recarregar() {
    this.animais = await this.animalsService.loadAll();
    const idsExistentes = new Set(this.animais.map((a) => a.id));
    this.disponiveis = CATALOGO_ANIMAIS.filter((s) => !idsExistentes.has(s.id));
    // Seleciona a primeira sugestao disponivel (ou personalizado se nao houver).
    this.escolhaCatalogo = this.disponiveis[0]?.id ?? '__custom__';
    this.aoEscolherCatalogo();
  }

  /** Preenche nome/emoji/fala conforme o animal escolhido no catalogo. */
  aoEscolherCatalogo() {
    if (this.escolhaCatalogo === '__custom__') {
      this.novoNome = this.novoEmoji = this.novaMensagem = '';
      return;
    }
    const s = this.disponiveis.find((x) => x.id === this.escolhaCatalogo);
    if (s) {
      this.novoNome = s.name;
      this.novoEmoji = s.emoji;
      this.novaMensagem = s.message;
    }
  }

  private slug(txt: string): string {
    return txt
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async salvar() {
    this.resultado = null;
    this.carregando = true;

    try {
      // Define o animal alvo (existente ou novo) e o id que vira o nome do arquivo.
      let animalData: AnimalData | null = null;
      let id: string;

      if (this.selecao === '__novo__') {
        id = this.slug(this.novoNome);
        if (!id) throw new Error('Informe um nome válido para o novo animal.');
        if (this.animais.some((a) => a.id === id)) {
          throw new Error(`Já existe um animal com o id "${id}". Escolha outro nome.`);
        }
        const pos = this.animalsService.nextPosition(this.animais);
        animalData = {
          id,
          name: this.novoNome.trim(),
          emoji: this.novoEmoji.trim(),
          bgClass: this.animalsService.pickBgClass(this.animais.length),
          soundType: '', // sem som sintetizado; usa o .mp3
          x: pos.x,
          y: pos.y,
          size: 8,
          message: this.novaMensagem.trim() || this.novoNome.trim(),
        };
      } else {
        id = this.selecao;
      }

      // 1. Baixa o som com o id como nome do arquivo.
      const resSom = await this.postJson('/api/download', { url: this.url, nome: id });
      if (!resSom.ok) throw new Error(resSom.error || 'Falha ao baixar o áudio.');

      // 2. Se for animal novo, registra no animals.json e no localStorage.
      if (animalData) {
        const resAnimal = await this.postJson('/api/animal', { animal: animalData });
        if (!resAnimal.ok) throw new Error(resAnimal.error || 'Falha ao salvar o animal.');
        // Persiste tambem localmente para aparecer mesmo sem recarregar o json.
        this.animalsService.saveLocalExtra(animalData);
      }

      this.resultado = {
        tipo: 'ok',
        texto: animalData
          ? `Animal "${animalData.name}" criado e som salvo. Volte ao jardim para vê-lo!`
          : `Som salvo para "${id}". Volte ao jardim e clique no animal para ouvir.`,
      };
      this.url = '';

      // Recarrega a lista (remove o animal recem-criado do catalogo de disponiveis).
      if (animalData) {
        await this.recarregar();
      }
    } catch (err) {
      this.resultado = {
        tipo: 'erro',
        texto:
          (err as Error).message ||
          'Não foi possível concluir. Rode "npm run sound-server" em um terminal. ' +
            '(No GitHub Pages este recurso não funciona, pois não há servidor.)',
      };
    } finally {
      this.carregando = false;
    }
  }

  private async postJson(path: string, body: unknown): Promise<any> {
    try {
      const resp = await fetch(`${SOUND_SERVER}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await resp.json();
    } catch {
      throw new Error(
        'Não foi possível falar com o servidor local. Rode "npm run sound-server" em um terminal.'
      );
    }
  }
}
