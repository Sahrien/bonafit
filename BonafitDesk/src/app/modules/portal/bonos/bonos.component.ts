import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, forkJoin, map, switchMap, take } from 'rxjs';
import {
  BonaGridColumn,
  BonaGridComponent,
} from '../../../components/bona-grid/bona-grid.component';
import { BonoDto } from '../../../models/bono.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';
import { BONOS_LITERALS } from './bonos.literals';

@Component({
  selector: 'app-portal-bonos',
  standalone: true,
  imports: [BonaGridComponent],
  templateUrl: './bonos.component.html',
  styleUrl: './bonos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonosComponent {
  private readonly auth = inject(AuthApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);

  readonly literals = BONOS_LITERALS;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columns: BonaGridColumn[] = [
    { field: 'name', header: BONOS_LITERALS.bono },
    { field: 'remainingSessions', header: BONOS_LITERALS.remainingSessions, type: 'number' },
    { field: 'purchasedAt', header: BONOS_LITERALS.purchasedAt, type: 'date' },
    { field: 'expiresAt', header: BONOS_LITERALS.expiresAt },
  ];

  constructor() {
    this.auth
      .getSession()
      .pipe(
        take(1),
        switchMap((session) => {
          const clientId = session?.user.clientId;
          if (!clientId) {
            this.loading.set(false);
            this.error.set(BONOS_LITERALS.noSession);
            return EMPTY;
          }
          return forkJoin({
            clientBonos: this.clientsApi.getClientBonos(clientId),
            bonos: this.servicesApi.getBonos(),
          });
        }),
        map(({ clientBonos, bonos }) => this.toRows(clientBonos, bonos)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(BONOS_LITERALS.loadError);
          this.loading.set(false);
        },
      });
  }

  private toRows(clientBonos: ClientBonoDto[], bonos: BonoDto[]): Record<string, unknown>[] {
    const bonoById = new Map(bonos.map((bono) => [bono.id, bono]));
    return clientBonos.map((row) => ({
      id: row.id,
      name: bonoById.get(row.bonoId)?.name ?? row.bonoId,
      remainingSessions: row.remainingSessions,
      purchasedAt: row.purchasedAt,
      expiresAt: row.expiresAt ?? BONOS_LITERALS.noExpiry,
    }));
  }
}
