import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="crt landing synthwave d-flex flex-column justify-content-center align-items-center text-light text-center">
      <!-- Synthwave background layers -->
      <div class="synthwave-bg">
        <div class="synthwave-sky"></div>
        <div class="synthwave-stars"></div>
        <div class="synthwave-sun"></div>
        <div class="synthwave-horizon"></div>
        <div class="synthwave-grid">
          <div class="synthwave-grid-lines"></div>
          <div class="synthwave-grid-glow"></div>
        </div>
        <div class="synthwave-haze"></div>
      </div>
      
      <!-- Content on top of background -->
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
