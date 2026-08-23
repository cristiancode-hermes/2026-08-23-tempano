import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type { Rink, SlotView } from '../shared/models';
import { madridToday } from '../shared/format';

@Component({
  selector: 'app-slot-admin',
  imports: [FormsModule],
  template: `
    <div class="page container">
      <h1>Franjas</h1>
      <label class="field">Pista
        <select [ngModel]="rinkId()" (ngModelChange)="rinkId.set(+$event); load()">
          @for (r of rinks(); track r.id) { <option [value]="r.id">{{ r.name }}</option> }
        </select>
      </label>
      <button class="btn btn-secondary" type="button" (click)="generate()">Generar hoy 10–21</button>
      @for (s of slots(); track s.id) {
        <div class="admin-row">
          <span>{{ s.startTime }} · {{ s.remainingSpots }} plazas</span>
          <button class="btn btn-ghost btn-sm" type="button" (click)="toggle(s)">{{ s.blocked ? 'Abrir' : 'Zamboni' }}</button>
        </div>
      }
    </div>
  `,
})
export class SlotAdminPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly rinks = signal<Rink[]>([]);
  protected readonly slots = signal<SlotView[]>([]);
  protected readonly rinkId = signal(0);

  ngOnInit(): void {
    this.api.rinks().subscribe({
      next: (r) => {
        this.rinks.set(r.items || []);
        if (r.items[0]) {
          this.rinkId.set(r.items[0].id);
          this.load();
        }
      },
    });
  }

  load(): void {
    if (!this.rinkId()) return;
    this.api.slots(this.rinkId(), madridToday()).subscribe({ next: (s) => this.slots.set(s.slots || []) });
  }

  generate(): void {
    const times = Array.from({ length: 12 }, (_, i) => `${String(i + 10).padStart(2, '0')}:00`);
    this.api.generateSlots(this.rinkId(), madridToday(), times).subscribe({ next: () => this.load() });
  }

  toggle(s: SlotView): void {
    this.api.blockSlot(s.id, !s.blocked).subscribe({ next: () => this.load() });
  }
}
