from datetime import datetime

SYMBOLS = {
    "NGN": "₦",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "KES": "KSh ",
    "GHS": "₵",
    "ZAR": "R ",
    "INR": "₹",
    "CAD": "CA$",
    "AUD": "A$",
}


def to_minor(value) -> int:
    """Parse a user-entered amount ('1,250.50', 1250.5) into integer minor units."""
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(round(float(value) * 100))
    cleaned = "".join(ch for ch in str(value) if ch.isdigit() or ch in ".-")
    if not cleaned or cleaned in {"-", ".", "-."}:
        return 0
    try:
        return int(round(float(cleaned) * 100))
    except ValueError:
        return 0


def to_major(minor: int) -> float:
    return round(int(minor or 0) / 100, 2)


def format_money(minor, currency_code: str = "NGN", currency_locale: str = "en-NG") -> str:
    amount = to_major(minor)
    sign = "-" if amount < 0 else ""
    symbol = SYMBOLS.get(currency_code.upper())
    body = f"{abs(amount):,.2f}"
    if symbol:
        return f"{sign}{symbol}{body}"
    return f"{sign}{currency_code.upper()} {body}"


def format_number(value) -> str:
    try:
        return f"{int(value):,}"
    except (TypeError, ValueError):
        return "0"


def format_date(value: datetime | None) -> str:
    if not value:
        return "—"
    return value.strftime("%d %b %Y")


def parse_date(value: str | None) -> datetime:
    if not value:
        return datetime.now()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            continue
    return datetime.now()


def today_input() -> str:
    return datetime.now().strftime("%Y-%m-%d")
