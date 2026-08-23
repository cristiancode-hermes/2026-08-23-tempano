import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-account',
  template: `
    <div class="page container">
      <h1>Cuenta</h1>
      @if (auth.user(); as u) {
        <p><strong>{{ u.username }}</strong> · {{ u.email }}</p>
        <p class="total">{{ u.points ?? 0 }} pts de hielo</p>
        <p class="text-sm">Los puntos se ganan al completar sesiones (5 × grupo).</p>
      }
    </div>
  `,
})
export class AccountPageComponent {
  public auth = inject(AuthService);
}
