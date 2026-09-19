from types import SimpleNamespace

from app.pricing import apply_sale, best_coupon, priced_offer


def test_percent_and_amount_sale() -> None:
    assert apply_sale(100, "percent", 20) == 80
    assert apply_sale(100, "amount", 15) == 85
    assert apply_sale(100, "none", 50) == 100
    assert apply_sale(10, "amount", 40) == 0


def test_stack_sale_then_coupon() -> None:
    coupon = SimpleNamespace(id="c1", kind="percent", value=10, service_id=None, bono_id=None, used_at=None)
    priced = priced_offer(200, "percent", 20, coupon)
    assert priced.list_price == 200
    assert priced.sale_price == 160
    assert priced.paid_price == 144


def test_best_coupon_picks_lowest_paid() -> None:
    weaker = SimpleNamespace(id="a", kind="amount", value=5, service_id=None, bono_id=None, used_at=None)
    stronger = SimpleNamespace(id="b", kind="percent", value=50, service_id=None, bono_id=None, used_at=None)
    other = SimpleNamespace(id="c", kind="amount", value=90, service_id="svc-x", bono_id=None, used_at=None)
    chosen = best_coupon([weaker, stronger, other], "svc-1", "bono-1", 100, "none", 0)
    assert chosen is stronger
