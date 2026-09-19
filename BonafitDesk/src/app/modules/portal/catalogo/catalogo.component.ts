import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, filter, forkJoin, map, switchMap, take } from 'rxjs';
import { BonaConfirm } from '../../../components/bona-confirm/bona-confirm.service';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../../components/bona-grid/bona-grid.component';
import { BonaPageComponent } from '../../../components/bona-page/bona-page.component';
import { BonaToast } from '../../../components/bona-toast/bona-toast.service';
import { injectI18n } from '../../../core/i18n/inject-i18n';
import { bestCoupon, pricedOffer } from '../../../core/pricing';
import { BonoDto } from '../../../models/bono.dto';
import { ClientCouponDto } from '../../../models/client-coupon.dto';
import { ServiceDto } from '../../../models/service.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';

@Component({
  selector: 'app-portal-catalogo',
  standalone: true,
  imports: [BonaPageComponent, BonaGridComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoComponent {
  private readonly auth = inject(AuthApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);

  private readonly i18n = injectI18n('catalogo');
  get literals() {
    return this.i18n();
  }
  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columns = computed<BonaGridColumn[]>(() => [
    { field: 'serviceName', header: this.literals.service },
    { field: 'offerName', header: this.literals.offer },
    { field: 'sessionCount', header: this.literals.sessions, type: 'number' },
    {
      field: 'price',
      header: this.literals.price,
      type: 'currency',
      compareField: 'listPrice',
    },
  ]);

  readonly actions = computed<BonaGridAction[]>(() => [
    { label: this.literals.contract, action: 'contract' },
  ]);

  private clientId = '';

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
          this.clientId = clientId;
          return this.loadRows();
        }),
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

  onContract(event: BonaGridActionEvent): void {
    if (event.action !== 'contract' || !this.clientId) {
      return;
    }

    const bonoId = String(event.item['bonoId'] ?? '');
    if (!bonoId) {
      return;
    }

    this.confirm
      .open({
        title: this.literals.confirmContractTitle,
        message: this.literals.confirmContractMessage,
        confirmLabel: this.literals.contract,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => {
          const couponId = String(event.item['couponId'] ?? '');
          return this.clientsApi.contractBono({
            clientId: this.clientId,
            bonoId,
            ...(couponId ? { couponId } : {}),
          });
        }),
        switchMap(() => this.loadRows()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.toast.success(this.literals.contracted);
        },
        error: () => this.toast.error(this.literals.contractError),
      });
  }

  private loadRows() {
    return forkJoin({
      services: this.servicesApi.getServices(),
      bonos: this.servicesApi.getBonos(),
      coupons: this.clientsApi.getCoupons(this.clientId),
    }).pipe(map(({ services, bonos, coupons }) => this.toRows(services, bonos, coupons)));
  }

  private toRows(
    services: ServiceDto[],
    bonos: BonoDto[],
    coupons: ClientCouponDto[],
  ): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];

    for (const service of services) {
      for (const bono of bonos.filter((row) => row.serviceId === service.id)) {
        const coupon = bestCoupon(
          coupons,
          service.id,
          bono.id,
          bono.price,
          service.saleKind,
          service.saleValue,
        );
        const priced = pricedOffer(bono.price, service.saleKind, service.saleValue, coupon);
        rows.push({
          id: bono.id,
          bonoId: bono.id,
          serviceId: service.id,
          serviceName: service.name,
          offerName: bono.name,
          sessionCount: bono.sessionCount,
          listPrice: priced.listPrice,
          price: priced.paidPrice,
          couponId: coupon?.id ?? '',
        });
      }
    }

    return rows;
  }
}
