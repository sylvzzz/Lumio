"""Password authentication: Argon2id hashing + login throttling."""
import re
import threading
import time
import unicodedata

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from zxcvbn import zxcvbn

MIN_PASSWORD_LEN = 10
MAX_PASSWORD_LEN = 128  # avoids huge requests burning CPU/memory on the hash

# RFC 9106 §4 "low memory" profile: t=3, m=64 MiB, p=4.
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=64 * 1024,  # KiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)


def _norm(password: str) -> str:
    # NFKC: the same text with different Unicode compositions hashes the same.
    return unicodedata.normalize("NFKC", password)


# Words the (English) zxcvbn dictionary does not know but that are predictable
# in passwords chosen by Portuguese users. Treated as common words.
_EXTRA_WORDS = (
    "lumio", "senha", "palavra", "passe", "palavrapasse", "portugal", "lisboa", "porto",
    "benfica", "sporting", "braga", "coimbra", "obrigado", "ola", "amor", "teste",
)

STRENGTH_LABELS = ("weak", "weak", "ok", "strong", "perfect")
MIN_SCORE = 2  # "ok"

# zxcvbn keeps user_inputs in a module-global dictionary: without this lock,
# two simultaneous requests (FastAPI threadpool) would overwrite each other.
_zxcvbn_lock = threading.Lock()


def password_score(password: str, user_inputs: tuple[str, ...] | list[str] = ()) -> int:
    """0-1 weak, 2 ok, 3 strong, 4 perfect."""
    pw = _norm(password)[:MAX_PASSWORD_LEN]
    context: list[str] = list(_EXTRA_WORDS)
    for item in user_inputs:
        if item:
            context.append(item)
            context.extend(t for t in re.split(r"[^0-9A-Za-z]+", item) if len(t) >= 3)

    # Explicit rule: a password containing the email itself (or the part before @)
    # is weak, however "random" zxcvbn thinks it is.
    low = pw.lower()
    for item in user_inputs:
        needle = (item or "").lower().split("@")[0]
        if len(needle) >= 4 and needle in low:
            return 1

    with _zxcvbn_lock:
        score = zxcvbn(pw, user_inputs=context, max_length=MAX_PASSWORD_LEN)["score"]
    if score == 4 and len(pw) < 14:
        score = 3
    return score


def validate_password(password: str, user_inputs: tuple[str, ...] | list[str] = ()) -> str | None:
    """Error code ('too_short' | 'too_long' | 'too_weak') or None if acceptable."""
    if len(password) < MIN_PASSWORD_LEN:
        return "too_short"
    if len(password) > MAX_PASSWORD_LEN:
        return "too_long"
    if password_score(password, user_inputs) < MIN_SCORE:
        return "too_weak"
    return None


def hash_password(password: str) -> str:
    return _ph.hash(_norm(password))


# Hash of a random password: verifying against it when the user does not exist
# (or has no password) takes the same time as a real login, so the response does
# not reveal which emails exist.
_DUMMY_HASH = _ph.hash("lumio-dummy-password-never-matches")


def verify_password(stored_hash: str | None, password: str) -> tuple[bool, str | None]:
    """(valid?, new_hash). `new_hash` is only set when the stored hash uses old
    parameters and the password is correct, so it should be rehashed."""
    if len(password) > MAX_PASSWORD_LEN:
        stored_hash = None  # nem sequer gasta CPU com input absurdo
        password = ""
    try:
        _ph.verify(stored_hash or _DUMMY_HASH, _norm(password))
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False, None
    if stored_hash is None:
        return False, None
    if _ph.check_needs_rehash(stored_hash):
        return True, _ph.hash(_norm(password))
    return True, None


class LoginThrottle:
    """Blocks a key (email) after N failures within a time window."""

    def __init__(self, max_failures: int = 5, window_s: int = 15 * 60, max_keys: int = 10_000):
        self.max_failures = max_failures
        self.window_s = window_s
        self.max_keys = max_keys
        self._fails: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> list[float]:
        recent = [t for t in self._fails.get(key, []) if now - t < self.window_s]
        if recent:
            self._fails[key] = recent
        else:
            self._fails.pop(key, None)
        return recent

    def retry_after(self, key: str) -> int:
        """Seconds until the next attempt is allowed (0 = free)."""
        now = time.monotonic()
        with self._lock:
            recent = self._prune(key, now)
            if len(recent) < self.max_failures:
                return 0
            return max(1, int(self.window_s - (now - recent[0])))

    def fail(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            if len(self._fails) >= self.max_keys and key not in self._fails:
                # protects memory against mass-invented emails
                for k in list(self._fails):
                    self._prune(k, now)
                if len(self._fails) >= self.max_keys:
                    self._fails.pop(next(iter(self._fails)))
            self._fails.setdefault(key, []).append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._fails.pop(key, None)
