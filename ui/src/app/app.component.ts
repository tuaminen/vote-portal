import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { VoteService, Vote, ItemMeta, ResultItem } from './vote.service';
import { LandingComponent } from './landing/landing.component';
import { VotingComponent } from './voting/voting.component';
import { ResultsComponent } from './results/results.component';
import { NicknameComponent } from './nickname/nickname.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LandingComponent,
    VotingComponent,
    ResultsComponent,
    NicknameComponent
  ],
  template: `
    <!-- Nickname overlay - shown when no nickname is set -->
    <app-nickname 
      *ngIf="nicknameEditing" 
      [nickname]="nickname"
      (nicknameSaved)="saveNickname($event)">
    </app-nickname>

    <!-- Landing page -->
    <app-landing 
      *ngIf="showLanding" 
      [title]="landingTitle"
      (start)="startVoting()">
    </app-landing>

    <!-- Voting interface -->
    <div *ngIf="!showLanding" class="crt min-vh-100 d-flex flex-column align-items-center justify-content-center text-light position-relative">
      <!-- Show Results Button (Top Right) -->
      <button 
        *ngIf="!showResults" 
        class="btn btn-primary position-fixed top-0 end-0 m-3 fs-4 px-4 py-2" 
        (click)="loadResults()"
        style="z-index: 1000;">
        <i class="bi bi-trophy me-2"></i>Näytä tulokset
      </button>

      <!-- Loading / Error states -->
      <div class="text-center mt-5" *ngIf="loading">
        <div class="display-6">Ladataan…</div>
      </div>
      <div class="text-center mt-5" *ngIf="error">
        <div class="fs-4">Virhe: {{ error }}</div>
        <button class="btn btn-outline-light mt-3" (click)="reload()">
          <i class="bi bi-arrow-clockwise me-2"></i>Yritä uudelleen
        </button>
      </div>

      <!-- Voting Card -->
      <app-voting 
        *ngIf="!finished && !loading && !error && !showResults"
        [items]="items"
        [currentIndex]="currentIndex"
        [currentScore]="currentScore"
        [nickname]="nickname"
        (selectScore)="selectScore($event)"
        (next)="goNext()"
        (prev)="goPrev()">
      </app-voting>

      <!-- Finished - send votes screen -->
      <div class="w-100" *ngIf="finished && !loading && !error && !showResults">
        <div class="text-center mb-4 container">
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
      </div>

      <!-- Results page -->
      <app-results 
        *ngIf="showResults && !loading && !error"
        [results]="results"
        [items]="items"
        (reset)="reset()">
      </app-results>
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  private voteService = inject(VoteService);

  nickname: string = localStorage.getItem('nickname') ?? '';
  nicknameEditing = !this.nickname;

  showLanding = true;
  landingTitle = '...';

  items: ItemMeta[] = [];
  currentIndex = 0;
  currentScore: Vote | null = null;
  votes: Record<number, Vote> = {};
  finished = false;
  loading = false;
  error: string | null = null;
  sending = false;
  sendResult: string | null = null;
  sendOk = false;

  showResults = false;
  results: ResultItem[] = [];

  ngOnInit() {
    this.getTopic();
  }

  getTopic() {
    this.voteService.getTopic().subscribe({
      next: title => this.landingTitle = title,
      error: () => this.landingTitle = 'TestiOtsikko 24.10.2025'
    });
  }

  fetchItems() {
    this.loading = true;
    this.error = null;
    this.finished = false;
    this.currentIndex = 0;
    this.currentScore = null;
    this.votes = {};

    this.voteService.getItems().subscribe({
      next: (res) => {
        this.items = res ?? [];
        this.loading = false;
        this.syncCurrentScore();
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Ei saada yhteyttä API:in';
        this.loading = false;
      }
    });
  }

  reload() {
    this.fetchItems();
  }

  saveNickname(value: string) {
    this.nickname = value;
    localStorage.setItem('nickname', this.nickname);
    this.nicknameEditing = false;
  }

  selectScore(v: Vote) {
    this.currentScore = v;
  }

  startVoting() {
    this.showLanding = false;
    this.fetchItems();
  }

  bump(delta: -1 | 1) {
    let s = (this.currentScore ?? 0) + delta as number;
    if (s > 5) s = 5;
    if (s < -5) s = -5;
    this.currentScore = s as Vote;
  }

  private syncCurrentScore() {
    const cur = this.items[this.currentIndex] ?? null;
    this.currentScore = cur ? (this.votes[cur.id] ?? null) : null;
  }

  goPrev() {
    const current = this.items[this.currentIndex];
    if (current && this.currentScore !== null) {
      this.votes[current.id] = this.currentScore;
    }
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.syncCurrentScore();
    }
  }

  goNext() {
    const current = this.items[this.currentIndex];
    if (current && this.currentScore !== null) {
      this.votes[current.id] = this.currentScore;
    }
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
      this.syncCurrentScore();
    } else {
      this.finished = true;
    }
  }

  reset() {
    this.currentIndex = 0;
    this.currentScore = null;
    this.votes = {};
    this.finished = false;
    this.sendResult = null;
    this.sendOk = false;
    this.showResults = false;
    this.results = [];
  }

  sendVotes() {
    if (!this.nickname) {
      this.sendResult = 'Aseta nimimerkki ensin';
      this.sendOk = false;
      return;
    }

    this.sending = true;
    this.sendResult = null;
    this.sendOk = false;

    this.voteService.sendVotes(this.nickname, this.votes).subscribe({
      next: (res) => {
        this.sending = false;
        this.sendOk = res.status >= 200 && res.status < 300;
        this.sendResult = this.sendOk ? 'Äänet lähetetty' : `Virhe: ${res.status}`;
        if (this.sendOk) {
          this.loadResults();
        }
      },
      error: (err) => {
        this.sending = false;
        this.sendOk = false;
        this.sendResult = err?.error?.detail || 'Lähetys epäonnistui';
      }
    });
  }

  loadResults() {
    this.showResults = true;
    this.voteService.getResults().subscribe({
      next: (res) => {
        const byScoreDesc = [...(res ?? [])].sort((a, b) => b.score - a.score);
        this.results = byScoreDesc;
      },
      error: () => {
        // Leave results empty, headers will still show
      }
    });
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKey(e: KeyboardEvent) {
    if (this.nicknameEditing) return;
    if (this.finished && !this.showResults) {
      if (e.key === 'Enter') {
        this.reset();
        e.preventDefault();
      }
      return;
    }
    if (!this.finished) {
      if (e.key === 'ArrowLeft') {
        this.bump(-1);
        e.preventDefault();
      }
      if (e.key === 'ArrowRight') {
        this.bump(1);
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        this.currentScore = null;
        e.preventDefault();
      }
    }
  }
}
