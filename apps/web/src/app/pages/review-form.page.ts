import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-review-form',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page container">
      <h1>Reseña</h1>
      <label class="field">Nota (1–5)
        <input type="number" min="1" max="5" [ngModel]="rating()" (ngModelChange)="rating.set(+$event)" />
      </label>
      <label class="field">Comentario
        <textarea [ngModel]="comment()" (ngModelChange)="comment.set($event)"></textarea>
      </label>
      @if (error()) { <p style="color:var(--color-danger)">{{ error() }}</p> }
      <button class="btn btn-primary" type="button" (click)="save()">Publicar</button>
      <a routerLink="/pistas">Cancelar</a>
    </div>
  `,
})
export class ReviewFormPageComponent {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly rating = signal(5);
  protected readonly comment = signal('');
  protected readonly error = signal('');

  save(): void {
    this.api.createReview(Number(this.id()), { rating: this.rating(), comment: this.comment() }).subscribe({
      next: () => void this.router.navigate(['/pistas', this.id()]),
      error: (err) => this.error.set(err?.error?.message || 'No se pudo publicar'),
    });
  }
}
