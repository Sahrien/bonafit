export type StatsPreset = '7d' | '30d' | 'month' | '90d';

export const STATS_PRESETS: readonly StatsPreset[] = ['7d', '30d', 'month', '90d'];

export type StatsRankKind = 'service' | 'pack';
export type StatsAtRiskReason = 'expiring' | 'noSessions';
export type StatsAppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface StatsSeriesPointDto {
  bucket: string;
  paidRevenue: number;
}

export interface StatsRankItemDto {
  kind: StatsRankKind;
  id: string;
  name: string;
  paidRevenue: number;
  units: number;
}

export interface StatsMixSliceDto {
  units: number;
  paidRevenue: number;
}

export interface StatsMixDto {
  packs: StatsMixSliceDto;
  singles: StatsMixSliceDto;
  gifts: StatsMixSliceDto;
}

export interface StatsEconomyDto {
  paidRevenue: number;
  previousPaidRevenue: number;
  revenueDelta: number;
  averageTicket: number;
  discountRate: number | null;
  paidCount: number;
  previousPaidCount: number;
  series: StatsSeriesPointDto[];
  ranking: StatsRankItemDto[];
  mix: StatsMixDto;
}

export interface StatsHeatCellDto {
  weekday: number;
  hour: number;
  count: number;
}

export interface StatsStatusCountDto {
  status: StatsAppointmentStatus;
  count: number;
  previousCount: number;
}

export interface StatsTrainerOccupancyDto {
  trainerId: string;
  name: string;
  bookedMinutes: number;
  scheduleMinutes: number;
  occupancyRate: number | null;
}

export interface StatsEmptySlotDto {
  weekday: number;
  startTime: string;
  endTime: string;
  emptyDays: number;
  scheduledDays: number;
}

export interface StatsAgendaDto {
  appointmentCount: number;
  previousAppointmentCount: number;
  occupancyRate: number | null;
  previousOccupancyRate: number | null;
  heatmap: StatsHeatCellDto[];
  heatmapHours: number[];
  statuses: StatsStatusCountDto[];
  trainers: StatsTrainerOccupancyDto[];
  emptySlots: StatsEmptySlotDto[];
}

export interface StatsAtRiskDto {
  clientId: string;
  name: string;
  reason: StatsAtRiskReason;
  remainingSessions: number;
  expiresAt: string | null;
}

export interface StatsClientsDto {
  activeCount: number;
  previousActiveCount: number;
  newCount: number;
  previousNewCount: number;
  recurringCount: number;
  previousRecurringCount: number;
  formsPending: number;
  formsCompleted: number;
  previousFormsCompleted: number;
  atRisk: StatsAtRiskDto[];
}

export interface StatsDto {
  timezone: string;
  preset: StatsPreset;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  economy: StatsEconomyDto;
  agenda: StatsAgendaDto;
  clients: StatsClientsDto;
}

export function isStatsPreset(value: unknown): value is StatsPreset {
  return value === '7d' || value === '30d' || value === 'month' || value === '90d';
}

export const EMPTY_STATS_MIX: StatsMixDto = {
  packs: { units: 0, paidRevenue: 0 },
  singles: { units: 0, paidRevenue: 0 },
  gifts: { units: 0, paidRevenue: 0 },
};

export const EMPTY_STATS_AGENDA: StatsAgendaDto = {
  appointmentCount: 0,
  previousAppointmentCount: 0,
  occupancyRate: null,
  previousOccupancyRate: null,
  heatmap: [],
  heatmapHours: [],
  statuses: [],
  trainers: [],
  emptySlots: [],
};

export const EMPTY_STATS_CLIENTS: StatsClientsDto = {
  activeCount: 0,
  previousActiveCount: 0,
  newCount: 0,
  previousNewCount: 0,
  recurringCount: 0,
  previousRecurringCount: 0,
  formsPending: 0,
  formsCompleted: 0,
  previousFormsCompleted: 0,
  atRisk: [],
};
