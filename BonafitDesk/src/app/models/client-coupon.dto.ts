export type DiscountKind = 'percent' | 'amount';

export interface ClientCouponDto {
  id: string;
  clientId: string;
  kind: DiscountKind;
  value: number;
  serviceId?: string | null;
  bonoId?: string | null;
  usedAt?: string | null;
}

export type ClientCouponWriteDto = Omit<ClientCouponDto, 'id' | 'clientId' | 'usedAt'>;
