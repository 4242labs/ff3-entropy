"""Forecast engine — occurrence computation (bounded by nr_of_repetitions) + paid
status by ACCOUNT not amount: Mechanism A ordered-fill (dedicated accounts) and
Mechanism B fatura-driven clearing (credit-card installments). The engine emits the
OUTSTANDING set only (confirmed occurrences already live in Firefly III)."""
from __future__ import annotations

import datetime as dt
import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "server"))
sys.modules.setdefault("httpx", types.SimpleNamespace(
    Timeout=lambda *a, **k: None, get=None))

import forecast as f  # noqa: E402


def _rec(title, rtype, moment, amount, src, dst, first, nr=None, notes=None, cur="BRL"):
    return {"attributes": {
        "active": False, "type": rtype, "title": title, "notes": notes,
        "first_date": first, "repeat_until": None, "nr_of_repetitions": nr,
        "repetitions": [{"type": "monthly", "moment": str(moment), "skip": 0}],
        "transactions": [{"amount": str(amount), "currency_code": cur,
                          "source_name": src, "destination_name": dst,
                          "category_name": None}]}}


def _wire(monkeypatch, recs, txns, cards=()):
    monkeypatch.setattr(f, "fetch_recurrences", lambda: recs)
    monkeypatch.setattr(f, "fetch_transactions", lambda s, e: txns)
    monkeypatch.setattr(f, "fetch_card_accounts", lambda: {f._norm(c) for c in cards})


def _outstanding(res):
    return {it["date"]: it for per in res["periods"] for it in per["items"]}


def test_nr_of_repetitions_bounds_series():
    occ = f._occurrences(
        {"first_date": "2026-02-09", "repeat_until": None, "nr_of_repetitions": 3,
         "repetitions": [{"type": "monthly", "moment": "9", "skip": 0}]},
        dt.date(2026, 1, 1), dt.date(2026, 12, 31))
    assert [d.isoformat() for d in occ] == ["2026-02-09", "2026-03-09", "2026-04-09"]


def test_nr_counts_from_first_not_window():
    occ = f._occurrences(
        {"first_date": "2026-02-09", "repeat_until": None, "nr_of_repetitions": 3,
         "repetitions": [{"type": "monthly", "moment": "9", "skip": 0}]},
        dt.date(2026, 4, 1), dt.date(2026, 12, 31))
    assert [d.isoformat() for d in occ] == ["2026-04-09"]


def test_ordered_fill_confirmed_dropped_outstanding_kept(monkeypatch):
    """Ordered-fill: two payments clear the two earliest occurrences (dropped from
    the outstanding payload); later months remain needs_review/upcoming."""
    today = dt.date(2026, 7, 12)
    recs = [_rec("Rent", "withdrawal", 5, 1000, "Bank", "Landlord", "2026-01-05")]
    txns = [{"id": "a", "type": "withdrawal", "date": dt.date(2026, 6, 30),
             "amount": 950.0, "currency": "BRL", "source": "bank",
             "destination": "LANDLORD", "description": "r", "tags": []},
            {"id": "b", "type": "withdrawal", "date": dt.date(2026, 7, 3),
             "amount": 1100.0, "currency": "BRL", "source": "Bank",
             "destination": "Landlord", "description": "r", "tags": []}]
    _wire(monkeypatch, recs, txns)
    res = f.build_projection(granularity="month", start=dt.date(2026, 5, 1),
                             end=dt.date(2026, 8, 31), today=today)
    out = _outstanding(res)
    assert "2026-05-05" not in out and "2026-06-05" not in out   # paid → dropped
    assert out["2026-07-05"]["status"] == "needs_review"
    assert out["2026-08-05"]["status"] == "upcoming"


def test_fatura_clears_installment_month(monkeypatch):
    today = dt.date(2026, 7, 12)
    recs = [_rec("AMZ (parc)", "withdrawal", 9, 300, "Itaucard", "", "2026-02-09", nr=4)]
    txns = [{"id": f"s{m}", "type": "transfer", "date": dt.date(2026, m, 8),
             "amount": 9.0, "currency": "BRL", "source": "Itau",
             "destination": "Itaucard", "description": "fatura", "tags": []}
            for m in (2, 3, 4)]
    _wire(monkeypatch, recs, txns, cards=["Itaucard"])
    res = f.build_projection(granularity="month", start=dt.date(2026, 1, 1),
                             end=dt.date(2026, 12, 31), today=today)
    out = _outstanding(res)
    # Feb-Apr settled → dropped; May open (past, no settlement); no occ beyond N=4
    assert set(out) == {"2026-05-09"}
    assert out["2026-05-09"]["status"] == "needs_review"
    assert out["2026-05-09"]["mechanism"] == "fatura"
    assert out["2026-05-09"]["remaining"] == 1


def test_non_fatura_transfer_does_not_clear(monkeypatch):
    """A transfer that is NOT into the card must not clear an installment month."""
    today = dt.date(2026, 7, 12)
    recs = [_rec("AMZ (parc)", "withdrawal", 9, 300, "Itaucard", "", "2026-06-09", nr=1)]
    txns = [{"id": "x", "type": "transfer", "date": dt.date(2026, 6, 8),
             "amount": 9.0, "currency": "BRL", "source": "Itaucard",
             "destination": "Savings", "description": "not a fatura", "tags": []}]
    _wire(monkeypatch, recs, txns, cards=["Itaucard"])
    res = f.build_projection(granularity="month", start=dt.date(2026, 1, 1),
                             end=dt.date(2026, 12, 31), today=today)
    out = _outstanding(res)
    assert out["2026-06-09"]["status"] == "needs_review"   # still open
