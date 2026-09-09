import { AppointmentDto } from '../models/appointment.dto';
import { AuthSessionDto, AuthUserDto } from '../models/auth-session.dto';
import { BonoDto } from '../models/bono.dto';
import { BookingSettingsDto } from '../models/booking-settings.dto';
import { ClientBonoDto } from '../models/client-bono.dto';
import { ClientDto } from '../models/client.dto';
import { FormAssignmentDto, FormDto, FormQuestionDto } from '../models/form.dto';
import { ServiceDto } from '../models/service.dto';
import { TrainerScheduleDto } from '../models/trainer-schedule.dto';
import { TrainerDto } from '../models/trainer.dto';

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
    instantConfirm: true,
  },
  {
    id: 'client-2',
    firstName: 'Pablo',
    lastName: 'Nieto',
    email: 'pablo.nieto@example.com',
    phone: '+34000000002',
    notes: 'knee',
    instantConfirm: false,
  },
  {
    id: 'client-3',
    firstName: 'Iris',
    lastName: 'Vega',
    email: 'iris.vega@example.com',
    phone: '+34000000003',
    notes: '',
    instantConfirm: false,
  },
];

export const MOCK_SERVICES: ServiceDto[] = [
  {
    id: 'svc-ep',
    category: 'entrenamiento-personal',
    name: 'entrenamiento-personal',
    allowsSingleSession: false,
    durationMinutes: 60,
    bookableByClient: true,
    active: true,
  },
  {
    id: 'svc-hipo',
    category: 'hipopresivos',
    name: 'hipopresivos',
    allowsSingleSession: false,
    durationMinutes: 45,
    bookableByClient: true,
    active: true,
  },
  {
    id: 'svc-masaje',
    category: 'masaje',
    name: 'masaje',
    allowsSingleSession: true,
    singleSessionPrice: 45,
    durationMinutes: 60,
    bookableByClient: false,
    active: true,
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
    id: 'bono-masaje-1',
    serviceId: 'svc-masaje',
    name: 'sesion-suelta',
    description: 'sessions-1',
    sessionCount: 1,
    price: 45,
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
    status: 'completed',
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
    status: 'completed',
  },
  {
    id: 'apt-3',
    trainerId: 'trainer-1',
    clientId: 'client-3',
    serviceId: 'svc-masaje',
    startsAt: '2026-09-08T16:00:00.000Z',
    endsAt: '2026-09-08T17:00:00.000Z',
    location: 'studio-1',
    status: 'confirmed',
  },
];

function weekdaySchedules(trainerId: string, prefix: string): TrainerScheduleDto[] {
  return [1, 2, 3, 4, 5].map((weekday) => ({
    id: `${prefix}-${weekday}`,
    trainerId,
    weekday,
    startTime: '08:00',
    endTime: '18:00',
  }));
}

export const MOCK_TRAINER_SCHEDULES: TrainerScheduleDto[] = [
  ...weekdaySchedules('trainer-1', 'sch-1'),
  ...weekdaySchedules('trainer-2', 'sch-2'),
];

export const MOCK_BOOKING_SETTINGS: BookingSettingsDto = {
  id: 'booking-settings',
  nextDayCutoffTime: '18:00',
  defaultLocation: 'studio-1',
};

const MOCK_FORM_QUESTIONS: FormQuestionDto[] = [
  {
    id: 'q-1',
    prompt: '¿Tienes alguna lesión o molestia actual?',
    type: 'yesno',
    required: true,
    sortOrder: 0,
  },
  {
    id: 'q-2',
    prompt: 'Describe la lesión o indica ninguna',
    type: 'text',
    required: false,
    sortOrder: 1,
  },
  {
    id: 'q-3',
    prompt: '¿Cuál es tu objetivo principal?',
    type: 'singleChoice',
    required: true,
    sortOrder: 2,
    options: [
      { id: 'opt-strength', label: 'Fuerza', sortOrder: 0 },
      { id: 'opt-weight', label: 'Pérdida de peso', sortOrder: 1 },
      { id: 'opt-health', label: 'Salud general', sortOrder: 2 },
    ],
  },
];

export const MOCK_FORMS: FormDto[] = [
  {
    id: 'form-1',
    title: 'Cuestionario inicial',
    description: 'Datos de salud y objetivos para el primer mes.',
    questions: MOCK_FORM_QUESTIONS,
  },
];

export const MOCK_FORM_ASSIGNMENTS: FormAssignmentDto[] = [
  {
    id: 'fa-1',
    formId: 'form-1',
    clientId: 'client-1',
    title: 'Cuestionario inicial',
    questions: MOCK_FORM_QUESTIONS,
    status: 'pending',
    assignedAt: '2026-09-01T10:00:00.000Z',
    submittedAt: null,
    answers: [],
  },
  {
    id: 'fa-2',
    formId: 'form-1',
    clientId: 'client-2',
    title: 'Cuestionario inicial',
    questions: MOCK_FORM_QUESTIONS,
    status: 'completed',
    assignedAt: '2026-08-20T10:00:00.000Z',
    submittedAt: '2026-08-21T09:15:00.000Z',
    answers: [
      { questionId: 'q-1', value: 'yes' },
      { questionId: 'q-2', value: 'Molestia de rodilla' },
      { questionId: 'q-3', value: 'opt-health' },
    ],
  },
];

export const MOCK_ACCOUNTS: AuthUserDto[] = [
  {
    id: 'user-trainer-1',
    displayName: 'Alex Martin',
    role: 'admin',
    trainerId: 'trainer-1',
    email: 'lucia@bonafit.com',
    mustChangePassword: false,
  },
  {
    id: 'user-trainer-2',
    displayName: 'Sam Ortega',
    role: 'admin',
    trainerId: 'trainer-2',
    email: 'sam.ortega@bonafit.com',
    mustChangePassword: false,
  },
  {
    id: 'user-client-1',
    displayName: 'Marina Lopez',
    role: 'client',
    clientId: 'client-1',
    email: 'marina.lopez@example.com',
    mustChangePassword: false,
  },
];

export function createMockSession(user: AuthUserDto): AuthSessionDto {
  return {
    user: structuredClone(user),
    token: `token-${user.id}`,
  };
}
