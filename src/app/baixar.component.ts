import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Animal, AnimalData, AnimalSugestao, CATALOGO_ANIMAIS } from './animals';
import { AnimalsService } from './animals.service';
import { SOUND_SERVER, EH_LOCALHOST } from './sound-server';

interface Resultado {
  tipo: 'ok' | 'erro';
  texto: string;
}

type Origem = 'link' | 'upload' | 'padrao';

@Component({
  selector: 'app-baixar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div
      class="w-full bg-gradient-to-b from-sky-200 to-green-200 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      style="height: 100dvh;"
    >
      <div class="w-full max-w-lg bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8 my-auto">

        <div class="text-center mb-6">
          <h1 class="text-2xl font-black text-green-700 flex items-center justify-center gap-2">
            🎵 Som e animais do jardim
          </h1>
          <p class="text-sm text-gray-600 mt-1">
            Crie um novo animal ou edite o som e a fala de um existente.
          </p>
        </div>

        <!-- Produção: backend acordando/indisponível (plano free hiberna) -->
        <div *ngIf="servidorOnline === false && ehProducao"
          class="mb-4 rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-800">
          <p class="font-bold">Serviço de sons indisponível no momento</p>
          <p class="mt-1">
            O servidor que salva os sons pode estar "acordando" (o plano gratuito hiberna
            após um tempo sem uso) ou passando por um deploy. Aguarde alguns segundos e
            clique em
            <button type="button" (click)="verificarServidor()" class="font-bold underline">tentar novamente</button>.
          </p>
          <p class="mt-2">
            <a routerLink="/" class="font-bold underline">← Voltar ao jardim</a>
          </p>
        </div>

        <!-- Servidor offline em desenvolvimento local -->
        <div *ngIf="servidorOnline === false && !ehProducao"
          class="mb-4 rounded-xl bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-800">
          <p class="font-bold">Servidor de sons offline</p>
          <p class="mt-1">
            Pare o terminal atual e rode <code>npm start</code> de novo — ele sobe o app
            <strong>e</strong> o servidor de sons juntos. Depois clique em
            <button type="button" (click)="verificarServidor()" class="font-bold underline">verificar novamente</button>.
          </p>
        </div>
        <div *ngIf="servidorOnline === null"
          class="mb-4 rounded-xl bg-gray-50 border border-gray-200 px-4 py-2 text-xs text-gray-500">
          {{ ehProducao ? 'Conectando ao servidor de sons (pode levar alguns segundos no primeiro acesso)...' : 'Verificando servidor de sons...' }}
        </div>

        <!-- Produção: aviso de que mudanças passam por um deploy -->
        <div *ngIf="servidorOnline === true && ehProducao"
          class="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
          Dica: sons e animais criados aqui são salvos no repositório e publicados
          automaticamente. A atualização completa no jardim pode levar 1–2 minutos
          (tempo do novo deploy).
        </div>

        <form (ngSubmit)="salvar()" class="space-y-4">

          <!-- Seletor de animal -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">Animal</label>
            <select
              name="selecao"
              [(ngModel)]="selecao"
              (ngModelChange)="aoTrocarSelecao()"
              class="w-full rounded-xl border border-gray-300 px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="__novo__">➕ Criar novo animal</option>
              <option *ngFor="let a of animais" [value]="a.id">✏️ {{ a.emoji }} {{ a.name }}</option>
            </select>
          </div>

          <!-- Campos extras para animal NOVO -->
          <div *ngIf="selecao === '__novo__'" class="space-y-3 bg-green-50 border border-green-200 rounded-xl p-3">
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

            <div *ngIf="escolhaCatalogo === '__custom__'" class="space-y-3">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">Nome do animal</label>
                <input type="text" name="novoNome" [(ngModel)]="novoNome" placeholder="Ex.: Camelo"
                  class="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div class="flex gap-3">
                <div class="w-24">
                  <label class="block text-sm font-bold text-gray-700 mb-1">Emoji</label>
                  <input type="text" name="novoEmoji" [(ngModel)]="novoEmoji" maxlength="4" placeholder="🐫"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2 text-center text-2xl focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-bold text-gray-700 mb-1">Fala / mensagem</label>
                  <input type="text" name="novaMensagem" [(ngModel)]="novaMensagem" placeholder="Ex.: Bléé!"
                    class="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>
            </div>

            <div *ngIf="escolhaCatalogo !== '__custom__'" class="flex items-center gap-3 text-sm text-gray-600">
              <span class="text-3xl">{{ novoEmoji }}</span>
              <span>Vai criar <strong>{{ novoNome }}</strong> dizendo "{{ novaMensagem }}".</span>
            </div>
          </div>

          <!-- Edicao de animal EXISTENTE: trocar a fala -->
          <div *ngIf="selecao !== '__novo__'" class="space-y-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">Fala / mensagem</label>
              <input type="text" name="editMensagem" [(ngModel)]="editMensagem" placeholder="Ex.: Muuu!"
                class="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          <!-- Origem do som -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1">Som do animal</label>
            <div class="grid grid-cols-3 gap-2 mb-2">
              <button type="button" (click)="selecionarOrigem('link')"
                [ngClass]="origem === 'link' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'"
                class="rounded-xl px-2 py-1.5 text-sm font-bold transition">🔗 Link</button>
              <button type="button" (click)="selecionarOrigem('upload')"
                [ngClass]="origem === 'upload' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'"
                class="rounded-xl px-2 py-1.5 text-sm font-bold transition">📁 Upload</button>
              <button type="button" (click)="selecionarOrigem('padrao')"
                [ngClass]="origem === 'padrao' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'"
                class="rounded-xl px-2 py-1.5 text-sm font-bold transition">🔈 Padrão</button>
            </div>

            <!-- Modo link -->
            <div *ngIf="origem === 'link'">
              <input type="url" name="url" [(ngModel)]="url" placeholder="https://.../som.mp3"
                class="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
              <p class="text-xs text-gray-500 mt-1">Link <strong>direto</strong> de áudio (Pixabay, Mixkit, Freesound CC0).</p>
            </div>

            <!-- Modo upload -->
            <div *ngIf="origem === 'upload'">
              <input type="file" name="arquivo" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" (change)="aoSelecionarArquivo($event)"
                class="w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-green-100 file:px-3 file:py-1.5 file:text-green-800 file:font-bold hover:file:bg-green-200" />
              <p class="text-xs text-gray-500 mt-1">Arquivo <code>.mp3</code>/<code>.wav</code> do seu computador (até 15 MB).</p>
            </div>

            <!-- Modo som padrao (reaproveita um arquivo existente) -->
            <div *ngIf="origem === 'padrao'">
              <div class="flex gap-2">
                <select name="somPadrao" [(ngModel)]="somPadrao"
                  class="flex-1 rounded-xl border border-gray-300 px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option *ngIf="selecao !== '__novo__'" value="">— manter o som atual —</option>
                  <option *ngFor="let s of sonsDisponiveis" [value]="s">{{ s }}</option>
                </select>
                <button type="button" (click)="ouvirPreview()" [disabled]="!somPadrao"
                  title="Ouvir"
                  class="rounded-xl bg-green-100 text-green-800 px-3 py-2 font-bold disabled:opacity-40">▶️</button>
                <button type="button" (click)="recarregarSons()" title="Atualizar lista"
                  class="rounded-xl bg-gray-100 text-gray-700 px-3 py-2 font-bold">🔄</button>
              </div>
              <p *ngIf="servidorOnline && sonsDisponiveis.length === 0" class="text-xs text-amber-700 mt-1">
                Nenhum som na pasta ainda. Baixe ou envie um primeiro.
              </p>
              <p *ngIf="servidorOnline && sonsDisponiveis.length > 0" class="text-xs text-gray-500 mt-1">
                {{ sonsDisponiveis.length }} som(ns) disponível(is). Clique ▶️ para ouvir.
              </p>
            </div>
          </div>

          <button type="submit" [disabled]="botaoDesabilitado()"
            class="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
            <span *ngIf="!carregando">{{ selecao === '__novo__' ? '➕ Criar' : '💾 Salvar alterações' }}</span>
            <span *ngIf="carregando">Salvando...</span>
          </button>
        </form>

        <div *ngIf="resultado" class="mt-4 rounded-xl px-4 py-3 text-sm font-medium"
          [ngClass]="{
            'bg-green-100 text-green-800 border border-green-300': resultado.tipo === 'ok',
            'bg-red-100 text-red-800 border border-red-300': resultado.tipo === 'erro'
          }">
          {{ resultado.texto }}
        </div>

        <div class="mt-6 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1">
          <p class="font-bold text-gray-600">Como usar:</p>
          <p *ngIf="!ehProducao">No computador: rode <code>npm start</code> — ele já inicia o app e o servidor de sons juntos.</p>
          <p *ngIf="ehProducao">No site publicado: escolha o animal e o som; ao salvar, a mudança é publicada automaticamente (leva 1–2 min).</p>
          <p class="text-amber-700">Links do YouTube não são aceitos (Termos de Serviço + direitos autorais).</p>
        </div>

        <div class="mt-6 text-center">
          <a routerLink="/" class="text-green-700 font-bold text-sm hover:underline">← Voltar ao jardim</a>
        </div>
      </div>
    </div>
  `,
})
export class BaixarComponent implements OnInit {
  animais: Animal[] = [];
  selecao = '__novo__';

  // Catalogo de animais ainda nao cadastrados + opcao personalizada
  disponiveis: AnimalSugestao[] = [];
  escolhaCatalogo = '';

  // Campos de animal novo
  novoNome = '';
  novoEmoji = '';
  novaMensagem = '';

  // Edicao de animal existente
  editMensagem = '';

  // Origem do som
  origem: Origem = 'link';
  url = '';
  arquivo: File | null = null;
  somPadrao = '';
  sonsDisponiveis: string[] = [];

  // Estado do servidor local: null = verificando, true/false = resultado.
  servidorOnline: boolean | null = null;

  // true quando acessado pelo site publicado (nao localhost).
  readonly ehProducao = !EH_LOCALHOST;

  carregando = false;
  resultado: Resultado | null = null;

  constructor(private animalsService: AnimalsService) {}

  async ngOnInit() {
    await this.recarregar();
    await this.verificarServidor();
  }

  /** Checa UMA vez se o servidor de sons esta no ar e, se estiver, lista os sons. */
  async verificarServidor() {
    this.servidorOnline = null;
    try {
      const resp = await fetch(`${SOUND_SERVER}/api/sounds`, { signal: AbortSignal.timeout(2500) });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      this.sonsDisponiveis = Array.isArray(data.sons) ? data.sons : [];
      this.servidorOnline = true;
    } catch {
      this.servidorOnline = false;
      this.sonsDisponiveis = [];
    }
  }

  /** Troca a origem do som. */
  selecionarOrigem(o: Origem) {
    this.origem = o;
  }

  /** Reverifica servidor + recarrega a lista de sons (botao 🔄). */
  async recarregarSons() {
    await this.verificarServidor();
  }

  private async recarregar() {
    this.animais = await this.animalsService.loadAll();
    const idsExistentes = new Set(this.animais.map((a) => a.id));
    this.disponiveis = CATALOGO_ANIMAIS.filter((s) => !idsExistentes.has(s.id));
    this.escolhaCatalogo = this.disponiveis[0]?.id ?? '__custom__';
    this.aoEscolherCatalogo();
    this.aoTrocarSelecao();
  }

  aoSelecionarArquivo(event: Event) {
    const input = event.target as HTMLInputElement;
    this.arquivo = input.files && input.files.length ? input.files[0] : null;
  }

  /** Ao trocar o animal selecionado: se for existente, carrega a fala atual. */
  aoTrocarSelecao() {
    if (this.selecao === '__novo__') {
      this.editMensagem = '';
      if (this.origem === 'padrao') this.somPadrao = '';
      return;
    }
    const a = this.animais.find((x) => x.id === this.selecao);
    this.editMensagem = a?.message ?? '';
    // Ao editar, por padrao mantem o som atual (opcao vazia no modo padrao).
    this.somPadrao = '';
  }

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

  ouvirPreview() {
    if (!this.somPadrao) return;
    const src = `${SOUND_SERVER}/sounds/${this.somPadrao}`;
    new Audio(src).play().catch(() => {
      this.resultado = {
        tipo: 'erro',
        texto: 'Não consegui tocar o som. O servidor de sons está no ar? (rode "npm start")',
      };
    });
  }

  botaoDesabilitado(): boolean {
    if (this.carregando) return true;
    if (this.servidorOnline === false) return true;

    const editando = this.selecao !== '__novo__';

    // Som obrigatorio no modo novo; opcional ao editar (pode manter o atual).
    let temSom = false;
    if (this.origem === 'link') temSom = !!this.url;
    else if (this.origem === 'upload') temSom = !!this.arquivo;
    else temSom = !!this.somPadrao; // padrao
    if (!editando && !temSom) return true;

    if (this.selecao === '__novo__') {
      if (this.escolhaCatalogo === '__custom__') return !this.novoNome || !this.novoEmoji;
      return this.disponiveis.length === 0;
    }
    return false;
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

  /** Indica se o usuario forneceu um som nesta operacao. */
  private temSomInformado(): boolean {
    if (this.origem === 'link') return !!this.url;
    if (this.origem === 'upload') return !!this.arquivo;
    return !!this.somPadrao;
  }

  async salvar() {
    this.resultado = null;
    this.carregando = true;

    try {
      const editando = this.selecao !== '__novo__';
      let animalData: AnimalData | null = null;
      let id: string;

      if (editando) {
        id = this.selecao;
      } else {
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
          soundType: '',
          x: pos.x,
          y: pos.y,
          size: 8,
          message: this.novaMensagem.trim() || this.novoNome.trim(),
        };
      }

      // 1. Som (obrigatorio ao criar; opcional ao editar).
      if (!editando || this.temSomInformado()) {
        await this.aplicarSom(id);
      }

      // 2. Grava/atualiza o animal.
      if (editando) {
        const base = this.animais.find((a) => a.id === id)!;
        const atualizado: AnimalData = {
          id: base.id,
          name: base.name,
          emoji: base.emoji,
          bgClass: base.bgClass,
          soundType: base.soundType,
          x: base.x,
          y: base.y,
          size: base.size,
          message: this.editMensagem.trim() || base.message,
        };
        const resAnimal = await this.postJson('/api/animal', { animal: atualizado });
        if (!resAnimal.ok) throw new Error(resAnimal.error || 'Falha ao salvar o animal.');
        this.animalsService.saveLocalExtra(atualizado);
      } else if (animalData) {
        const resAnimal = await this.postJson('/api/animal', { animal: animalData });
        if (!resAnimal.ok) throw new Error(resAnimal.error || 'Falha ao salvar o animal.');
        this.animalsService.saveLocalExtra(animalData);
      }

      this.resultado = {
        tipo: 'ok',
        texto: editando
          ? `Animal atualizado. Volte ao jardim para ver/ouvir as mudanças.`
          : `Animal "${animalData!.name}" criado e som salvo. Volte ao jardim para vê-lo!`,
      };

      this.url = '';
      this.arquivo = null;
      this.somPadrao = '';
      await this.recarregar();
      this.sonsDisponiveis = await this.animalsService.listSounds(SOUND_SERVER);
    } catch (err) {
      this.resultado = {
        tipo: 'erro',
        texto:
          (err as Error).message ||
          'Não foi possível concluir. Rode "npm start" (ele já sobe o servidor de sons).',
      };
    } finally {
      this.carregando = false;
    }
  }

  /** Aplica o som ao id do animal conforme a origem escolhida. */
  private async aplicarSom(id: string) {
    let res: any;
    if (this.origem === 'upload') {
      if (!this.arquivo) throw new Error('Selecione um arquivo de áudio.');
      res = await this.uploadArquivo(id, this.arquivo);
    } else if (this.origem === 'padrao') {
      if (!this.somPadrao) throw new Error('Escolha um som padrão.');
      res = await this.postJson('/api/copy', { origem: this.somPadrao, nome: id });
    } else {
      res = await this.postJson('/api/download', { url: this.url, nome: id });
    }
    if (!res.ok) throw new Error(res.error || 'Falha ao obter o áudio.');
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
        'Não foi possível falar com o servidor local. Rode "npm start" para iniciá-lo junto com o app.'
      );
    }
  }

  private async uploadArquivo(id: string, file: File): Promise<any> {
    try {
      const params = new URLSearchParams({ nome: id, arquivo: file.name });
      const resp = await fetch(`${SOUND_SERVER}/api/upload?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      return await resp.json();
    } catch {
      throw new Error(
        'Não foi possível falar com o servidor local. Rode "npm start" para iniciá-lo junto com o app.'
      );
    }
  }
}
