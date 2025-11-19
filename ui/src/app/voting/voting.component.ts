import { Component, EventEmitter, Input, Output, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemMeta, Vote, VoteService } from '../vote.service';

@Component({
  selector: 'app-voting',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-vh-100 d-flex flex-column align-items-center justify-content-center text-light position-relative">
      <!-- Header / Progress -->
      <div class="container-fluid px-4 pt-3 mt-4">
        <div class="d-flex align-items-center gap-3">
          <div class="crt-rgb fs-3 fw-bold text-truncate">{{ nickname || '—' }}</div>
          <div class="crt-flicker progress flex-grow-1">
            <div class="progress-bar" role="progressbar" [style.width.%]="items.length ? (currentIndex / items.length) * 100 : 0"></div>
          </div>
          <div class="crt-rgb fs-3 fw-bold">{{ items.length ? (currentIndex + 1) : 0 }} / {{ items.length }}</div>
        </div>
      </div>

      <!-- Voting Card -->
      <ng-container *ngIf="current">
        <div class="crt card vote-card m-3">
          <img [src]="voteService.imageUrl(current.id)" class="card-img-top" [alt]="current.description" loading="eager"/>
        </div>

        <div class="card-body bg-transparent text-center py-3">
          <div class="crt-rgb fs-2 fw-semibold text-white-90 desc" [innerHTML]="linkifyHtml(current.description)"></div>
        </div>

        <div class="mt-4 d-flex justify-content-center">
          <div class="btn-group btn-group-lg gap-2">
            <button *ngFor="let v of scale" (click)="selectScore.emit(v)"
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
          <button class="crt-rgb crt-flicker btn fs-2 btn-primary text-white px-4 py-2" (click)="prev.emit()" aria-label="Edellinen">
            <i class="bi bi-arrow-left me-2"></i> Edellinen
          </button>
          <button class="crt-rgb crt-flicker btn fs-2 btn-primary text-white px-4 py-2" (click)="next.emit()" aria-label="Seuraava">
            Seuraava <i class="bi bi-arrow-right ms-2"></i>
          </button>
        </div>
      </ng-container>
    </div>
  `
})
export class VotingComponent {
  voteService = inject(VoteService);

  @Input() items: ItemMeta[] = [];
  @Input() currentIndex = 0;
  @Input() currentScore: Vote | null = null;
  @Input() nickname = '';

  @Output() selectScore = new EventEmitter<Vote>();
  @Output() next = new EventEmitter<void>();
  @Output() prev = new EventEmitter<void>();

  scale: Vote[] = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  get current(): ItemMeta | null { return this.items[this.currentIndex] ?? null; }

  private urlRegex = /(https?:\/\/[^\s<]+)/g;
  linkifyHtml(s: string | null | undefined): string {
    const txt = (s ?? '').toString();
    return txt.replace(this.urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  // Keyboard handling could be here or in parent.
  // If here, we need to emit events.
  @HostListener('document:keydown', ['$event'])
  handleKey(e: KeyboardEvent) {
    // Simple pass-through logic or re-implement local shortcuts
    if (e.key === 'ArrowLeft') {
      // This logic was "bump score" in original, not prev item.
      // Original: ArrowLeft -> bump(-1), ArrowRight -> bump(1)
      // We need to know if we should handle it.
      // Let's leave complex key handling to parent or implement "bump" here.
    }
  }
}
