# backend/auth.py
# Simple in-memory auth — no database needed for now

import json
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "drugnova-secret-key-2025"
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

# User store persistence
DB_PATH = "users_db.json"

def load_users():
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_users(db):
    try:
        with open(DB_PATH, "w") as f:
            json.dump(db, f, indent=4)
    except Exception as e:
        print(f"Error saving users: {e}")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ── In-memory user store ──────────────────────────────────────────────────────
# { email: { name, email, hashed_password, purpose } }
users_db = load_users()

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
    payload = decode_token(token)
    email = payload.get("email")
    if not email or email not in users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or user not found. Please log in again."
        )
    return users_db[email]

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
    save_users(users_db)
    return users_db[email]

def login_user(email: str, password: str) -> dict:
    user = users_db.get(email)
    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user

def update_user(email: str, name: Optional[str] = None, purpose: Optional[str] = None) -> dict:
    if email not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = users_db[email]
    if name:
        user["name"] = name
    if purpose:
        if purpose not in PURPOSE_OPTIONS:
            raise HTTPException(status_code=400, detail=f"Invalid purpose. Choose from: {PURPOSE_OPTIONS}")
        user["purpose"] = purpose
    
    save_users(users_db)
    return user