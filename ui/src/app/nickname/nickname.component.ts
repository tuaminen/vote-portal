import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-nickname',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="nickname-overlay">
      <div class="nick-card p-4 rounded-4 crt crt-flicker btn btn-primary">
        <div class="fs-1 mb-3 text-uppercase text-center">Nimimerkki</div>
        <input class="form-control form-control-lg text-center fs-2 fs-bold" 
               [(ngModel)]="nickname" 
               placeholder="kirjoita nimimerkki…" 
               (keyup.enter)="onSave()"/>
        <button class="crt-rgb fs-2 fs-bold btn btn-dark btn-lg w-100 mt-3" (click)="onSave()">
          <i class="bi bi-check2-circle me-2"></i>Aloita
        </button>
      </div>
    </div>
  `
})
export class NicknameComponent {
    @Input() nickname = '';
    @Output() nicknameSaved = new EventEmitter<string>();

    onSave() {
        const trimmed = (this.nickname || '').trim();
        if (trimmed) {
            this.nicknameSaved.emit(trimmed);
        }
    }
}
