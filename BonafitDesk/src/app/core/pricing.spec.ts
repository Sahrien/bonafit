import { bestCoupon, pricedOffer } from './pricing';

describe('pricing', () => {
  it('stacks sale then coupon', () => {
    const priced = pricedOffer(200, 'percent', 20, {
      id: 'c1',
      kind: 'percent',
      value: 10,
    });
    expect(priced.salePrice).toBe(160);
    expect(priced.paidPrice).toBe(144);
  });

  it('picks the coupon that lowers the price most', () => {
    const chosen = bestCoupon(
      [
        { id: 'a', kind: 'amount', value: 5 },
        { id: 'b', kind: 'percent', value: 50 },
        { id: 'c', kind: 'amount', value: 90, serviceId: 'other' },
      ],
      'svc-1',
      'bono-1',
      100,
      'none',
      0,
    );
    expect(chosen?.id).toBe('b');
  });
});
