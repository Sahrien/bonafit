import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error-message';

const options = {
  fallback: 'No se ha podido guardar.',
  connection: 'No hay conexión con el servidor.',
  salePercent: 'El porcentaje no puede ser mayor de 100.',
  saveWithField: 'No se ha podido guardar: {{field}}.',
  fieldLabels: { durationMinutes: 'Duración (minutos)', saleValue: 'Valor de la oferta' },
};

describe('apiErrorMessage', () => {
  it('uses the connection message when status is 0', () => {
    const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
    expect(apiErrorMessage(error, options)).toBe(options.connection);
  });

  it('maps a sale percent validation error', () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: {
        detail: [{ loc: ['body'], msg: 'Value error, sale percent cannot exceed 100' }],
      },
    });
    expect(apiErrorMessage(error, options)).toBe(options.salePercent);
  });

  it('maps a field loc to a label', () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: {
        detail: [{ loc: ['body', 'durationMinutes'], msg: 'Input should be a valid integer' }],
      },
    });
    expect(apiErrorMessage(error, options)).toBe('No se ha podido guardar: Duración (minutos).');
  });

  it('falls back for other errors', () => {
    const error = new HttpErrorResponse({ status: 500, error: { detail: 'boom' } });
    expect(apiErrorMessage(error, options)).toBe(options.fallback);
  });
});
