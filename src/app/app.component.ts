import { Component, ElementRef, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Animal {
  id: string;
  name: string;
  emoji: string;
  bgClass: string;
  soundType: string;
  x: number; // percentage in the big world
  y: number; // percentage
  size: number; // rem or px
  animState: string;
  message: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-green-200 select-none">
      
      <!-- Instructions / Header Overlay -->
      <div class="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white/40 text-center pointer-events-none">
        <h1 class="text-xl font-bold text-green-700 drop-shadow-sm flex items-center gap-2">
          🌳 Jardim Encantado dos Bichinhos 🐥
        </h1>
        <p class="text-xs text-gray-600 font-medium">Arraste a tela para explorar o jardim e clique nos animais!</p>
      </div>

      <!-- Scrollable / Draggable World Container -->
      <div 
        #world
        class="absolute cursor-grab active:cursor-grabbing transition-transform duration-75 ease-out"
        [style.width.px]="worldWidth"
        [style.height.px]="worldHeight"
        [style.transform]="'translate(' + posX + 'px, ' + posY + 'px)'"
        (mousedown)="startDrag($event)"
        (mousemove)="onDrag($event)"
        (mouseup)="endDrag()"
        (mouseleave)="endDrag()"
        (touchstart)="startTouch($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="endDrag()"
      >
        
        <!-- Background Scenery Elements (Grass, Trees, Lake, Fence) -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden">
          <!-- Sky / Sun -->
          <div class="absolute top-10 left-32 w-24 h-24 bg-yellow-300 rounded-full blur-sm opacity-90 animate-pulse"></div>

          <!-- Rolling Hills / Background Greenery -->
          <div class="absolute top-[30%] left-0 w-[3000px] h-[700px] bg-gradient-to-b from-emerald-300 to-green-600 rounded-[100%_100%_0_0]"></div>

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
          class="absolute cursor-pointer flex flex-col items-center group transition-transform duration-300"
          [style.left.px]="animal.x"
          [style.top.px]="animal.y"
          (click)="triggerAnimal(animal, $event)"
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

      <!-- Footer / Reset View Button -->
      <div class="absolute bottom-4 right-4 z-50">
        <button 
          (click)="resetView()"
          class="bg-white/90 hover:bg-white text-green-800 font-bold px-4 py-2 rounded-full shadow-lg border border-green-200 text-sm flex items-center gap-2 transition"
        >
          🏠 Centralizar Jardim
        </button>
      </div>

    </div>
  `
})
export class AppComponent implements AfterViewInit {
  worldWidth = 3000;
  worldHeight = 1200;
  
  posX = -500;
  posY = -200;

  isDragging = false;
  startX = 0;
  startY = 0;

  audioCtx: AudioContext | null = null;

  animals: Animal[] = [
    { id: 'gato', name: 'Gato', emoji: '🐱', bgClass: 'bg-orange-100', soundType: 'meow', x: 400, y: 350, size: 8, animState: 'idle', message: 'Miau! Miau!' },
    { id: 'cachorro', name: 'Cachorro', emoji: '🐶', bgClass: 'bg-amber-100', soundType: 'bark', x: 850, y: 400, size: 8, animState: 'idle', message: 'Au! Au!' },
    { id: 'galinha', name: 'Galinha', emoji: '🐔', bgClass: 'bg-yellow-100', soundType: 'cluck', x: 1300, y: 450, size: 8, animState: 'idle', message: 'Có-có-ró-có!' },
    { id: 'vaca', name: 'Vaca', emoji: '🐮', bgClass: 'bg-stone-100', soundType: 'moo', x: 1750, y: 380, size: 8, animState: 'idle', message: 'Muuu!' },
    { id: 'sapo', name: 'Sapo', emoji: '🐸', bgClass: 'bg-emerald-100', soundType: 'croak', x: 650, y: 600, size: 8, animState: 'idle', message: 'Ribit! Ribit!' },
    { id: 'leao', name: 'Leão', emoji: '🦁', bgClass: 'bg-amber-200', soundType: 'roar', x: 2150, y: 350, size: 8, animState: 'idle', message: 'Roar! Rawr!' },
    { id: 'elefante', name: 'Elefante', emoji: '🐘', bgClass: 'bg-slate-200', soundType: 'trumpet', x: 2550, y: 420, size: 8, animState: 'idle', message: 'Fruuuu!' },
    { id: 'tigre', name: 'Tigre', emoji: '🐯', bgClass: 'bg-orange-200', soundType: 'tiger', x: 1100, y: 620, size: 8, animState: 'idle', message: 'Grrr!' },
    { id: 'arara', name: 'Arara', emoji: '🦜', bgClass: 'bg-red-100', soundType: 'bird', x: 300, y: 220, size: 8, animState: 'idle', message: 'Squawk! Lindo!' }
  ];

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

  triggerAnimal(animal: Animal, event: Event) {
    event.stopPropagation();
    this.playAnimalSound(animal);

    animal.animState = 'active';
    setTimeout(() => {
      animal.animState = 'idle';
    }, 1200);
  }

  /**
   * Toca o arquivo de áudio do animal (src/assets/sounds/<id>.mp3).
   * Se o arquivo não existir ou falhar ao tocar, cai no som sintetizado.
   */
  playAnimalSound(animal: Animal) {
    const audio = new Audio(`assets/sounds/${animal.id}.mp3`);
    audio.play().catch(() => {
      // Arquivo ausente ou bloqueado: usa o som gerado pela Web Audio API.
      this.initAudio();
      this.playSound(animal.soundType);
    });
  }

  playSound(type: string) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (type === 'meow') {
      // Meow sound simulation using oscillator
      const osc = ctx.createOscillator();
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

  // Dragging logic for panning the garden map
  startDrag(e: MouseEvent) {
    this.isDragging = true;
    this.startX = e.clientX - this.posX;
    this.startY = e.clientY - this.posY;
  }

  onDrag(e: MouseEvent) {
    if (!this.isDragging) return;
    this.posX = e.clientX - this.startX;
    this.posY = e.clientY - this.startY;
  }

  endDrag() {
    this.isDragging = false;
  }

  startTouch(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.startX = e.touches[0].clientX - this.posX;
      this.startY = e.touches[0].clientY - this.posY;
    }
  }

  onTouchMove(e: TouchEvent) {
    if (!this.isDragging || e.touches.length !== 1) return;
    this.posX = e.touches[0].clientX - this.startX;
    this.posY = e.touches[0].clientY - this.startY;
  }
}
