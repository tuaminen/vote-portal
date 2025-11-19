import { Component, EventEmitter, Input, Output, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemMeta, Vote, VoteService } from '../vote.service';

@Component({
  selector: 'app-voting',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Full-screen voting interface with background image -->
    <ng-container *ngIf="current">
      <div class="voting-fullscreen">
        <!-- Background Image -->
        <div class="voting-background">
          <img [src]="voteService.imageUrl(current.id)" 
               [alt]="current.description" 
               loading="eager"
               class="voting-background-image"/>
          <!-- Dark gradient overlay for better readability -->
          <div class="voting-overlay-gradient"></div>
        </div>

        <!-- Fixed Progress Bar at Top -->
        <div class="voting-header">
          <div class="container-fluid px-4 py-3">
            <div class="d-flex align-items-center gap-3">
              <div class="crt-rgb fs-3 fw-bold text-truncate">{{ nickname || '—' }}</div>
              <div class="crt-flicker progress flex-grow-1">
                <div class="progress-bar" role="progressbar" [style.width.%]="items.length ? (currentIndex / items.length) * 100 : 0"></div>
              </div>
              <div class="crt-rgb fs-3 fw-bold">{{ items.length ? (currentIndex + 1) : 0 }} / {{ items.length }}</div>
            </div>
          </div>
        </div>

        <!-- Bottom Overlay with Controls -->
        <div class="voting-controls-overlay">
          <!-- Description Text -->
          <div class="text-center mb-3 px-3">
            <div class="crt-rgb fs-4 fw-semibold desc" [innerHTML]="linkifyHtml(current.description)"></div>
          </div>

          <!-- Voting Buttons -->
          <div class="d-flex justify-content-center mb-3">
            <div class="btn-group btn-group-lg gap-2 flex-wrap justify-content-center">
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

          <!-- Navigation Buttons -->
          <div class="d-flex align-items-center justify-content-center gap-3 pb-4">
            <button class="crt-rgb crt-flicker btn fs-3 btn-primary text-white px-5 py-3" (click)="prev.emit()" aria-label="Edellinen">
              <i class="bi bi-arrow-left me-2"></i> Edellinen
            </button>
            <button class="crt-rgb crt-flicker btn fs-3 btn-primary text-white px-5 py-3" (click)="next.emit()" aria-label="Seuraava">
              Seuraava <i class="bi bi-arrow-right ms-2"></i>
            </button>
          </div>
        </div>
      </div>
    </ng-container>
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
