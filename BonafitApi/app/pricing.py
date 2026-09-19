from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable, Protocol

SALE_NONE = "none"
KIND_PERCENT = "percent"
KIND_AMOUNT = "amount"


class CouponLike(Protocol):
    id: str
    kind: str
    value: float
    service_id: str | None
    bono_id: str | None
    used_at: object | None


@dataclass(frozen=True)
class PricedOffer:
    list_price: float
    sale_price: float
    paid_price: float


def money(value: float) -> float:
    quantized = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return float(quantized)


def apply_discount(price: float, kind: str, value: float) -> float:
    if kind == KIND_PERCENT:
        return money(max(0.0, price * (1 - float(value) / 100)))
    if kind == KIND_AMOUNT:
        return money(max(0.0, price - float(value)))
    return money(price)


def apply_sale(list_price: float, sale_kind: str | None, sale_value: float | None) -> float:
    kind = sale_kind or SALE_NONE
    amount = float(sale_value or 0)
    if kind == SALE_NONE:
        return money(list_price)
    return apply_discount(list_price, kind, amount)


def coupon_applies(coupon: CouponLike, service_id: str, bono_id: str) -> bool:
    if coupon.used_at is not None:
        return False
    if coupon.bono_id and coupon.bono_id != bono_id:
        return False
    if coupon.service_id and coupon.service_id != service_id:
        return False
    return True


def priced_offer(
    list_price: float,
    sale_kind: str | None = SALE_NONE,
    sale_value: float | None = 0,
    coupon: CouponLike | None = None,
) -> PricedOffer:
    listed = money(list_price)
    sale_price = apply_sale(listed, sale_kind, sale_value)
    paid = sale_price
    if coupon is not None:
        paid = apply_discount(sale_price, coupon.kind, float(coupon.value))
    return PricedOffer(list_price=listed, sale_price=sale_price, paid_price=paid)


def best_coupon(
    coupons: Iterable[CouponLike],
    service_id: str,
    bono_id: str,
    list_price: float,
    sale_kind: str | None,
    sale_value: float | None,
) -> CouponLike | None:
    applicable = [coupon for coupon in coupons if coupon_applies(coupon, service_id, bono_id)]
    if not applicable:
        return None
    return min(
        applicable,
        key=lambda coupon: (
            priced_offer(list_price, sale_kind, sale_value, coupon).paid_price,
            coupon.id,
        ),
    )
