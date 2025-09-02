// app.component.ts — Standalone Angular + Bootstrap mockup
// ---------------------------------------------------------
// • Yksi kuva kerrallaan ("Tinder"-tyyli)
// • Äänestäjä antaa pistettä väliltä -5 … +5
// • Nimimerkki syötetään alussa (tallentuu localStorageen)
// • Isot fontit ja ikonit, minimaalinen teksti
// • Valmis lataamaan tulokset JSON:ina (nickname + votes)
//
// Käyttöönotto (uusi Angular-projekti):
// 1) Luo Angular-projekti: `ng new vote-portal --no-standalone=false` (tai käytä olemassa olevaa)
// 2) Korvaa src/app/app.component.ts tämän tiedoston sisällöllä.
// 3) Varmista että src/main.ts bootstrapaa AppComponentin:
//      import { bootstrapApplication } from '@angular/platform-browser';
//      import { AppComponent } from './app/app.component';
//      bootstrapApplication(AppComponent).catch(err => console.error(err));
// 4) Lisää Bootstrap & Bootstrap Icons index.html:iin (head-sisältöön):
//      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
//      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
//      <script defer src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
// 5) `ng serve` ja avaa http://localhost:4200

import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Vote = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;

interface Item { id: number; url: string; title?: string; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="min-vh-100 d-flex flex-column align-items-center justify-content-center text-light position-relative">
    <!-- Header / Progress -->
    <div class="container-fluid px-4 pt-3 w-100" *ngIf="!finished">
      <div class="d-flex align-items-center gap-3">
        <div class="fs-3 fw-bold text-truncate">{{ nickname || '—' }}</div>
        <div class="progress flex-grow-1" style="height:12px;">
          <div class="progress-bar" role="progressbar" [style.width.%]="(currentIndex / items.length) * 100"></div>
        </div>
        <div class="fs-5">{{ currentIndex + 1 }} / {{ items.length }}</div>
      </div>
    </div>

    <!-- Voting Card -->
    <ng-container *ngIf="!finished && current">
      <div class="card shadow-lg vote-card mt-2">
        <img [src]="current.url" class="card-img-top" [alt]="current.title || 'image'" loading="eager"/>
      </div>

