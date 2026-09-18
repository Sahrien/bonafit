import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, forkJoin, map, switchMap, take } from 'rxjs';
import {
  BonaGridColumn,
  BonaGridComponent,
} from '../../../components/bona-grid/bona-grid.component';
import { BonaPageComponent } from '../../../components/bona-page/bona-page.component';
import { BonoDto } from '../../../models/bono.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { injectI18n } from '../../../core/i18n/inject-i18n';
import { AuthApiService } from '../../../services/auth-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';

@Component({
  selector: 'app-portal-bonos',
  standalone: true,
  imports: [BonaPageComponent, BonaGridComponent],
  templateUrl: './bonos.component.html',
  styleUrl: './bonos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonosComponent {
  private readonly auth = inject(AuthApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly router = inject(Router);

  private readonly i18n = injectI18n('bonos');
  get literals() {
    return this.i18n();
  }
  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columns = computed<BonaGridColumn[]>(() => [
    { field: 'name', header: this.literals.bono },
    { field: 'remainingSessions', header: this.literals.remainingSessions, type: 'number' },
    { field: 'purchasedAt', header: this.literals.purchasedAt, type: 'date' },
    { field: 'expiresAt', header: this.literals.expiresAt },
  ]);

  constructor() {
    this.auth
      .getSession()
      .pipe(
        take(1),
        switchMap((session) => {
          const clientId = session?.user.clientId;
          if (!clientId) {
            this.loading.set(false);
            this.error.set(this.literals.noSession);
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
          this.error.set(this.literals.loadError);
          this.loading.set(false);
        },
      });
  }

  onGoCatalog(): void {
    void this.router.navigateByUrl('/app/catalogo');
  }

  private toRows(clientBonos: ClientBonoDto[], bonos: BonoDto[]): Record<string, unknown>[] {
    const bonoById = new Map(bonos.map((bono) => [bono.id, bono]));
    return clientBonos.map((row) => ({
      id: row.id,
      name: row.isGift ? this.literals.gift : (bonoById.get(row.bonoId)?.name ?? row.bonoId),
      remainingSessions: row.remainingSessions,
      purchasedAt: row.purchasedAt,
      expiresAt: row.expiresAt ?? this.literals.noExpiry,
    }));
  }
}
