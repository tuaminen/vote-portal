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

interface TopicOut { title: string; }
interface ItemMeta { id: number; description: string; }
interface VoteIn { item_id: number; score: Vote; }
interface ResultItem { item_id: number; voters: number; score: number; average: number; pos: number; neg: number; rank: number; }

const API_BASE = localStorage.getItem('API_BASE') ||  'http://localhost:8080';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `


  <!-- Landing page -->
  <div *ngIf="showLanding" class="crt landing d-flex flex-column justify-content-center align-items-center text-light text-center">
    <h1 class="glitch" [attr.data-text]="landingTitle">{{ landingTitle }}</h1>
        <!-- <h1 class="glitch display-1 fw-bold mb-4">!{{ landingTitle }}</h1> -->

    <button class="crt-rgb crt crt-curved btn btn-lg btn-primary fs-1 px-5 py-3 mt-5" (click)="startVoting()">
      Let's vote!
      <i class="bi bi-hand-thumbs-up me-2"></i>
    </button>
  </div>
  <!-- Varsinainen äänestys -->
  <div *ngIf="!showLanding" class="crt min-vh-100 d-flex flex-column align-items-center justify-content-center text-light position-relative">

    <div class="min-vh-100 d-flex w-75 flex-column align-items-center justify-content-center text-light position-relative">
      <!-- Header / Progress -->
      <div class="container-fluid px-4 pt-3 mt-4" *ngIf="!finished">
        <div class="d-flex align-items-center gap-3">
          <div class="crt-rgb fs-3 fw-bold text-truncate">{{ nickname || '—' }}</div>
          <div class="crt-flicker progress flex-grow-1">
            <div class="progress-bar" role="progressbar" [style.width.%]="items.length ? (currentIndex / items.length) * 100 : 0"></div>
          </div>
          <div class="crt-rgb fs-3 fw-bold">{{ items.length ? (currentIndex + 1) : 0 }} / {{ items.length }}</div>
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
        <div class="crt card vote-card m-3">
          <img [src]="imageUrl(current.id)" class="card-img-top" [alt]="current.description" loading="eager"/>
        </div>

        <!-- Score buttons -5..0..+5 -->

        <div class="card-body bg-transparent text-center py-3">
          <div class="crt-rgb fs-2 fw-semibold text-white-90 desc" [innerHTML]="linkifyHtml(current.description)"></div>
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

        <!-- Navigation arrows -->
        <div class="mt-5 d-flex align-items-center gap-3 nav-arrows">
          <button class="crt-rgb crt-flicker btn fs-2 btn-primary text-white px-4 py-2" (click)="goPrev()" aria-label="Edellinen">
            <i class="bi bi-arrow-left me-2"></i> Edellinen
          </button>
          <button class="crt-rgb crt-flicker btn fs-2 btn-primary text-white px-4 py-2" (click)="goNext()" aria-label="Seuraava">
            Seuraava <i class="bi bi-arrow-right ms-2"></i>
          </button>
        </div>

      </ng-container>

      <!-- Finished -->
      <div class="w-100" *ngIf="finished && !loading && !error">

        <!-- send votes -->
        <div class="text-center mb-4 container" *ngIf="!showResults">
          <div class="crt-rgb display-5 mb-2">Kiitos, {{ nickname }}!</div>
          <div class="crt-rgb fs-3 mb-4">Äänestys valmis.</div>
          <div class="d-flex justify-content-center gap-3 flex-wrap">
            <button class="btn fs-2 fw-bold btn-primary" (click)="sendVotes()" [disabled]="sending">
              <i class="bi bi-upload me-2"></i> Lähetä palvelimelle
            </button>
            <button class="crt-rgb btn fs-2 fw-bold btn-outline-light btn-lg" (click)="reset()">
              <i class="bi bi-arrow-counterclockwise me-2"></i> Muuta ääniä
            </button>
          </div>
          <div class="mt-3" *ngIf="sendResult" [class]="sendOk ? 'text-success' : 'text-warning'">{{ sendResult }}</div>
        </div>

        <!-- Tulossivu -->
        <div class="results-page" *ngIf="showResults">
          <div class="d-flex align-items-end justify-content-between mb-3 flex-wrap gap-3 m-8">
            <div>
              <h1 class="crt glitch fw-bold text-uppercase" data-text="Tulokset">Tulokset</h1>
              <div class="text-white-50">Järjestetty korkeimmasta scoresta alaspäin</div>
            </div>
            <div class="d-flex gap-2">
              <!-- <button class="btn fs-2 btn-primary text-white px-4 py-2" (click)="reloadResults()"><i class="bi text-white  bi-arrow-clockwise me-2"></i>Päivitä</button> -->
              <button class="btn fs-2 btn-primary text-white px-4 py-2" (click)="reset()"><i class="bi bi-arrow-counterclockwise me-2"></i>Muuta ääniä</button>
            </div>
          </div>

          <div class="table-responsive rounded-4 overflow-hidden results-wrap mb-5">
            <table class="crt table-striped table-hover align-middle results-table results-wrap">
              <thead>
                <tr class="text-uppercase fs-4 text-white">
                  <th class="px-3">#</th>
                  <th>Kuva</th>
                  <th>Kuvaus</th>
                  <th class="text-end">Äänestäjiä</th>
                  <th class="text-end">Pisteet</th>
                  <th class="text-center">K.A.</th>
                  <th class="text-center"><i class="bi bi-hand-thumbs-up me-2"></i></th>
                  <th class="text-center"><i class="bi bi-hand-thumbs-down me-2"></i></th>
                  <!-- <th class="text-center"><i class="bi bi-trophy me-2"></i></th> -->
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of results; let i = index">
                  <td class="px-3 fs-2 fw-bold">{{ i + 1 }}</td>
                  <td >
                    <img [src]="imageUrl(r.item_id)" class="img-thumbnail" alt="thumb"/>
                  </td>
                  <td class="desc fs-5" [innerHTML]="linkifyHtml(descriptionOf(r.item_id))"></td>
                  <td class="text-end fs-2">{{ r.voters }}</td>
                  <td class="text-end fs-2 fw-bold">{{ r.score }}</td>
                  <td class="text-end fs-2">{{ r.average | number:'1.2-2' }}</td>
                  <td class="text-end fs-2"><span class="badge bg-success-subtle text-white px-3 py-2">{{ r.pos }}</span></td>
                  <td class="text-end fs-2"><span class="badge bg-danger-subtle text-white px-3 py-2 mx-3">{{ r.neg }}</span></td>
                  <!-- <td class="text-end fs-2"><span class="badge bg-warning text-dark px-1 py-2 mx-3">{{ r.rank | number:'1.3-3' }}</span></td> -->
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Nickname overlay -->
      <div *ngIf="nicknameEditing" class="nickname-overlay">
        <div class="nick-card p-4 rounded-4 crt crt-flicker btn btn-primary">
          <div class="fs-1 mb-3 text-uppercase text-center">Nimimerkki</div>
          <input class="form-control form-control-lg text-center fs-2 fs-bold" [(ngModel)]="nickname" placeholder="kirjoita nimimerkki…" (keyup.enter)="saveNickname()"/>
          <button class="crt-rgb fs-2 fs-bold btn btn-dark btn-lg w-100 mt-3" (click)="saveNickname()">
            <i class="bi bi-check2-circle me-2"></i>Aloita
          </button>
        </div>
      </div>
    </div>
  </div>


  `,
  styles: []

})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);

  nickname: string = localStorage.getItem('nickname') ?? '';
  nicknameEditing = !this.nickname;

  showLanding = true;
  landingTitle = '...';   // oletus, jos backend ei vastaa

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
    this.getTopic();
  }

  imageUrl(id: number) { return `${API_BASE}/items/${id}/image`; }

  get current(): ItemMeta | null { return this.items[this.currentIndex] ?? null; }

  getTopic() {
    this.http.get<{ title: string }>(`${API_BASE}/topic`).subscribe({
      next: t => this.landingTitle = t.title,
      error: () => this.landingTitle = 'TestiOtsikko 24.10.2025'
    });
  }

  fetchItems() {
    this.loading = true; this.error = null; this.finished = false; this.currentIndex = 0; this.currentScore = null; this.votes = {};
    this.http.get<ItemMeta[]>(`${API_BASE}/items`).subscribe({
      next: (res) => { this.items = res ?? []; this.loading = false; this.syncCurrentScore(); },
      error: (err) => { this.error = err?.error?.detail || 'Ei saada yhteyttä API:in'; this.loading = false; }
    });
  }

  reload() {
    this.fetchItems();
  }

  private urlRegex = /(https?:\/\/[^\s<]+)/g;
  linkifyHtml(s: string | null | undefined): string {
    const txt = (s ?? '').toString();
    // Muunna URLit klikkilinkeiksi; Angularin oma sanitointi suojaa vaarallisilta tageilta
    return txt.replace(this.urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  saveNickname() {
    this.nickname = (this.nickname || '').trim();
    if (this.nickname) {
      localStorage.setItem('nickname', this.nickname);
      this.nicknameEditing = false;
    }
  }

  selectScore(v: Vote) { this.currentScore = v; }

  startVoting() {
    this.showLanding = false;
    this.fetchItems();
  }

  bump(delta: -1 | 1) {
    let s = (this.currentScore ?? 0) + delta as number;
    if (s > 5) s = 5; if (s < -5) s = -5; this.currentScore = s as Vote;
  }

  private syncCurrentScore() {
    const cur = this.current;
    this.currentScore = cur ? (this.votes[cur.id] ?? null) : null;
  }

  goPrev() {
    // Tallenna mahdollinen valinta nykyiselle itemille
    if (this.current && this.currentScore !== null) {
      this.votes[this.current.id] = this.currentScore;
    }
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.syncCurrentScore(); // näytä aiemmin annettu arvo (jos on)
    }
  }

  goNext() {
    // Tallenna mahdollinen valinta nykyiselle itemille
    if (this.current && this.currentScore !== null) {
      this.votes[this.current.id] = this.currentScore;
    }
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
      this.syncCurrentScore(); // näytä aiemmin annettu arvo (jos on)
    } else {
      // viimeisen jälkeen siirrytään valmiiksi-näkymään
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
      if (e.key === 'Escape') { this.currentScore = null; e.preventDefault(); }
    }
  }
}
