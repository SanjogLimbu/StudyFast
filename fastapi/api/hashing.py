import hashlib

from pwdlib import PasswordHash

##

password_hasher = PasswordHash.recommended()

##

def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hasher.verify(
        plain_password,
        hashed_password
    )


# Session tokens are long and random, so a fast hash is enough.
def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

