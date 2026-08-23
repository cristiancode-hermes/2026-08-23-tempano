import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import type { Rink } from '../shared/models';

@Component({
  selector: 'app-rink-admin',
  template: `
    <div class="page container">
      <h1>Pistas</h1>
      @for (r of items(); track r.id) {
        <div class="admin-row">
          <span>{{ r.name }} · {{ r.mode }} · aforo {{ r.capacity }}</span>
          <span>{{ r.active ? 'activa' : 'off' }}</span>
        </div>
      }
    </div>
  `,
})
export class RinkAdminPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<Rink[]>([]);
  ngOnInit(): void {
    this.api.rinks().subscribe({ next: (r) => this.items.set(r.items || []) });
  }
}
