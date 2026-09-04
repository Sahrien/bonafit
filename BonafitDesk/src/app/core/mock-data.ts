import { AppointmentDto } from '../models/appointment.dto';
import { AuthSessionDto, AuthUserDto } from '../models/auth-session.dto';
import { BonoDto } from '../models/bono.dto';
import { ClientBonoDto } from '../models/client-bono.dto';
import { ClientDto } from '../models/client.dto';
import { ServiceDto } from '../models/service.dto';
import { TrainerDto } from '../models/trainer.dto';

export interface MockDatabase {
  trainers: TrainerDto[];
  clients: ClientDto[];
  services: ServiceDto[];
  bonos: BonoDto[];
  clientBonos: ClientBonoDto[];
  appointments: AppointmentDto[];
  accounts: AuthUserDto[];
}

export const MOCK_TRAINERS: TrainerDto[] = [
  { id: 'trainer-1', name: 'Alex Martin' },
  { id: 'trainer-2', name: 'Sam Ortega' },
];

export const MOCK_CLIENTS: ClientDto[] = [
  {
    id: 'client-1',
    firstName: 'Marina',
    lastName: 'Lopez',
    email: 'marina.lopez@example.com',
    phone: '+34000000001',
    notes: '',
  },
  {
    id: 'client-2',
    firstName: 'Pablo',
    lastName: 'Nieto',
    email: 'pablo.nieto@example.com',
    phone: '+34000000002',
    notes: 'knee',
  },
  {
    id: 'client-3',
    firstName: 'Iris',
    lastName: 'Vega',
    email: 'iris.vega@example.com',
    phone: '+34000000003',
    notes: '',
  },
];

export const MOCK_SERVICES: ServiceDto[] = [
  {
    id: 'svc-ep',
    category: 'entrenamiento-personal',
    name: 'entrenamiento-personal',
    allowsSingleSession: false,
  },
  {
    id: 'svc-hipo',
    category: 'hipopresivos',
    name: 'hipopresivos',
    allowsSingleSession: false,
  },
  {
    id: 'svc-masaje',
    category: 'masaje',
    name: 'masaje',
    allowsSingleSession: true,
    singleSessionPrice: 45,
  },
];

export const MOCK_BONOS: BonoDto[] = [
  {
    id: 'bono-ep-10',
    serviceId: 'svc-ep',
    name: 'pack-10',
    description: 'sessions-10',
    sessionCount: 10,
    price: 400,
  },
  {
    id: 'bono-ep-5',
    serviceId: 'svc-ep',
    name: 'pack-5',
    description: 'sessions-5',
    sessionCount: 5,
    price: 220,
  },
  {
    id: 'bono-hipo-8',
    serviceId: 'svc-hipo',
    name: 'pack-8',
    description: 'sessions-8',
    sessionCount: 8,
    price: 240,
  },
  {
    id: 'bono-masaje-5',
    serviceId: 'svc-masaje',
    name: 'pack-5',
    description: 'sessions-5',
    sessionCount: 5,
    price: 200,
  },
];

export const MOCK_CLIENT_BONOS: ClientBonoDto[] = [
  {
    id: 'cb-1',
    clientId: 'client-1',
    bonoId: 'bono-ep-10',
    remainingSessions: 7,
    purchasedAt: '2026-06-01T10:00:00.000Z',
    expiresAt: '2026-12-01T10:00:00.000Z',
  },
  {
    id: 'cb-2',
    clientId: 'client-2',
    bonoId: 'bono-hipo-8',
    remainingSessions: 3,
    purchasedAt: '2026-07-15T10:00:00.000Z',
    expiresAt: null,
  },
];

export const MOCK_APPOINTMENTS: AppointmentDto[] = [
  {
    id: 'apt-1',
    trainerId: 'trainer-1',
    clientId: 'client-1',
    serviceId: 'svc-ep',
    clientBonoId: 'cb-1',
    startsAt: '2026-09-07T08:00:00.000Z',
    endsAt: '2026-09-07T09:00:00.000Z',
    location: 'studio-1',
  },
  {
    id: 'apt-2',
    trainerId: 'trainer-2',
    clientId: 'client-2',
    serviceId: 'svc-hipo',
    clientBonoId: 'cb-2',
    startsAt: '2026-09-07T09:30:00.000Z',
    endsAt: '2026-09-07T10:15:00.000Z',
    location: 'studio-2',
  },
  {
    id: 'apt-3',
    trainerId: 'trainer-1',
    clientId: 'client-3',
    serviceId: 'svc-masaje',
    startsAt: '2026-09-08T16:00:00.000Z',
    endsAt: '2026-09-08T17:00:00.000Z',
    location: 'studio-1',
  },
];

export const MOCK_ACCOUNTS: AuthUserDto[] = [
  {
    id: 'user-trainer-1',
    displayName: 'Alex Martin',
    role: 'admin',
    trainerId: 'trainer-1',
  },
  {
    id: 'user-trainer-2',
    displayName: 'Sam Ortega',
    role: 'admin',
    trainerId: 'trainer-2',
  },
  {
    id: 'user-client-1',
    displayName: 'Marina Lopez',
    role: 'client',
    clientId: 'client-1',
  },
];

export function createMockDatabase(): MockDatabase {
  return structuredClone({
    trainers: MOCK_TRAINERS,
    clients: MOCK_CLIENTS,
    services: MOCK_SERVICES,
    bonos: MOCK_BONOS,
    clientBonos: MOCK_CLIENT_BONOS,
    appointments: MOCK_APPOINTMENTS,
    accounts: MOCK_ACCOUNTS,
  });
}

export function createMockSession(user: AuthUserDto): AuthSessionDto {
  return {
    user: structuredClone(user),
    token: `mock-${user.id}`,
  };
}
