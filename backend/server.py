from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import uuid
import json

load_dotenv()

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True)
    username = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))
    full_name = Column(String(255))
    points = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_solve_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    provider = Column(String(50), default="email")  # email, google, github, linkedin

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255))
    description = Column(Text)
    difficulty = Column(String(20))  # Easy, Medium, Hard
    language = Column(String(50))    # JavaScript, Java, SQL, etc.
    topic = Column(String(100))      # APIs, ADO.NET, Git, etc.
    starter_code = Column(Text)
    solution = Column(Text)
    test_cases = Column(Text)        # JSON string
    points = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36))
    question_id = Column(String(36))
    code = Column(Text)
    language = Column(String(50))
    status = Column(String(20))      # passed, failed, error
    score = Column(Float)
    passed_test_cases = Column(Integer)
    total_test_cases = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserProgress(Base):
    __tablename__ = "user_progress"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36))
    question_id = Column(String(36))
    solved = Column(Boolean, default=False)
    best_score = Column(Float, default=0.0)
    attempts = Column(Integer, default=0)
    solved_at = Column(DateTime)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.get("/api")
def read_root():
    return {"message": "HackerRank Clone API"}

@app.post("/api/auth/register")
def register(user_data: dict, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.email == user_data.get("email")) | 
        (User.username == user_data.get("username"))
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email or username already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.get("password"))
    db_user = User(
        email=user_data.get("email"),
        username=user_data.get("username"),
        password_hash=hashed_password,
        full_name=user_data.get("full_name", "")
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username,
            "full_name": db_user.full_name,
            "points": db_user.points,
            "streak_days": db_user.streak_days
        }
    }

@app.post("/api/auth/login")
def login(credentials: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.get("email")).first()
    
    if not user or not verify_password(credentials.get("password"), user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "points": user.points,
            "streak_days": user.streak_days
        }
    }

# Dummy OAuth endpoints
@app.post("/api/auth/google")
def google_auth(token_data: dict):
    # Dummy implementation - in real app, verify with Google
    return {
        "access_token": "dummy-google-token",
        "token_type": "bearer",
        "user": {
            "id": str(uuid.uuid4()),
            "email": "user@google.com",
            "username": "googleuser",
            "full_name": "Google User",
            "points": 0,
            "streak_days": 0
        }
    }

@app.post("/api/auth/github")
def github_auth(token_data: dict):
    # Dummy implementation
    return {
        "access_token": "dummy-github-token",
        "token_type": "bearer",
        "user": {
            "id": str(uuid.uuid4()),
            "email": "user@github.com",
            "username": "githubuser",
            "full_name": "GitHub User",
            "points": 0,
            "streak_days": 0
        }
    }

@app.post("/api/auth/linkedin")
def linkedin_auth(token_data: dict):
    # Dummy implementation
    return {
        "access_token": "dummy-linkedin-token",
        "token_type": "bearer",
        "user": {
            "id": str(uuid.uuid4()),
            "email": "user@linkedin.com",
            "username": "linkedinuser",
            "full_name": "LinkedIn User",
            "points": 0,
            "streak_days": 0
        }
    }

@app.get("/api/questions")
def get_questions(
    language: str = None,
    difficulty: str = None,
    topic: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Question)
    
    if language:
        query = query.filter(Question.language == language)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if topic:
        query = query.filter(Question.topic == topic)
    
    questions = query.all()
    return [
        {
            "id": q.id,
            "title": q.title,
            "difficulty": q.difficulty,
            "language": q.language,
            "topic": q.topic,
            "points": q.points
        } for q in questions
    ]

