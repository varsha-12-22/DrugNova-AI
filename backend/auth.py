# backend/auth.py
# Simple in-memory auth — no database needed for now

from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "drugnova-secret-key-2025"
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ── In-memory user store ──────────────────────────────────────────────────────
# { email: { name, email, hashed_password, purpose } }
users_db = {}

PURPOSE_OPTIONS = [
    "Academic Research",
    "Drug Discovery",
    "Healthcare Professional",
    "Personal Learning"
]

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    return decode_token(token)

def register_user(name: str, email: str, password: str, purpose: str) -> dict:
    if email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    if purpose not in PURPOSE_OPTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid purpose. Choose from: {PURPOSE_OPTIONS}")
    users_db[email] = {
        "name":            name,
        "email":           email,
        "hashed_password": hash_password(password),
        "purpose":         purpose,
        "created_at":      datetime.utcnow().isoformat()
    }
    return users_db[email]

def login_user(email: str, password: str) -> dict:
    user = users_db.get(email)
    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user