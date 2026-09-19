import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { LanguageService } from '../../core/i18n/language.service';
import { injectI18n } from '../../core/i18n/inject-i18n';
import {
  STATS_PRESETS,
  StatsAppointmentStatus,
  StatsAtRiskDto,
  StatsDto,
  StatsHeatCellDto,
  StatsPreset,
  StatsRankItemDto,
  StatsSeriesPointDto,
  isStatsPreset,
} from '../../models/stats.dto';
import { StatsApiService } from '../../services/stats-api.service';

export const STATS_PRESET_STORAGE_KEY = 'bona.admin.stats.preset';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [BonaPageComponent, BonaButtonComponent, RouterLink],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsComponent {
  private readonly statsApi = inject(StatsApiService);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(LanguageService);

  private readonly i18n = injectI18n('stats');
  get literals() {
    return this.i18n();
  }

  readonly clientPath = AUTH_PATHS.adminClients;
  readonly presets = STATS_PRESETS;
  readonly loading = signal(true);
  readonly preset = signal<StatsPreset>(readStoredPreset());
  readonly stats = signal<StatsDto | null>(null);

  readonly economy = computed(() => this.stats()?.economy ?? null);
  readonly agenda = computed(() => this.stats()?.agenda ?? null);
  readonly clients = computed(() => this.stats()?.clients ?? null);
  readonly economyEmpty = computed(() => {
    const economy = this.economy();
    return !!economy && economy.mix.packs.units + economy.mix.singles.units + economy.mix.gifts.units === 0;
  });
  readonly agendaEmpty = computed(() => (this.agenda()?.appointmentCount ?? 0) === 0);
  readonly seriesMax = computed(() => maxRevenue(this.economy()?.series ?? []));
  readonly rankingMax = computed(() => maxRevenue(this.economy()?.ranking ?? []));
  readonly heatMax = computed(() =>
    (this.agenda()?.heatmap ?? []).reduce((max, cell) => Math.max(max, cell.count), 0),
  );
  readonly statusMax = computed(() =>
    (this.agenda()?.statuses ?? []).reduce((max, item) => Math.max(max, item.count), 0),
  );

  constructor() {
    this.load();
  }

  presetLabel(preset: StatsPreset): string {
    return this.literals.presets[preset];
  }

  weekdayLabel(weekday: number): string {
    return this.literals.weekdays[String(weekday) as '1' | '2' | '3' | '4' | '5' | '6' | '7'];
  }

  statusLabel(status: StatsAppointmentStatus): string {
    const labels = {
      pending: this.literals.statusPending,
      confirmed: this.literals.statusConfirmed,
      completed: this.literals.statusCompleted,
      cancelled: this.literals.statusCancelled,
    };
    return labels[status];
  }

  heatGrid(): string {
    const hours = this.agenda()?.heatmapHours.length || 15;
    return `1.4rem repeat(${hours}, minmax(0.7rem, 1fr))`;
  }

  heatCell(weekday: number, hour: number): StatsHeatCellDto | undefined {
    return this.agenda()?.heatmap.find((cell) => cell.weekday === weekday && cell.hour === hour);
  }

  heatStyle(count: number): string {
    const max = this.heatMax();
    if (max <= 0 || count <= 0) {
      return 'transparent';
    }
    const ratio = Math.max(0.18, count / max);
    return `color-mix(in srgb, var(--bona-color-primary) ${Math.round(ratio * 100)}%, var(--bona-color-nested))`;
  }

  onPreset(preset: StatsPreset): void {
    if (this.preset() === preset) {
      return;
    }
    this.preset.set(preset);
    persistPreset(preset);
    this.load();
  }

  money(value: number): string {
    return new Intl.NumberFormat(this.language.locale(), {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(value);
  }

  percent(value: number | null): string {
    if (value === null) {
      return this.literals.noData;
    }
    return new Intl.NumberFormat(this.language.locale(), {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value);
  }

  signedMoney(value: number): string {
    const formatted = this.money(Math.abs(value));
    if (value > 0) {
      return `+${formatted}`;
    }
    if (value < 0) {
      return `−${formatted}`;
    }
    return formatted;
  }

  barPercent(value: number, max: number): string {
    if (max <= 0 || value <= 0) {
      return '0%';
    }
    return `${Math.max(8, Math.round((value / max) * 100))}%`;
  }

  rankKind(item: StatsRankItemDto): string {
    return item.kind === 'pack' ? this.literals.rankPack : this.literals.rankService;
  }

  riskLabel(item: StatsAtRiskDto): string {
    return item.reason === 'expiring' ? this.literals.atRiskExpiring : this.literals.atRiskNoSessions;
  }

  clientHref(id: string): string {
    return `${this.clientPath}/${id}`;
  }

  private load(): void {
    this.loading.set(true);
    this.statsApi
      .getStats(this.preset())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.stats.set(null);
          this.loading.set(false);
          this.toast.error(this.loadError(error));
        },
      });
  }

  private loadError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.literals.errorConnection;
    }
    return this.literals.errorLoad;
  }
}

function readStoredPreset(): StatsPreset {
  try {
    return isStatsPreset(localStorage.getItem(STATS_PRESET_STORAGE_KEY))
      ? (localStorage.getItem(STATS_PRESET_STORAGE_KEY) as StatsPreset)
      : '30d';
  } catch {
    return '30d';
  }
}

function persistPreset(preset: StatsPreset): void {
  try {
    localStorage.setItem(STATS_PRESET_STORAGE_KEY, preset);
  } catch {
    return;
  }
}

function maxRevenue(items: Array<StatsSeriesPointDto | StatsRankItemDto>): number {
  return items.reduce((max, item) => Math.max(max, item.paidRevenue), 0);
}
