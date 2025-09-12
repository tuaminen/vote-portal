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

const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:8080';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `

  <!-- Landing page -->
  <div *ngIf="showLanding" class="landing d-flex flex-column justify-content-center align-items-center text-light text-center">
    <h1 class="display-1 fw-bold mb-4">{{ landingTitle }}</h1>
    <button class="btn btn-lg btn-primary fs-2 px-5 py-3 rounded-pill shadow-lg" (click)="startVoting()">
      Let's vote!
    </button>
  </div>

  <!-- Varsinainen äänestys -->
  <div *ngIf="!showLanding" class="min-vh-100 d-flex flex-column align-items-center justify-content-center text-light position-relative">

    <div class="min-vh-100 d-flex flex-column align-items-center justify-content-center text-light position-relative">
      <!-- Header / Progress -->
      <div class="container-fluid px-4 pt-3 w-100" *ngIf="!finished">
        <div class="d-flex align-items-center gap-3">
          <div class="fs-3 fw-bold text-truncate">{{ nickname || '—' }}</div>
          <div class="progress flex-grow-1">
            <div class="progress-bar" role="progressbar" [style.width.%]="items.length ? (currentIndex / items.length) * 100 : 0"></div>
          </div>
          <div class="fs-3 fw-bold">{{ items.length ? (currentIndex + 1) : 0 }} / {{ items.length }}</div>
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
        <div class="card vote-card mt-2">
          <img [src]="imageUrl(current.id)" class="card-img-top" [alt]="current.description" loading="eager"/>
        </div>

        <!-- Score buttons -5..0..+5 -->
        <div class="card-body bg-transparent text-center py-3">
          <div class="fs-2 fw-semibold text-white-90 desc" [innerHTML]="linkifyHtml(current.description)"></div>
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
          <button class="btn fs-2 fw-bold score-pill btn-secondary text-white px-4 py-2" (click)="goPrev()" aria-label="Edellinen">
            <i class="bi bi-arrow-left me-2"></i> Edellinen
          </button>
          <button class="btn fs-2 fw-bold score-pill btn-primary text-white px-4 py-2" (click)="goNext()" aria-label="Seuraava">
            Seuraava <i class="bi bi-arrow-right ms-2"></i>
          </button>
        </div>

      </ng-container>

      <!-- Finished -->
      <div *ngIf="finished && !loading && !error" class="container py-4">
        <div class="text-center mb-4" *ngIf="!showResults">
          <div class="display-5 mb-2">Kiitos, {{ nickname }}!</div>
          <div class="fs-3 mb-4">Äänestys valmis.</div>
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
              <button class="btn fs-2 btn-outline-light" (click)="reloadResults()"><i class="bi bi-arrow-clockwise me-2"></i>Päivitä</button>
              <button class="btn fs-2 btn-outline-light" (click)="reset()"><i class="bi bi-arrow-counterclockwise me-2"></i>Uudestaan</button>
            </div>
          </div>

          <div class="table-responsive shadow-lg rounded-4 overflow-hidden results-wrap">
            <table class="table-striped table-hover align-middle mb-0 results-table">
              <thead>
                <tr class="text-uppercase fs-2 text-white">
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
                  <td class="px-4 fs-2 fw-bold">{{ i + 1 }}</td>
                  <td style="width: 120px;">
                    <img [src]="imageUrl(r.item_id)" class="img-thumbnail rounded-3" style="width:110px;height:70px;object-fit:cover;" alt="thumb"/>
                  </td>
                  <td class="fw-semibold desc fs-4" [innerHTML]="linkifyHtml(descriptionOf(r.item_id))"></td>
                  <td class="text-end fs-2">{{ r.voters }}</td>
                  <td class="text-end fs-2 fw-bold">{{ r.score }}</td>
                  <td class="text-end fs-2">{{ r.average | number:'1.2-2' }}</td>
                  <td class="text-end fs-2"><span class="badge bg-success-subtle text-white px-3 py-2">{{ r.pos }}</span></td>
                  <td class="text-end fs-2"><span class="badge bg-danger-subtle text-white px-3 py-2">{{ r.neg }}</span></td>
                  <td class="text-end fs-2"><span class="badge bg-warning text-dark px-3 py-2">{{ r.rank | number:'1.3-3' }}</span></td>
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
  </div>

  `,
  styles: [`
    /* Synthwave-fontti */
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;700&display=swap');






    /* Taustan animaatio */
    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* Landing-näkymä */
    .landing {
      min-height: 100vh;
      background: linear-gradient(135deg, #000000ff, #1a1825ff, #360317ff, #002c3dff);
      background-size: 300% 300%;
      animation: gradientShift 11s ease infinite;
      font-family: 'Orbitron', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    }
    .landing h1 {
      letter-spacing: .04em;
      text-shadow: 0 0 16px rgba(0,234,248,.65), 0 0 32px rgba(122,11,192,.55);
    }

    /* App-root tausta */
    :host {
      display:block; min-height:100vh;
      background: radial-gradient(1200px 600px at 10% 10%, rgba(122,11,192,.25), transparent 60%),
                  radial-gradient(900px 500px at 90% 90%, rgba(187, 21, 165, 0.1), transparent 60%),
                  linear-gradient(135deg, #000000ff 0%, #270000ff 100%);
      font-family: 'Rajdhani', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
      color: #E9EAF2;
    }

    /* Kortti kuvalle */
    .vote-card {
      width: min(900px, 92vw); height: min(70vh, 720px);
      /*border-radius: 2rem; overflow: hidden;*/
      /*background: rgba(255,255,255,.05);*/
      background: transparent;
      /*backdrop-filter: blur(8px);*/
      /*border: 1px solid rgba(255,255,255,.12);*/
      border: 0px;
      /*box-shadow:
        0 0 0 1px rgba(122,11,192,.35) inset,
        0 20px 50px rgba(0,0,0,.5),
        0 0 40px rgba(0,234,248,.18);*/
    }
    .vote-card img {
      width: 100%; height: 100%; object-fit: contain;

      /*background: rgba(0,0,0,.15);*/
    }

    /* Navigointinuolet-alue: irti alareunasta */
    .nav-arrows { margin-bottom: 3.5rem; }

    /* Neon-napit (perustuvat Bootstrapin btn-* luokkiin) */
    .btn-primary {
      background: linear-gradient(135deg, #7A0BC0, #B517F0);
      border: 1px solid rgba(181,23,240,.65);
      box-shadow: 0 8px 24px rgba(181,23,240,.35), 0 0 16px rgba(181,23,240,.45);
    }
    .btn-primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 10px 28px rgba(181,23,240,.45), 0 0 24px rgba(181,23,240,.6);
    }
    .btn-secondary {
      background: linear-gradient(135deg, #2C2F48, #3A3E62);
      border: 1px solid rgba(255,255,255,.18);
      box-shadow: 0 8px 24px rgba(0,0,0,.5), 0 0 14px rgba(255,255,255,.08);
    }
    .btn-outline-light {
      border-color: rgba(255,255,255,.35);
    }

    /* Vote-pill-napit */
    .score-pill {
      border-width: 2px; border-radius: 999px; padding: .6rem 1rem;
      transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
      text-transform: none;
    }
    /* Väritetyt pillit neon-hehkulla */
    .btn-success.score-pill {
      background: linear-gradient(135deg, #0c2c21ff, #00FFB3);
      border-color: rgba(11, 59, 45, 0.6);
      color:#00130c;
      box-shadow: 0 0 118px rgba(0,255,179,.35);
    }
    .btn-danger.score-pill {
      background: linear-gradient(135deg, #460c16ff, #FF5E7E);
      border-color: rgba(24, 23, 23, 0.65);
      box-shadow: 0 0 118px rgba(255,46,86,.35);
    }
    .btn-secondary.score-pill {
      background: linear-gradient(135deg, #2C2F48, #3A3E62);
      border-color: rgba(255,255,255,.18);
      box-shadow: 0 0 114px rgba(255,255,255,.12);
    }
    .score-pill:hover {
      transform: scale(1.08);
      filter: brightness(1.06);
    }
    .score-pill.active {
      box-shadow:
        0 0 0 .3rem rgba(255,255,255,.28) inset,
        0 0 22px rgba(255,255,255,.85),
        0 0 40px rgba(122,11,192,.35);
      transform: scale(1.12);
      font-weight: 900;
    }

    /* Linkit descriptionissa */
    .desc a {
      color: #78F7FF;
      text-decoration: underline;
    }
    .desc a:hover { text-decoration: none; filter: brightness(1.15); }

    /* Nickname overlay */
    .nickname-overlay { position: fixed; inset: 0;
      background: radial-gradient(600px 300px at 20% 20%, rgba(122,11,192,.25), transparent 60%),
                  radial-gradient(600px 300px at 80% 80%, rgba(0,234,248,.22), transparent 60%),
                  rgba(0,0,0,.6);
      display:flex; align-items:center; justify-content:center; z-index: 1000;
    }
    .nick-card { width: min(480px, 90vw);
      box-shadow: 0 20px 50px rgba(0,0,0,.55), 0 0 22px rgba(0,234,248,.25);
      border: 1px solid rgba(0,0,0,.08);
    }

    /* Progress bar neon */
    .progress {
      background: rgba(82, 7, 16, 0.45); height:24px; border-radius: 999px; overflow: hidden; }

    .progress-bar {
      background: linear-gradient(90deg, #ff0000ff, #a10051ff);
      box-shadow: 0 0 16px rgba(255, 255, 255, 0.95), inset 0 0 8px rgba(245, 155, 155, 0.85);
    }

    /* Tulostaulukko */
    .results-wrap {
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.89), rgba(233, 21, 162, 0.25));

      border: 1px solid rgba(249, 249, 250, 0.77);
      box-shadow: 0 120px 50px rgba(223, 22, 22, 0.85), 0 0 132px rgba(161, 9, 255, 0.89);
    }
    .results-table thead {
      background: linear-gradient(135deg, rgba(255, 0, 13, 0.89), rgba(233, 21, 162, 0.25));
      backdrop-filter: blur(6px);
    }
    .results-table tbody tr {
      border: 1px solid rgba(102, 20, 51, 0.77);
      transition: transform .08s ease, background .08s ease, box-shadow .08s ease;
    }
    .results-table tbody tr:hover {
      transform: scale(1.01);
      background: rgba(255, 0, 0, 0.57);
      box-shadow: 0 0 18px rgba(149, 221, 224, 0.15) inset;
    }

     .bg-success-subtle  {
        background-color: #038017ff !important;
     }

     .bg-danger-subtle   {
        background-color: #ff000dff !important;
     }
  `]

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