      <!-- Score buttons -5..0..+5 -->
      <div class="mt-4 d-flex justify-content-center">
        <div class="btn-group btn-group-lg flex-wrap gap-2">
          <button *ngFor="let v of scale" (click)="selectScore(v)"
                  class="btn fw-bold score-pill"
                  [ngClass]="{
                    'btn-danger text-white': v < 0,
                    'btn-secondary text-white': v === 0,
                    'btn-success text-white': v > 0,
                    'active': currentScore === v
                  }">
            <i class="bi" [ngClass]="{ 'bi-hand-thumbs-down': v < 0, 'bi-dash': v === 0, 'bi-hand-thumbs-up': v > 0 }"></i>
            <span class="ms-1">{{ v }}</span>
          </button>
        </div>
      </div>

      <!-- Primary actions -->
      <div class="mt-4 d-flex align-items-center gap-3">
        <!-- <button class="btn btn-outline-light btn-lg rounded-circle p-4 action-circle" (click)="bump(-1)" aria-label="-1">
          <i class="bi bi-hand-thumbs-down"></i>
        </button> -->
        <button class="btn btn-primary btn-lg px-5 py-3" [disabled]="currentScore === null" (click)="submit()">
          <i class="bi bi-arrow-right-circle me-2"></i> Next
        </button>
        <!-- <button class="btn btn-outline-light btn-lg rounded-circle p-4 action-circle" (click)="bump(1)" aria-label="+1">
          <i class="bi bi-hand-thumbs-up"></i>
        </button> -->
      </div>

      <!-- <div class="mt-3 text-white-50 small">Vinkki: ←/→ säätää, Enter jatkaa</div> -->
    </ng-container>

    <!-- Finished -->
    <div *ngIf="finished" class="text-center">
      <div class="display-5 mb-2">Thank you, {{ nickname }}!</div>
      <div class="fs-4 mb-4">Voting complete.</div>
      <div class="d-flex justify-content-center gap-3 flex-wrap">
        <button class="btn btn-success btn-lg" (click)="downloadJSON()">
          <i class="bi bi-download me-2"></i> Lataa JSON
        </button>
        <button class="btn btn-outline-light btn-lg" (click)="reset()">
          <i class="bi bi-arrow-counterclockwise me-2"></i> Uudestaan
        </button>
      </div>
    </div>

    <!-- Nickname overlay -->
    <div *ngIf="nicknameEditing" class="nickname-overlay">
      <div class="nick-card p-4 rounded-4 shadow-lg bg-white text-dark">
        <div class="fs-2 mb-3 text-center">Name</div>
        <input class="form-control form-control-lg text-center" [(ngModel)]="nickname" placeholder="Enter your name…" (keyup.enter)="saveNickname()"/>
        <button class="btn btn-dark btn-lg w-100 mt-3" (click)="saveNickname()">
          <i class="bi bi-check2-circle me-2"></i>Start
        </button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background: linear-gradient(135deg, #000, #400); }
    .vote-card { width: min(900px, 92vw); height: min(70vh, 720px); border-radius: 2rem; overflow: hidden; background: rgba(255,255,255,.08); backdrop-filter: blur(6px); }
    .vote-card img { width: 100%; height: 100%; object-fit: contain; background: rgba(0,0,0,.15); }
    .score-pill { border-width: 2px; border-radius: 999px; padding: .6rem 1rem; }
    .score-pill.active { box-shadow: 0 0 0 .25rem rgba(255,255,255,.25) inset; }
    .action-circle { width: 4rem; height: 4rem; display:flex; align-items:center; justify-content:center; }
    .nickname-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index: 1000; }
    .nick-card { width: min(480px, 90vw); }
    .progress { background: rgba(255,255,255,.25); }
    .progress-bar { background: #ffc107; }
  `]
})
export class AppComponent {
  nickname: string = localStorage.getItem('nickname') ?? '';
  nicknameEditing = !this.nickname;

  // Vaihda omiin kuviin — esimerkiksi tuo URLit backendistä/JSONista.
  items: Item[] = [
    { id: 1, url: '/images/herwood.png', title: 'Kuva 1' },
    { id: 2, url: '/images/pispala.png', title: 'Kuva 1' },
    { id: 3, url: '/images/karting.png', title: 'Kuva 2' },
    { id: 4, url: '/images/lautapeli.png', title: 'Kuva 3' },
    { id: 5, url: '/images/savefile.png', title: 'Kuva 4' },
    { id: 6, url: '/images/karaoke.png', title: 'Karaoke' },
    { id: 7, url: '/images/counterstrike.png', title: 'Counter-Strike' },
    { id: 8, url: '/images/ikuriarcade.png', title: 'Ikuri Arcade' }


  ];

  scale: Vote[] = [-5,-4,-3,-2,-1,0,1,2,3,4,5];
  currentIndex = 0;
  currentScore: Vote | null = null;
  votes: Record<number, Vote> = {};
  finished = false;

  get current(): Item | null {
    return this.items[this.currentIndex] ?? null;
  }

  saveNickname() {
    this.nickname = (this.nickname || '').trim();
    if (this.nickname) {
      localStorage.setItem('nickname', this.nickname);
      this.nicknameEditing = false;
    }
  }

  selectScore(v: Vote) { this.currentScore = v; }

  bump(delta: -1 | 1) {
    let s = (this.currentScore ?? 0) + delta as number;
    if (s > 5) s = 5;
    if (s < -5) s = -5;
    this.currentScore = s as Vote;
  }

  submit() {
    if (!this.current || this.currentScore === null) return;
    this.votes[this.current.id] = this.currentScore;
    this.currentScore = null;
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
    } else {
      this.finished = true;
    }
  }

  reset() {
    this.currentIndex = 0;
    this.currentScore = null;
    this.votes = {};
    this.finished = false;
  }

  downloadJSON() {
    const payload = {
      nickname: this.nickname,
      votes: this.votes,
      createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'votes.json'; a.click();
    URL.revokeObjectURL(url);
  }

  // Pikanäppäimet: ←/→ säätävät arvoa, Enter = seuraava, Esc = nollaa valinnan
  @HostListener('document:keydown', ['$event'])
  handleKey(e: KeyboardEvent) {
    if (this.nicknameEditing) return;
    if (this.finished) {
      if (e.key === 'Enter') { this.reset(); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowLeft') { this.bump(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { this.bump(1); e.preventDefault(); }
    if (e.key === 'Enter') { this.submit(); e.preventDefault(); }
    if (e.key === 'Escape') { this.currentScore = null; e.preventDefault(); }
  }
}
