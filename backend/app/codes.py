"""Генерация коротких уникальных кодов заявок вида IRF-7K2M."""
import secrets
import string

# Без 0/O/1/I — чтобы не путать при переписке
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_claim_code(prefix: str = "IRF") -> str:
    body = "".join(secrets.choice(_ALPHABET) for _ in range(4))
    return f"{prefix}-{body}"
