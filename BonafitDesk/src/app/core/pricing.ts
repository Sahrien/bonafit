export type DiscountKind = 'percent' | 'amount';
export type SaleKind = 'none' | DiscountKind;

export type CouponLike = {
  id: string;
  kind: DiscountKind;
  value: number;
  serviceId?: string | null;
  bonoId?: string | null;
  usedAt?: string | null;
};

export type PricedOffer = {
  listPrice: number;
  salePrice: number;
  paidPrice: number;
};

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export function applyDiscount(price: number, kind: string, value: number): number {
  if (kind === 'percent') {
    return money(Math.max(0, price * (1 - value / 100)));
  }
  if (kind === 'amount') {
    return money(Math.max(0, price - value));
  }
  return money(price);
}

export function applySale(listPrice: number, saleKind?: string | null, saleValue?: number | null): number {
  if (!saleKind || saleKind === 'none') {
    return money(listPrice);
  }
  return applyDiscount(listPrice, saleKind, saleValue ?? 0);
}

export function couponApplies(coupon: CouponLike, serviceId: string, bonoId: string): boolean {
  if (coupon.usedAt) {
    return false;
  }
  if (coupon.bonoId && coupon.bonoId !== bonoId) {
    return false;
  }
  if (coupon.serviceId && coupon.serviceId !== serviceId) {
    return false;
  }
  return true;
}

export function pricedOffer(
  listPrice: number,
  saleKind?: string | null,
  saleValue?: number | null,
  coupon?: CouponLike | null,
): PricedOffer {
  const listed = money(listPrice);
  const salePrice = applySale(listed, saleKind, saleValue);
  const paidPrice = coupon ? applyDiscount(salePrice, coupon.kind, coupon.value) : salePrice;
  return { listPrice: listed, salePrice, paidPrice };
}

export function bestCoupon(
  coupons: CouponLike[],
  serviceId: string,
  bonoId: string,
  listPrice: number,
  saleKind?: string | null,
  saleValue?: number | null,
): CouponLike | null {
  const applicable = coupons.filter((coupon) => couponApplies(coupon, serviceId, bonoId));
  if (applicable.length === 0) {
    return null;
  }
  return applicable.reduce((best, coupon) => {
    const bestPaid = pricedOffer(listPrice, saleKind, saleValue, best).paidPrice;
    const nextPaid = pricedOffer(listPrice, saleKind, saleValue, coupon).paidPrice;
    if (nextPaid < bestPaid || (nextPaid === bestPaid && coupon.id < best.id)) {
      return coupon;
    }
    return best;
  });
}
