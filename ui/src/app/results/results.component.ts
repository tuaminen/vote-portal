import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemMeta, ResultItem, VoteDistribution, VoteService } from '../vote.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results-page">
      <div class="d-flex align-items-end justify-content-between mb-3 flex-wrap gap-3 m-8">
        <div>
          <h1 class="crt glitch fw-bold text-uppercase" data-text="Tulokset">Tulokset</h1>
          <div class="text-white-50">Järjestetty korkeimmasta scoresta alaspäin</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn fs-2 btn-primary text-white px-4 py-2" (click)="reset.emit()"><i class="bi bi-arrow-counterclockwise me-2"></i>Muuta ääniä</button>
        </div>
      </div>

      <div class="table-responsive rounded-4 overflow-hidden results-wrap mb-5">
        <table class="crt table-striped table-hover align-middle results-table results-wrap">
          <thead>
            <tr class="text-uppercase fs-4 text-white">
              <th class="px-3">#</th>
              <th>Kuva</th>
              <th>Kuvaus</th>
              <th class="text-center">Jakauma</th>
              <th class="text-end">Äänestäjiä</th>
              <th class="text-end">Pisteet</th>
              <th class="text-center">K.A.</th>
              <th class="text-center"><i class="bi bi-hand-thumbs-up me-2"></i></th>
              <th class="text-center"><i class="bi bi-hand-thumbs-down me-2"></i></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of results; let i = index">
              <td class="px-3 fs-2 fw-bold">{{ i + 1 }}</td>
              <td >
                <img [src]="voteService.imageUrl(r.item_id)" class="img-thumbnail" alt="thumb"/>
              </td>
              <td class="desc fs-5" [innerHTML]="linkifyHtml(descriptionOf(r.item_id))"></td>
              <td class="text-center">
                <div class="vote-histogram">
                  <div class="histogram-bar-group">
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, -5)"
                         [title]="'-5: ' + getVoteCountForScore(r.item_id, -5)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, -4)"
                         [title]="'-4: ' + getVoteCountForScore(r.item_id, -4)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, -3)"
                         [title]="'-3: ' + getVoteCountForScore(r.item_id, -3)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, -2)"
                         [title]="'-2: ' + getVoteCountForScore(r.item_id, -2)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, -1)"
                         [title]="'-1: ' + getVoteCountForScore(r.item_id, -1)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, 0)"
                         [title]="'0: ' + getVoteCountForScore(r.item_id, 0)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, 1)"
                         [title]="'1: ' + getVoteCountForScore(r.item_id, 1)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, 2)"
                         [title]="'2: ' + getVoteCountForScore(r.item_id, 2)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, 3)"
                         [title]="'3: ' + getVoteCountForScore(r.item_id, 3)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, 4)"
                         [title]="'4: ' + getVoteCountForScore(r.item_id, 4)">
                    </div>
                    <div class="histogram-bar" 
                         [style.height.%]="getBarHeightForScore(r.item_id, 5)"
                         [title]="'5: ' + getVoteCountForScore(r.item_id, 5)">
                    </div>
                  </div>
                </div>
              </td>
              <td class="text-end fs-2">{{ r.voters }}</td>
              <td class="text-end fs-2 fw-bold">{{ r.score }}</td>
              <td class="text-end fs-2">{{ r.average | number:'1.2-2' }}</td>
              <td class="text-end fs-2"><span class="badge bg-success-subtle text-white px-3 py-2">{{ r.pos }}</span></td>
              <td class="text-end fs-2"><span class="badge bg-danger-subtle text-white px-3 py-2 mx-3">{{ r.neg }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .vote-histogram {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 40px;
      padding: 2px;
    }

    .histogram-bar-group {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 1px;
      height: 100%;
      width: 100%;
    }

    .histogram-bar {
      flex: 0 0 3px;
      width: 3px;
      min-height: 2px;
      max-height: 100%;
      background: #ffffff;
      transition: opacity 0.2s ease;
      opacity: 0.85;
    }

    .histogram-bar:hover {
      opacity: 1;
    }
  `]
})
export class ResultsComponent {
  voteService = inject(VoteService);

  @Input() results: ResultItem[] = [];
  @Input() items: ItemMeta[] = [];
  @Input() distributions: VoteDistribution[] = [];
  @Output() reset = new EventEmitter<void>();

  descriptionOf(id: number) { return this.items.find(i => i.id === id)?.description || ''; }

  private urlRegex = /(https?:\/\/[^\s<]+)/g;
  linkifyHtml(s: string | null | undefined): string {
    const txt = (s ?? '').toString();
    return txt.replace(this.urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  getDistribution(itemId: number): Record<number, number> {
    const dist = this.distributions.find(d => d.item_id === itemId);
    return dist?.distribution || {};
  }

  getVoteCountForScore(itemId: number, score: number): number {
    const dist = this.getDistribution(itemId);
    return dist[score] || 0;
  }

  getMaxVoteCount(itemId: number): number {
    const dist = this.getDistribution(itemId);
    const counts = Object.values(dist);
    return counts.length > 0 ? Math.max(...counts) : 0;
  }

  getBarHeightForScore(itemId: number, score: number): number {
    const count = this.getVoteCountForScore(itemId, score);
    const max = this.getMaxVoteCount(itemId);
    if (max === 0) return 0;
    return Math.max((count / max) * 100, count > 0 ? 10 : 0);
  }
}
