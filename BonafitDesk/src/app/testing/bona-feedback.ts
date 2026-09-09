import { of } from 'rxjs';
import { BonaConfirm } from '../components/bona-confirm/bona-confirm.service';
import { BonaToast } from '../components/bona-toast/bona-toast.service';

export function stubBonaConfirm(result = true): jasmine.SpyObj<BonaConfirm> {
  const confirm = jasmine.createSpyObj<BonaConfirm>('BonaConfirm', ['open']);
  confirm.open.and.returnValue(of(result));
  return confirm;
}

export function stubBonaToast(): jasmine.SpyObj<BonaToast> {
  return jasmine.createSpyObj<BonaToast>('BonaToast', ['success', 'error']);
}

export function provideBonaFeedbackTesting(result = true): {
  confirm: jasmine.SpyObj<BonaConfirm>;
  toast: jasmine.SpyObj<BonaToast>;
  providers: Array<{ provide: unknown; useValue: unknown }>;
} {
  const confirm = stubBonaConfirm(result);
  const toast = stubBonaToast();
  return {
    confirm,
    toast,
    providers: [
      { provide: BonaConfirm, useValue: confirm },
      { provide: BonaToast, useValue: toast },
    ],
  };
}
