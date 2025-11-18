import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="crt landing d-flex flex-column justify-content-center align-items-center text-light text-center">
      <h1 class="glitch" [attr.data-text]="title">{{ title }}</h1>
      <button class="crt-rgb crt crt-curved btn btn-lg btn-primary fs-1 px-5 py-3 mt-5" (click)="start.emit()">
        Let's vote!
        <i class="bi bi-hand-thumbs-up me-2"></i>
      </button>
    </div>
  `
})
export class LandingComponent {
    @Input() title = '';
    @Output() start = new EventEmitter<void>();
}
