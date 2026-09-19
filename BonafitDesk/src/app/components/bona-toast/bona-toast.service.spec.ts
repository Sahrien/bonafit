import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { BonaToast } from './bona-toast.service';

describe('BonaToast', () => {
  let toast: BonaToast;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    await TestBed.configureTestingModule({
      providers: [
        BonaToast,
        { provide: MatSnackBar, useValue: snackBar },
        provideDeskTranslate(),
      ],
    }).compileComponents();

    toast = TestBed.inject(BonaToast);
  });

  it('opens a dismissible success toast at the bottom right', () => {
    toast.success('Guardado');

    expect(snackBar.open).toHaveBeenCalledWith(
      'Guardado',
      'Cerrar',
      jasmine.objectContaining({
        verticalPosition: 'bottom',
        horizontalPosition: 'right',
        duration: 4000,
        panelClass: 'bona-toast--success',
      }),
    );
  });

  it('opens a dismissible error toast at the bottom right', () => {
    toast.error('No se ha podido guardar');

    expect(snackBar.open).toHaveBeenCalledWith(
      'No se ha podido guardar',
      'Cerrar',
      jasmine.objectContaining({
        verticalPosition: 'bottom',
        horizontalPosition: 'right',
        duration: 6000,
        panelClass: 'bona-toast--error',
      }),
    );
  });
});
