import {
  MOCK_ACCOUNTS,
  MOCK_APPOINTMENTS,
  MOCK_BONOS,
  MOCK_CLIENTS,
  MOCK_CLIENT_BONOS,
  MOCK_SERVICES,
  MOCK_TRAINERS,
  createMockDatabase,
} from './mock-data';

const UI_LITERALS = [
  'Buscar',
  'Editar',
  'Eliminar',
  'Guardar',
  'Cancelar',
  'Nombre',
  'Contratar',
];

describe('mock data', () => {
  it('seeds two trainers', () => {
    expect(MOCK_TRAINERS).toHaveSize(2);
    expect(MOCK_TRAINERS.map((row) => row.id)).toEqual([
      'trainer-1',
      'trainer-2',
    ]);
  });

  it('marks EP and hipopresivos as bono-only and masaje as single-session', () => {
    const byCategory = Object.fromEntries(
      MOCK_SERVICES.map((row) => [row.category, row]),
    );
    expect(byCategory['entrenamiento-personal'].allowsSingleSession).toBeFalse();
    expect(byCategory['entrenamiento-personal'].singleSessionPrice).toBeUndefined();
    expect(byCategory['hipopresivos'].allowsSingleSession).toBeFalse();
    expect(byCategory['masaje'].allowsSingleSession).toBeTrue();
    expect(byCategory['masaje'].singleSessionPrice).toBe(45);
  });

  it('has bonos for EP, hipopresivos and masaje', () => {
    const serviceIds = new Set(MOCK_BONOS.map((row) => row.serviceId));
    expect(serviceIds).toEqual(new Set(['svc-ep', 'svc-hipo', 'svc-masaje']));
  });

  it('appointments include trainer, client, time and location', () => {
    expect(MOCK_APPOINTMENTS.length).toBeGreaterThan(0);
    for (const row of MOCK_APPOINTMENTS) {
      expect(row.trainerId).toBeTruthy();
      expect(row.clientId).toBeTruthy();
      expect(row.startsAt).toBeTruthy();
      expect(row.endsAt).toBeTruthy();
      expect(row.location).toBeTruthy();
    }
  });

  it('includes a masaje appointment without clientBonoId', () => {
    const masaje = MOCK_APPOINTMENTS.find((row) => row.serviceId === 'svc-masaje');
    expect(masaje).toBeTruthy();
    expect(masaje?.clientBonoId).toBeUndefined();
  });

  it('includes admin and client auth accounts', () => {
    expect(MOCK_ACCOUNTS.filter((row) => row.role === 'admin')).toHaveSize(2);
    expect(MOCK_ACCOUNTS.some((row) => row.role === 'client')).toBeTrue();
  });

  it('uses DTO field values only (no UI literals)', () => {
    const payload = JSON.stringify({
      MOCK_TRAINERS,
      MOCK_CLIENTS,
      MOCK_SERVICES,
      MOCK_BONOS,
      MOCK_CLIENT_BONOS,
      MOCK_APPOINTMENTS,
      MOCK_ACCOUNTS,
    });
    for (const literal of UI_LITERALS) {
      expect(payload.includes(literal)).toBeFalse();
    }
  });

  it('createMockDatabase returns a clone', () => {
    const db = createMockDatabase();
    db.clients[0].firstName = 'mutated';
    expect(MOCK_CLIENTS[0].firstName).toBe('Marina');
  });
});
