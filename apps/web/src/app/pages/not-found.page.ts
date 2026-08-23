import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="page container">
      <h1>Página no encontrada</h1>
      <a routerLink="/" class="btn btn-primary">Volver al hielo</a>
    </div>
  `,
})
export class NotFoundPageComponent {}
