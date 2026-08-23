import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-brand-panel">
      <aside class="auth-brand">
        <p class="text-sm">Pista municipal</p>
        <h1>Témpano</h1>
        <p>El hielo se comparte. La talla, no.</p>
      </aside>
      <div class="auth-form-side">
        <form class="auth-form-inner" (ngSubmit)="submit()">
          <h2>Entrar</h2>
          <label class="field">
            Usuario o email
            <input
              name="identifier"
              autocomplete="off"
              [ngModel]="identifier()"
              (ngModelChange)="identifier.set($event)"
            />
          </label>
          <label class="field">
            Contraseña
            <input
              name="password"
              type="password"
              autocomplete="new-password"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
            />
          </label>
          @if (error()) {
            <p class="text-sm" style="color: var(--color-danger)">{{ error() }}</p>
          }
          <button class="btn btn-primary" type="submit" [disabled]="!canSubmit() || loading()">
            {{ loading() ? 'Entrando…' : 'Entrar' }}
          </button>
          <p class="mt-3"><a routerLink="/registro">Crear cuenta</a></p>
          <div class="auth-demo">
            Cuenta de prueba con datos<br />
            <code>demo@tempano.dev</code> · <code>demo1234</code>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  public auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly identifier = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly canSubmit = computed(() => !!this.identifier().trim() && !!this.password());

  submit(): void {
    if (!this.canSubmit()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.identifier().trim(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Credenciales inválidas');
      },
    });
  }
}