@app.get("/api/questions/{question_id}")
def get_question(question_id: str, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {
        "id": question.id,
        "title": question.title,
        "description": question.description,
        "difficulty": question.difficulty,
        "language": question.language,
        "topic": question.topic,
        "starter_code": question.starter_code,
        "test_cases": json.loads(question.test_cases) if question.test_cases else [],
        "points": question.points
    }

@app.post("/api/questions")
def create_question(question_data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # In real app, check if user is admin
    db_question = Question(
        title=question_data.get("title"),
        description=question_data.get("description"),
        difficulty=question_data.get("difficulty"),
        language=question_data.get("language"),
        topic=question_data.get("topic"),
        starter_code=question_data.get("starter_code", ""),
        solution=question_data.get("solution", ""),
        test_cases=json.dumps(question_data.get("test_cases", [])),
        points=question_data.get("points", 10)
    )
    
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    
    return {"id": db_question.id, "message": "Question created successfully"}

@app.post("/api/questions/{question_id}/submit")
def submit_solution(
    question_id: str,
    submission_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Simple validation logic (for JavaScript)
    code = submission_data.get("code", "")
    test_cases = json.loads(question.test_cases) if question.test_cases else []
    
    passed_tests = 0
    total_tests = len(test_cases)
    status = "failed"
    
    # Basic JavaScript execution simulation
    if question.language.lower() == "javascript":
        try:
            # In real app, use secure sandbox execution
            for test_case in test_cases:
                expected = test_case.get("expected")
                # Simple check - in real app, execute code safely
                if "return" in code and str(expected) in code:
                    passed_tests += 1
            
            if passed_tests == total_tests and total_tests > 0:
                status = "passed"
        except Exception:
            status = "error"
    
    score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    # Create submission record
    submission = Submission(
        user_id=current_user.id,
        question_id=question_id,
        code=code,
        language=submission_data.get("language", question.language),
        status=status,
        score=score,
        passed_test_cases=passed_tests,
        total_test_cases=total_tests
    )
    
    db.add(submission)
    
    # Update user progress
    progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.question_id == question_id
    ).first()
    
    if not progress:
        progress = UserProgress(
            user_id=current_user.id,
            question_id=question_id,
            attempts=1,
            best_score=score
        )
        db.add(progress)
    else:
        progress.attempts += 1
        progress.best_score = max(progress.best_score, score)
    
    if status == "passed":
        progress.solved = True
        progress.solved_at = datetime.utcnow()
        
        # Update user points and streak
        current_user.points += question.points
        
        # Check streak
        today = datetime.utcnow().date()
        if current_user.last_solve_date:
            last_solve = current_user.last_solve_date.date()
            if last_solve == today - timedelta(days=1):
                current_user.streak_days += 1
            elif last_solve != today:
                current_user.streak_days = 1
        else:
            current_user.streak_days = 1
        
        current_user.last_solve_date = datetime.utcnow()
    
    db.commit()
    
    return {
        "status": status,
        "score": score,
        "passed_test_cases": passed_tests,
        "total_test_cases": total_tests,
        "points_earned": question.points if status == "passed" else 0
    }

@app.get("/api/user/progress")
def get_user_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    progress = db.query(UserProgress).filter(UserProgress.user_id == current_user.id).all()
    submissions = db.query(Submission).filter(Submission.user_id == current_user.id).count()
    
    solved_count = len([p for p in progress if p.solved])
    total_questions = db.query(Question).count()
    
    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "points": current_user.points,
            "streak_days": current_user.streak_days
        },
        "stats": {
            "solved_questions": solved_count,
            "total_questions": total_questions,
            "total_submissions": submissions,
            "accuracy": (solved_count / submissions * 100) if submissions > 0 else 0
        }
    }

@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.points.desc()).limit(10).all()
    
    return [
        {
            "rank": idx + 1,
            "username": user.username,
            "points": user.points,
            "streak_days": user.streak_days
        } for idx, user in enumerate(users)
    ]

# Initialize with sample data
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Check if we have questions
        question_count = db.query(Question).count()
        if question_count == 0:
            # Add sample questions
            sample_questions = [
                {
                    "title": "Two Sum",
                    "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                    "difficulty": "Easy",
                    "language": "JavaScript",
                    "topic": "Arrays",
                    "starter_code": "function twoSum(nums, target) {\n    // Your code here\n}",
                    "solution": "function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) {\n            return [map.get(complement), i];\n        }\n        map.set(nums[i], i);\n    }\n    return [];\n}",
                    "test_cases": json.dumps([
                        {"input": "[2,7,11,15], 9", "expected": "[0,1]"},
                        {"input": "[3,2,4], 6", "expected": "[1,2]"},
                        {"input": "[3,3], 6", "expected": "[0,1]"}
                    ]),
                    "points": 10
                },
                {
                    "title": "Reverse String",
                    "description": "Write a function that reverses a string. The input string is given as an array of characters s.",
                    "difficulty": "Easy",
                    "language": "JavaScript",
                    "topic": "Strings",
                    "starter_code": "function reverseString(s) {\n    // Your code here\n}",
                    "solution": "function reverseString(s) {\n    return s.reverse();\n}",
                    "test_cases": json.dumps([
                        {"input": "['h','e','l','l','o']", "expected": "['o','l','l','e','h']"},
                        {"input": "['H','a','n','n','a','h']", "expected": "['h','a','n','n','a','H']"}
                    ]),
                    "points": 5
                },
                {
                    "title": "Valid Parentheses",
                    "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
                    "difficulty": "Medium",
                    "language": "JavaScript",
                    "topic": "Stack",
                    "starter_code": "function isValid(s) {\n    // Your code here\n}",
                    "solution": "function isValid(s) {\n    const stack = [];\n    const map = { ')': '(', '}': '{', ']': '[' };\n    for (let char of s) {\n        if (char in map) {\n            if (stack.pop() !== map[char]) return false;\n        } else {\n            stack.push(char);\n        }\n    }\n    return stack.length === 0;\n}",
                    "test_cases": json.dumps([
                        {"input": "()", "expected": "true"},
                        {"input": "()[]{}", "expected": "true"},
                        {"input": "(]", "expected": "false"}
                    ]),
                    "points": 20
                }
            ]
            
            for q_data in sample_questions:
                question = Question(**q_data)
                db.add(question)
            
            db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
