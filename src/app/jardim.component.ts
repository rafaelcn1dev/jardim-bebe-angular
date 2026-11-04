import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Animal } from './animals';
import { AnimalsService } from './animals.service';
import { SOUND_SERVER, EH_LOCALHOST } from './sound-server';

@Component({
  selector: 'app-jardim',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      class="relative w-screen overflow-hidden select-none transition-colors duration-1000"
      style="height: 100dvh;"
      [ngClass]="isNight
        ? 'bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-800'
        : 'bg-gradient-to-b from-sky-300 via-sky-100 to-green-200'"
    >

      <!-- Instructions / Header Overlay -->
      <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white/40 text-center pointer-events-none">
        <h1 class="text-xl font-bold text-green-700 drop-shadow-sm flex items-center gap-2">
          {{ isNight ? '🌙 Jardim Encantado dos Bichinhos 🌟' : '🌳 Jardim Encantado dos Bichinhos 🐥' }}
        </h1>
        <p class="text-xs text-gray-600 font-medium">
          {{ isNight ? 'É hora de descansar... explore com calma o jardim adormecido.' : 'Arraste a tela para explorar o jardim e clique nos animais!' }}
        </p>
      </div>

      <!-- Botao alternar dia/noite -->
      <button
        type="button"
        (click)="alternarTema()"
        [title]="isNight ? 'Mudar para o dia' : 'Mudar para a noite'"
        [attr.aria-label]="isNight ? 'Mudar para o dia' : 'Mudar para a noite'"
        class="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-white/40 flex items-center justify-center text-xl hover:scale-110 transition"
      >
        {{ isNight ? '☀️' : '🌙' }}
      </button>

      <!-- Scrollable / Draggable World Container -->
      <div 
        #world
        class="absolute cursor-grab active:cursor-grabbing transition-transform duration-75 ease-out"
        style="transform-origin: 0 0; touch-action: none;"
        [style.width.px]="worldWidth"
        [style.height.px]="worldHeight"
        [style.transform]="'translate(' + posX + 'px, ' + posY + 'px) scale(' + scale + ')'"
        (mousedown)="startDrag($event)"
        (mousemove)="onDrag($event)"
        (mouseup)="endDrag()"
        (mouseleave)="endDrag()"
        (wheel)="onWheel($event)"
        (touchstart)="startTouch($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="endTouch($event)"
      >

      <!-- Faixa repetida 3x (esquerda/centro/direita) para o efeito "globo" -->
      <div *ngFor="let f of faixas" class="absolute top-0" [style.left.px]="f * worldWidth"
        [style.width.px]="worldWidth" [style.height.px]="worldHeight">

        <!-- Background Scenery Elements (Grass, Trees, Lake, Fence) -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden">
          <!-- Sol (dia) -->
          <div *ngIf="!isNight" class="absolute top-10 left-32 w-24 h-24 bg-yellow-300 rounded-full blur-sm opacity-90 animate-pulse"></div>

          <!-- Lua + estrelas (noite) -->
          <ng-container *ngIf="isNight">
            <div class="absolute top-10 left-32 w-24 h-24 bg-slate-100 rounded-full blur-[2px] opacity-80 shadow-[0_0_40px_10px_rgba(226,232,240,0.5)]"></div>
            <div class="absolute top-16 left-[700px] text-2xl opacity-80">⭐</div>
            <div class="absolute top-8 left-[1200px] text-xl opacity-70">✨</div>
            <div class="absolute top-24 left-[1800px] text-2xl opacity-80">⭐</div>
            <div class="absolute top-12 left-[2400px] text-xl opacity-70">✨</div>
            <div class="absolute top-28 left-[500px] text-lg opacity-60">⭐</div>
          </ng-container>

          <!-- Rolling Hills / Background Greenery -->
          <div class="absolute top-[30%] left-0 w-[3000px] h-[700px] rounded-[100%_100%_0_0] transition-colors duration-1000"
            [ngClass]="isNight ? 'bg-gradient-to-b from-emerald-900 to-green-950' : 'bg-gradient-to-b from-emerald-300 to-green-600'"></div>

          <!-- Big Tree 1 (Top Left) -->
          <div class="absolute top-[200px] left-[150px] text-8xl opacity-90">🌳</div>
          <div class="absolute top-[280px] left-[220px] text-7xl opacity-90">🌳</div>

          <!-- Lake for Sapo & Arara -->
          <div class="absolute top-[500px] left-[700px] w-[500px] h-[250px] bg-blue-400 rounded-full border-8 border-blue-200 shadow-inner opacity-90">
            <span class="absolute top-12 left-24 text-4xl animate-bounce">💧</span>
            <span class="absolute top-20 left-64 text-4xl animate-pulse">🌿</span>
          </div>

          <!-- Wooden Fence for Chicken & Pig -->
          <div class="absolute top-[450px] left-[1500px] flex gap-4 text-6xl opacity-90">
            <span>🪵</span><span>🪵</span><span>🪵</span><span>🪵</span><span>🪵</span>
          </div>

          <!-- Flowers scattered around -->
          <div class="absolute top-[350px] left-[400px] text-3xl">🌷</div>
          <div class="absolute top-[600px] left-[550px] text-3xl">🌻</div>
          <div class="absolute top-[400px] left-[1100px] text-3xl">🌼</div>
          <div class="absolute top-[550px] left-[1350px] text-3xl">🌷</div>
          <div class="absolute top-[380px] left-[2000px] text-4xl">🌻</div>
          <div class="absolute top-[620px] left-[2200px] text-3xl">🌸</div>
        </div>

        <!-- Interactive Animals in the Garden -->
        <div 
          *ngFor="let animal of animals"
          class="absolute cursor-grab active:cursor-grabbing flex flex-col items-center group transition-transform duration-300"
          [style.left.px]="animal.x"
          [style.top.px]="animal.y"
          (mousedown)="onAnimalDown(animal, $event.clientX, $event.clientY, $event)"
          (touchstart)="onAnimalDown(animal, $event.touches[0].clientX, $event.touches[0].clientY, $event)"
        >
          <!-- Speech Bubble / Sound Effect Text -->
          <div 
            *ngIf="animal.animState === 'active'"
            class="absolute -top-16 bg-white border-2 border-green-500 text-green-800 px-4 py-1.5 rounded-full shadow-2xl font-black text-lg animate-bounce z-50 whitespace-nowrap flex items-center gap-1"
          >
            <span>{{ animal.message }}</span>
            <span class="text-2xl">{{ animal.emoji }}</span>
          </div>

          <!-- Animal Avatar / Graphic with dynamic animation classes -->
          <div 
            class="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/90 border-4 border-white shadow-2xl flex items-center justify-center text-7xl md:text-8xl transition-all duration-300 transform select-none"
            [ngClass]="{
              'scale-125 rotate-12 bg-yellow-100 ring-8 ring-yellow-300': animal.animState === 'active',
              'hover:scale-105 hover:rotate-3': animal.animState !== 'active'
            }"
          >
            <span class="inline-block transition-transform duration-300"
              [ngClass]="{
                'animate-bounce': animal.id === 'sapo' && animal.animState === 'active',
                'animate-pulse': animal.id === 'galinha' && animal.animState === 'active',
                'animate-spin': animal.id === 'leao' && animal.animState === 'active',
                'scale-110': animal.animState === 'active'
              }"
            >
              {{ animal.emoji }}
            </span>
          </div>

          <!-- Animal Name Badge -->
          <div class="mt-2 bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-bold tracking-wide shadow-md uppercase">
            {{ animal.name }}
          </div>
        </div>

      </div>
      <!-- fim da faixa repetida -->

      </div>

      <!-- Veu noturno: reduz brilho/estimulo a noite (atras da UI) -->
      <div *ngIf="isNight" class="absolute inset-0 z-40 pointer-events-none bg-indigo-950/30"></div>

      <!-- Controles de zoom (respeitam a barra inferior do navegador no celular) -->
      <div class="absolute left-3 z-50 flex flex-col gap-2"
        style="bottom: calc(1rem + env(safe-area-inset-bottom));">
        <button type="button" (click)="zoomIn()" title="Aproximar" aria-label="Aproximar"
          class="w-12 h-12 rounded-full bg-white/90 hover:bg-white text-green-800 font-black text-2xl shadow-lg border border-green-200 flex items-center justify-center transition">+</button>
        <button type="button" (click)="zoomOut()" title="Afastar" aria-label="Afastar"
          class="w-12 h-12 rounded-full bg-white/90 hover:bg-white text-green-800 font-black text-2xl shadow-lg border border-green-200 flex items-center justify-center transition">−</button>
      </div>

      <!-- Acoes (empilhadas, compactas no celular, acima da barra do navegador) -->
      <div class="absolute right-3 z-50 flex flex-col items-end gap-2"
        style="bottom: calc(1rem + env(safe-area-inset-bottom));">
        <a
          routerLink="/baixar"
          class="bg-white/90 hover:bg-white text-green-800 font-bold px-4 py-2.5 rounded-full shadow-lg border border-green-200 text-sm flex items-center gap-2 transition whitespace-nowrap"
        >
          🎵 <span class="hidden sm:inline">Baixar sons</span><span class="sm:hidden">Sons</span>
        </a>
        <button 
          (click)="resetView()"
          class="bg-white/90 hover:bg-white text-green-800 font-bold px-4 py-2.5 rounded-full shadow-lg border border-green-200 text-sm flex items-center gap-2 transition whitespace-nowrap"
        >
          🏠 <span class="hidden sm:inline">Centralizar Jardim</span><span class="sm:hidden">Centralizar</span>
        </button>
      </div>

    </div>
  `
})
export class JardimComponent implements OnInit, AfterViewInit, OnDestroy {
  // Tema noturno: por padrao segue o horario (18h-6h), mas o usuario pode
  // alternar manualmente pelo botao sol/lua.
  isNight = this.calcularNoite();
  private temaManual = false; // true depois que o usuario clica no botao
  private temaTimer: ReturnType<typeof setInterval> | null = null;

  private calcularNoite(): boolean {
    const h = new Date().getHours();
    return h >= 18 || h < 6;
  }

  /** Alterna manualmente entre dia e noite (ignora o horario ate recarregar). */
  alternarTema() {
    this.isNight = !this.isNight;
    this.temaManual = true;
  }

  worldWidth = 3000;
  worldHeight = 1200;
  
  posX = -500;
  posY = -200;

  isDragging = false;
  startX = 0;
  startY = 0;

  audioCtx: AudioContext | null = null;

  // Referências do som que está tocando agora, para poder interrompê-lo.
  private currentAudio: HTMLAudioElement | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  // Duração máxima de qualquer som, em milissegundos.
  private readonly MAX_SOUND_MS = 5000;

  animals: Animal[] = [];

  // Arraste de animal (reposicionar). Diferencia clique de arraste por limiar.
  private animalArrastado: Animal | null = null;
  private animalMoveuPx = 0;
  private dragAnimalStart = { mx: 0, my: 0, ax: 0, ay: 0 };
  private readonly CLICK_THRESHOLD = 6; // px: abaixo disso, considera clique

  // Faixas para o efeito "globo" (conteudo repetido a esquerda/centro/direita).
  readonly faixas = [-1, 0, 1];

  // Zoom do mundo.
  scale = 1;
  private readonly MIN_SCALE = 0.4;
  private readonly MAX_SCALE = 2.5;
  // Estado do gesto de pinca (dois dedos).
  private pinchStartDist = 0;
  private pinchStartScale = 1;

  constructor(private animalsService: AnimalsService) {}

  async ngOnInit() {
    // Carrega base + extras (animals.json + localStorage).
    this.animals = await this.animalsService.loadAll();

    // Reavalia o tema a cada minuto (alterna sozinho ao cruzar 18h/6h),
    // a menos que o usuario tenha escolhido manualmente pelo botao.
    this.temaTimer = setInterval(() => {
      if (!this.temaManual) this.isNight = this.calcularNoite();
    }, 60_000);
  }

  ngOnDestroy() {
    if (this.temaTimer) clearInterval(this.temaTimer);
  }

  ngAfterViewInit() {
    // Center initially nicely
    this.resetView();
  }

  resetView() {
    this.posX = -400;
    this.posY = -100;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  triggerAnimal(animal: Animal) {
    // Interrompe qualquer som em andamento antes de tocar o novo.
    this.stopCurrentSound();

    this.playAnimalSound(animal);

    // Garante que o som não passe de 5 segundos.
    this.stopTimer = setTimeout(() => this.stopCurrentSound(), this.MAX_SOUND_MS);

    // Reseta o estado visual dos demais e ativa só o clicado.
    this.animals.forEach((a) => (a.animState = 'idle'));
    animal.animState = 'active';
  }

  // --- Arraste de animal (reposicionar) ---

  /** Inicia o arraste de um animal (nao deixa o mundo se mover junto). */
  onAnimalDown(animal: Animal, clientX: number, clientY: number, event: Event) {
    event.stopPropagation();
    // Em toque, previne os eventos de mouse sinteticos (evita disparo duplo
    // do som). Mantem o comportamento no desktop com mouse.
    if (event.type === 'touchstart') {
      event.preventDefault();
    }
    this.animalArrastado = animal;
    this.animalMoveuPx = 0;
    this.dragAnimalStart = { mx: clientX, my: clientY, ax: animal.x, ay: animal.y };
  }

  /** Move o animal seguindo o ponteiro; acumula distancia para diferenciar clique. */
  private moverAnimal(clientX: number, clientY: number) {
    if (!this.animalArrastado) return;
    const dxTela = clientX - this.dragAnimalStart.mx;
    const dyTela = clientY - this.dragAnimalStart.my;
    this.animalMoveuPx = Math.max(this.animalMoveuPx, Math.hypot(dxTela, dyTela));
    // Converte o deslocamento de tela para o espaco do mundo (compensa o zoom).
    this.animalArrastado.x = this.dragAnimalStart.ax + dxTela / this.scale;
    this.animalArrastado.y = this.dragAnimalStart.ay + dyTela / this.scale;
  }

  /** Finaliza: se mal se moveu, trata como clique (toca som); senao, salva posicao. */
  private soltarAnimal() {
    const animal = this.animalArrastado;
    if (!animal) return;
    this.animalArrastado = null;

    if (this.animalMoveuPx < this.CLICK_THRESHOLD) {
      this.triggerAnimal(animal);
      return;
    }
    // Foi um arraste real: persiste a nova posicao.
    this.salvarPosicaoAnimal(animal);
  }

  /** Salva a posicao do animal (localStorage sempre; animals.json se servidor on). */
  private async salvarPosicaoAnimal(animal: Animal) {
    const dado = {
      id: animal.id,
      name: animal.name,
      emoji: animal.emoji,
      bgClass: animal.bgClass,
      soundType: animal.soundType,
      x: Math.round(animal.x),
      y: Math.round(animal.y),
      size: animal.size,
      message: animal.message,
    };
    // Persiste localmente (funciona em qualquer ambiente, inclusive publicado).
    this.animalsService.saveLocalExtra(dado);
    // Em desenvolvimento, tambem persiste a posicao no animals.json via servidor
    // local. Em producao NAO fazemos isso de proposito: cada arrasto viraria um
    // commit/redeploy no GitHub. La a posicao fica so no localStorage do navegador.
    if (!EH_LOCALHOST) return;
    try {
      await fetch(`${SOUND_SERVER}/api/animal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animal: dado }),
      });
    } catch {
      // Servidor offline: fica so no localStorage, tudo bem.
    }
  }

  /**
   * Para o som que estiver tocando: tanto o arquivo de áudio quanto os
   * osciladores sintetizados da Web Audio API.
   */
  stopCurrentSound() {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // Oscilador já parado; ignora.
      }
    });
    this.activeOscillators = [];

    // Para a animação visual junto com o som.
    this.animals.forEach((a) => (a.animState = 'idle'));
  }

  /**
   * Toca o arquivo de áudio do animal (src/assets/sounds/<id>.mp3).
   * Se o arquivo não existir ou falhar ao tocar, cai no som sintetizado
   * (quando o animal tem um soundType). Animais novos nao tem soundType,
   * entao dependem do arquivo .mp3.
   */
  playAnimalSound(animal: Animal) {
    // 1) Caminho normal (assets servidos pelo build / ng serve).
    const principal = new URL(`assets/sounds/${animal.id}.mp3`, document.baseURI).href;

    const sintetizado = () => {
      if (animal.soundType) {
        this.initAudio();
        this.playSound(animal.soundType);
      }
    };

    // Se o arquivo normal falhar (ex.: som recem-criado que o build/deploy ainda
    // nao publicou), tenta o servidor de sons: em dev é o local (porta 4300),
    // em produção é o backend no Render (que faz proxy do GitHub). Se tambem
    // falhar, cai no som sintetizado.
    this.tocarArquivo(principal, () => {
      this.tocarArquivo(`${SOUND_SERVER}/sounds/${animal.id}.mp3`, sintetizado);
    });
  }

  /** Tenta tocar uma URL de audio; chama onFail() se nao conseguir. */
  private tocarArquivo(src: string, onFail: () => void) {
    const audio = new Audio(src);
    this.currentAudio = audio;
    audio.play().catch((err) => {
      console.warn(`[jardim] Nao consegui tocar ${src}:`, err?.message || err);
      if (this.currentAudio === audio) this.currentAudio = null;
      onFail();
    });
  }

  playSound(type: string) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (type === 'meow') {
      // Meow sound simulation using oscillator
      const osc = ctx.createOscillator();
      this.activeOscillators.push(osc);
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.7);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } 
    else if (type === 'bark') {
      // Bark sound simulation
      const osc = ctx.createOscillator();
      this.activeOscillators.push(osc);
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
    else if (type === 'cluck') {
      // Chicken cluck (piping tones)
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        this.activeOscillators.push(osc);
        const gain = ctx.createGain();
        osc.type = 'sine';
        const startTime = now + i * 0.12;
        osc.frequency.setValueAtTime(600, startTime);
        osc.frequency.exponentialRampToValueAtTime(800, startTime + 0.08);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.1);
      }
    }
    else if (type === 'moo') {
      // Cow moo (deep low frequency)
      const osc = ctx.createOscillator();
      this.activeOscillators.push(osc);
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.8);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    }
    else if (type === 'croak') {
      // Frog croak (ribit)
      const osc = ctx.createOscillator();
      this.activeOscillators.push(osc);
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
    else if (type === 'roar' || type === 'tiger') {
      // Lion / Tiger roar (low rumble)
      const osc = ctx.createOscillator();
      this.activeOscillators.push(osc);
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.3);
      osc.frequency.linearRampToValueAtTime(80, now + 0.7);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    }
    else if (type === 'trumpet') {
      // Elephant trumpet
      const osc = ctx.createOscillator();
      this.activeOscillators.push(osc);
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(500, now + 0.2);
      osc.frequency.linearRampToValueAtTime(350, now + 0.6);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    }
    else if (type === 'bird') {
      // Bird tweet (high frequency chirp)
      const osc = ctx.createOscillator();
      this.activeOscillators.push(osc);
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  // --- Pan do mundo (com wrap horizontal estilo globo) ---

  startDrag(e: MouseEvent) {
    // Se um animal esta sendo arrastado, nao inicia o pan do mundo.
    if (this.animalArrastado) return;
    this.isDragging = true;
    this.startX = e.clientX - this.posX;
    this.startY = e.clientY - this.posY;
  }

  onDrag(e: MouseEvent) {
    if (this.animalArrastado) {
      this.moverAnimal(e.clientX, e.clientY);
      return;
    }
    if (!this.isDragging) return;
    this.posX = this.wrapX(e.clientX - this.startX);
    this.posY = e.clientY - this.startY;
  }

  endDrag() {
    if (this.animalArrastado) {
      this.soltarAnimal();
      return;
    }
    this.isDragging = false;
  }

  startTouch(e: TouchEvent) {
    if (e.touches.length === 2) {
      // Inicia pinca: interrompe qualquer pan/arraste em andamento.
      this.isDragging = false;
      this.animalArrastado = null;
      this.pinchStartDist = this.distanciaEntreToques(e);
      this.pinchStartScale = this.scale;
      return;
    }
    if (this.animalArrastado) return;
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.startX = e.touches[0].clientX - this.posX;
      this.startY = e.touches[0].clientY - this.posY;
    }
  }

  onTouchMove(e: TouchEvent) {
    // Pinca com dois dedos -> zoom.
    if (e.touches.length === 2 && this.pinchStartDist > 0) {
      e.preventDefault();
      const dist = this.distanciaEntreToques(e);
      const razao = dist / this.pinchStartDist;
      this.aplicarZoom(this.pinchStartScale * razao);
      return;
    }
    if (this.animalArrastado && e.touches.length === 1) {
      this.moverAnimal(e.touches[0].clientX, e.touches[0].clientY);
      return;
    }
    if (!this.isDragging || e.touches.length !== 1) return;
    this.posX = this.wrapX(e.touches[0].clientX - this.startX);
    this.posY = e.touches[0].clientY - this.startY;
  }

  endTouch(e: TouchEvent) {
    // Ao soltar um dos dedos da pinca, encerra o gesto de zoom.
    if (e.touches.length < 2) {
      this.pinchStartDist = 0;
    }
    this.endDrag();
  }

  private distanciaEntreToques(e: TouchEvent): number {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  /**
   * Normaliza o deslocamento horizontal para dar a "volta ao globo": mantem
   * posX dentro de (-worldWidth, 0], e as 3 faixas repetidas preenchem as bordas.
   */
  private wrapX(x: number): number {
    const w = this.worldWidth;
    // Resultado em (-w, 0]
    return ((x % w) - w) % w;
  }

  // --- Zoom ---

  private aplicarZoom(novo: number) {
    this.scale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, novo));
  }

  zoomIn() {
    this.aplicarZoom(this.scale * 1.2);
  }

  zoomOut() {
    this.aplicarZoom(this.scale / 1.2);
  }

  /** Zoom com a roda do mouse (desktop). */
  onWheel(e: WheelEvent) {
    e.preventDefault();
    const fator = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.aplicarZoom(this.scale * fator);
  }
}
