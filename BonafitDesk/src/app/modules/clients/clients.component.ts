import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonaInputTextFieldComponent } from '../../components/bona-input-text-field/bona-input-text-field.component';
import { ClientDto } from '../../models/client.dto';
import { ClientsApiService } from '../../services/clients-api.service';
import { CLIENTS_LITERALS } from './clients.literals';

const NEW_CLIENT_ID = 'new';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [BonaGridComponent, BonaButtonComponent, BonaInputTextFieldComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsComponent {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = CLIENTS_LITERALS;
  readonly search = signal('');
  private readonly clients = signal<ClientDto[]>([]);

  readonly columns: BonaGridColumn[] = [
    { field: 'firstName', header: CLIENTS_LITERALS.firstName },
    { field: 'lastName', header: CLIENTS_LITERALS.lastName },
    { field: 'email', header: CLIENTS_LITERALS.email },
    { field: 'phone', header: CLIENTS_LITERALS.phone },
  ];

  readonly actions: BonaGridAction[] = [
    { label: CLIENTS_LITERALS.edit, action: 'edit' },
    { label: CLIENTS_LITERALS.delete, action: 'delete' },
  ];

  readonly rows = computed(() => {
    const query = this.search().trim().toLowerCase();
    const source = this.clients();
    const filtered = query
      ? source.filter((client) => this.matches(client, query))
      : source;
    return filtered.map((client) => ({ ...client }));
  });

  constructor() {
    this.loadClients();
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  onCreate(): void {
    void this.router.navigate(['/admin/clients', NEW_CLIENT_ID]);
  }

  onRowClick(item: Record<string, unknown>): void {
    this.openFicha(String(item['id'] ?? ''));
  }

  onRowAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    if (event.action === 'edit') {
      this.openFicha(id);
      return;
    }
    if (event.action === 'delete' && id) {
      this.deleteClient(id);
    }
  }

  private openFicha(id: string): void {
    if (!id) {
      return;
    }
    void this.router.navigate(['/admin/clients', id]);
  }

  private deleteClient(id: string): void {
    this.clientsApi
      .deleteClient(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadClients(),
      });
  }

  private loadClients(): void {
    this.clientsApi
      .getClients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clients) => this.clients.set(clients));
  }

  private matches(client: ClientDto, query: string): boolean {
    return [client.firstName, client.lastName, client.email, client.phone]
      .join(' ')
      .toLowerCase()
      .includes(query);
  }
}
