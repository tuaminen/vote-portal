// app.component.ts — Standalone Angular + Bootstrap mockup (backend-integraatio)
// -----------------------------------------------------------------------
// Nyt kuvat ja metatiedot haetaan FastAPI-backendistä:
//   GET  /items                 → [{ id, description }]
//   GET  /items/{id}/image      → kuvan bytes (MIME)
//   POST /votes                 → { user_id, votes: [{item_id, score}] }
//
// Nopeat ohjeet:
// 1) Lisää index.html:iin Bootstrap + Icons (kuten aiemmin).
// 2) Vaihda API_BASE tarvittaessa (alla). CORS salli http://localhost:4200 backendissä.
// 3) `ng serve` ja testaa.

import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type Vote = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;

interface ItemMeta { id: number; description: string; }
interface VoteIn { item_id: number; score: Vote; }
interface ResultItem { item_id: number; voters: number; score: number; average: number; pos: number; neg: number; rank: number; }

const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:8080';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
  <div class="min-vh-100 d-flex flex-column align-items-center justify-content-center text-light position-relative">
    <!-- Header / Progress -->
    <div class="container-fluid px-4 pt-3 w-100" *ngIf="!finished">
      <div class="d-flex align-items-center gap-3">
        <div class="fs-3 fw-bold text-truncate">{{ nickname || '—' }}</div>
        <div class="progress flex-grow-1" style="height:12px;">
          <div class="progress-bar" role="progressbar" [style.width.%]="items.length ? (currentIndex / items.length) * 100 : 0"></div>
        </div>
        <div class="fs-5">{{ items.length ? (currentIndex + 1) : 0 }} / {{ items.length }}</div>
      </div>
    </div>

    <!-- Loading / Error states -->
    <div class="text-center mt-5" *ngIf="loading">
      <div class="display-6">Ladataan…</div>
    </div>
    <div class="text-center mt-5" *ngIf="error">
      <div class="fs-4">Virhe: {{ error }}</div>
      <button class="btn btn-outline-light mt-3" (click)="reload()"><i class="bi bi-arrow-clockwise me-2"></i>Yritä uudelleen</button>
    </div>

    <!-- Voting Card -->
    <ng-container *ngIf="!finished && !loading && !error && current">
      <div class="card shadow-lg vote-card mt-2">
        <img [src]="imageUrl(current.id)" class="card-img-top" [alt]="current.description" loading="eager"/>
        <!-- UUSI: description kuvan alla -->
      </div>

      <!-- Score buttons -5..0..+5 -->
      <div class="card-body bg-transparent text-center py-3">
        <div class="fs-4 fw-semibold text-white-90">{{ current.description }}</div>
      </div>

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
        <button class="btn btn-outline-light btn-lg rounded-circle p-4 action-circle" (click)="bump(-1)" aria-label="-1">
          <i class="bi bi-hand-thumbs-down"></i>
        </button>
        <button class="btn btn-primary btn-lg px-5 py-3" [disabled]="currentScore === null" (click)="submitOne()">
          <i class="bi bi-arrow-right-circle me-2"></i> Seuraava
        </button>
        <button class="btn btn-outline-light btn-lg rounded-circle p-4 action-circle" (click)="bump(1)" aria-label="+1">
          <i class="bi bi-hand-thumbs-up"></i>
        </button>
      </div>

      <div class="mt-3 text-white-50 small">Vinkki: ←/→ säätää, Enter jatkaa</div>
    </ng-container>

    <!-- Finished -->
    <div *ngIf="finished && !loading && !error" class="container py-4">
      <div class="text-center mb-4" *ngIf="!showResults">
        <div class="display-5 mb-2">Kiitos, {{ nickname }}!</div>
        <div class="fs-4 mb-4">Äänestys valmis.</div>
        <div class="d-flex justify-content-center gap-3 flex-wrap">
          <button class="btn btn-success btn-lg" (click)="sendVotes()" [disabled]="sending">
            <i class="bi bi-upload me-2"></i> Lähetä palvelimelle
          </button>
          <button class="btn btn-outline-light btn-lg" (click)="reset()">
            <i class="bi bi-arrow-counterclockwise me-2"></i> Uudestaan
          </button>
        </div>
        <div class="mt-3" *ngIf="sendResult" [class]="sendOk ? 'text-success' : 'text-warning'">{{ sendResult }}</div>
      </div>

      <!-- Tulossivu -->
      <div *ngIf="showResults">
        <div class="d-flex align-items-end justify-content-between mb-3 flex-wrap gap-3">
          <div>
            <div class="display-6">Tulokset</div>
            <div class="text-white-50">Järjestetty korkeimmasta scoresta alaspäin</div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-light" (click)="reloadResults()"><i class="bi bi-arrow-clockwise me-2"></i>Päivitä</button>
            <button class="btn btn-outline-light" (click)="reset()"><i class="bi bi-arrow-counterclockwise me-2"></i>Uudestaan</button>
          </div>
        </div>

        <div class="table-responsive shadow-lg rounded-4 overflow-hidden results-wrap">
          <table class="table table-dark table-striped table-hover align-middle mb-0 results-table">
            <thead>
              <tr class="text-uppercase small text-white-50">
                <th class="px-4">#</th>
                <th>Kuva</th>
                <th>Kuvaus</th>
                <th class="text-end">Voters</th>
                <th class="text-end">Score</th>
                <th class="text-end">Average</th>
                <th class="text-end">Pos</th>
                <th class="text-end">Neg</th>
                <th class="text-end">Rank</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of results; let i = index">
                <td class="px-4 fw-bold">{{ i + 1 }}</td>
                <td style="width: 120px;">
                  <img [src]="imageUrl(r.item_id)" class="img-thumbnail rounded-3" style="width:110px;height:70px;object-fit:cover;" alt="thumb"/>
                </td>
                <td class="fw-semibold">{{ descriptionOf(r.item_id) }}</td>
                <td class="text-end">{{ r.voters }}</td>
                <td class="text-end fs-5 fw-bold">{{ r.score }}</td>
                <td class="text-end">{{ r.average | number:'1.2-2' }}</td>
                <td class="text-end"><span class="badge bg-success-subtle text-success-emphasis px-3 py-2">{{ r.pos }}</span></td>
                <td class="text-end"><span class="badge bg-danger-subtle text-danger-emphasis px-3 py-2">{{ r.neg }}</span></td>
                <td class="text-end"><span class="badge bg-warning text-dark px-3 py-2">{{ r.rank | number:'1.3-3' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Nickname overlay -->
    <div *ngIf="nicknameEditing" class="nickname-overlay">
      <div class="nick-card p-4 rounded-4 shadow-lg bg-white text-dark">
        <div class="fs-2 mb-3 text-center">Nimimerkki</div>
        <input class="form-control form-control-lg text-center" [(ngModel)]="nickname" placeholder="kirjoita nimimerkki…" (keyup.enter)="saveNickname()"/>
        <button class="btn btn-dark btn-lg w-100 mt-3" (click)="saveNickname()">
          <i class="bi bi-check2-circle me-2"></i>Aloita
        </button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background: #000; }
    .vote-card { width: min(900px, 92vw); height: min(70vh, 720px); border-radius: 2rem; overflow: hidden; background: rgba(255,255,255,.08); backdrop-filter: blur(6px); }
    .vote-card img { width: 100%; height: 100%; object-fit: contain; background: rgba(0,0,0,.15); }
    .score-pill { border-width: 2px; border-radius: 999px; padding: .6rem 1rem; }
    .score-pill.active { box-shadow: 0 0 0 .25rem rgba(255,255,255,.25) inset; }
    .action-circle { width: 4rem; height: 4rem; display:flex; align-items:center; justify-content:center; }
    .nickname-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index: 1000; }
    .nick-card { width: min(480px, 90vw); }
    .progress { background: rgba(255,255,255,.25); }
    .progress-bar { background: #ffc107; }
    /* Tulostaulukon visuaalinen ilme */
    .results-wrap { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); }
    .results-table thead { backdrop-filter: blur(4px); }
    .results-table tbody tr { transition: transform .06s ease; }
    .results-table tbody tr:hover { transform: scale(1.01); }
  `]
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);

  nickname: string = localStorage.getItem('nickname') ?? '';
  nicknameEditing = !this.nickname;

  items: ItemMeta[] = [];
  scale: Vote[] = [-5,-4,-3,-2,-1,0,1,2,3,4,5];
  currentIndex = 0;
  currentScore: Vote | null = null;
  votes: Record<number, Vote> = {};
  finished = false;
  loading = false;
  error: string | null = null;
  sending = false;
  sendResult: string | null = null;
  sendOk = false;

  // Tulossivun tila
  showResults = false;
  results: ResultItem[] = [];

  ngOnInit() {
    this.fetchItems();
  }

  imageUrl(id: number) { return `${API_BASE}/items/${id}/image`; }

  get current(): ItemMeta | null { return this.items[this.currentIndex] ?? null; }

  fetchItems() {
    this.loading = true; this.error = null; this.finished = false; this.currentIndex = 0; this.currentScore = null; this.votes = {};
    this.http.get<ItemMeta[]>(`${API_BASE}/items`).subscribe({
      next: (res) => { this.items = res ?? []; this.loading = false; },
      error: (err) => { this.error = err?.error?.detail || 'Ei saada yhteyttä API:in'; this.loading = false; }
    });
  }

  reload() { this.fetchItems(); }

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
    if (s > 5) s = 5; if (s < -5) s = -5; this.currentScore = s as Vote;
  }

  submitOne() {
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
    this.currentIndex = 0; this.currentScore = null; this.votes = {}; this.finished = false; this.sendResult = null; this.sendOk = false;
    this.showResults = false; this.results = [];
  }

  sendVotes() {
    if (!this.nickname) { this.sendResult = 'Aseta nimimerkki ensin'; this.sendOk = false; return; }
    const payload = {
      user_id: this.nickname, // tai selain-UUID
      votes: Object.entries(this.votes).map(([item_id, score]) => ({ item_id: Number(item_id), score })) as VoteIn[],
    };
    this.sending = true; this.sendResult = null; this.sendOk = false;
    this.http.post(`${API_BASE}/votes`, payload, { observe: 'response' }).subscribe({
      next: (res) => {
        this.sending = false;
        this.sendOk = res.status >= 200 && res.status < 300;
        this.sendResult = this.sendOk ? 'Äänet lähetetty' : `Virhe: ${res.status}`;
        if (this.sendOk) { this.loadResults(); }
      },
      error: (err) => { this.sending = false; this.sendOk = false; this.sendResult = err?.error?.detail || 'Lähetys epäonnistui'; }
    });
  }

  loadResults() {
    this.showResults = true;
    this.http.get<ResultItem[]>(`${API_BASE}/results`).subscribe({
      next: (res) => {
        const byScoreDesc = [...(res ?? [])].sort((a,b) => b.score - a.score);
        this.results = byScoreDesc;
      },
      error: () => { /* jätetään taulukko tyhjäksi, headerit näkyy */ }
    });
  }

  reloadResults() { this.loadResults(); }

  descriptionOf(id: number) { return this.items.find(i => i.id === id)?.description || ''; }

  // Pikanäppäimet: ←/→ säätävät arvoa, Enter = seuraava, Esc = nollaa valinnan
  @HostListener('document:keydown', ['$event'])
  handleKey(e: KeyboardEvent) {
    if (this.nicknameEditing) return;
    if (this.finished && !this.showResults) {
      if (e.key === 'Enter') { this.reset(); e.preventDefault(); }
      return;
    }
    if (!this.finished) {
      if (e.key === 'ArrowLeft') { this.bump(-1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { this.bump(1); e.preventDefault(); }
      if (e.key === 'Enter') { this.submitOne(); e.preventDefault(); }
      if (e.key === 'Escape') { this.currentScore = null; e.preventDefault(); }
    }
  }
}
