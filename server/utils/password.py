import hashlib
import secrets
import hmac


def hash_password(password: str) -> str:
    """Hash a plain text password using PBKDF2-SHA256 (stdlib, no external deps)."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2:sha256:100000${salt}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against a PBKDF2-SHA256 hash."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 3:
            return False
        algo_info, salt, expected_hash = parts
        
        # Support legacy 260k hashes if they exist, but default to 100k for new ones
        iterations = 100000
        if "260000" in algo_info:
            iterations = 260000
            
        dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return hmac.compare_digest(dk.hex(), expected_hash)
    except Exception:
        return False
