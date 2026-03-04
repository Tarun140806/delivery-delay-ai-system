# Delivery Delay AI System

A full-stack machine learning system that predicts whether a food delivery order will be delayed, with a real-time analytics dashboard.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│  Dashboard  │────▶│   Backend    │────▶│  AI Service  │     │ MongoDB │
│  React/Vite │◀────│ Express/Node │◀────│   FastAPI    │     │ Atlas   │
│  Port 5173  │     │  Port 8080   │     │  Port 8000   │     │ Cloud   │
└─────────────┘     └──────┬───────┘     └──────────────┘     └────▲────┘
                           │                                       │
                           └───────────────────────────────────────┘
```

**AI Service** — Python/FastAPI serving a Random Forest classifier trained on synthetic delivery data  
**Backend** — Node.js/Express REST API with JWT auth, input validation, rate limiting  
**Dashboard** — React + Tailwind CSS + Recharts with auth, analytics, and CRUD  
**Database** — MongoDB Atlas (cloud) for users and predictions

## Features

- **ML Prediction** — Predicts delivery delay probability from 6 features (distance, hour, day, prep time, rider load, weather)
- **JWT Authentication** — Register/login with bcrypt-hashed passwords and 7-day tokens
- **User-scoped Data** — Each user sees only their own predictions
- **Real-time Dashboard** — Pie chart, bar chart (by day), line chart (over time), stats cards
- **CRUD** — Create predictions via form, delete with one click
- **Export to CSV** — Download filtered predictions as a spreadsheet
- **Rate Limiting** — 100 req/min for API, 20 req/min for auth endpoints
- **Input Validation** — Server-side validation with detailed error messages
- **Docker Compose** — One command to run everything

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB Atlas account (or local MongoDB)

### 1. AI Service

```bash
cd ai-service
pip install -r requirements.txt

# Generate training data & train model (first time only)
python data/generate_data.py
python train_model.py

# Start the service
uvicorn app:app --reload --port 8000
```

### 2. Backend

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and a JWT secret

npm run dev
```

### 3. Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open **http://localhost:5173** — register an account and start predicting!

## Docker Compose (Production)

```bash
# Start all services
docker-compose up --build

# Dashboard: http://localhost:3000
# Backend:   http://localhost:6000
# AI:        http://localhost:8000
```

## Environment Variables

| Variable      | Description                   | Default                 |
| ------------- | ----------------------------- | ----------------------- |
| `MONGO_URI`   | MongoDB connection string     | —                       |
| `JWT_SECRET`  | Secret key for JWT signing    | —                       |
| `AI_BASE_URL` | URL of the FastAPI AI service | `http://127.0.0.1:8000` |
| `PORT`        | Backend server port           | `8080`                  |

## API Endpoints

### Auth (Public)

| Method | Route                | Description                      |
| ------ | -------------------- | -------------------------------- |
| POST   | `/api/auth/register` | Create account                   |
| POST   | `/api/auth/login`    | Sign in, get JWT                 |
| GET    | `/api/auth/me`       | Get current user (auth required) |

### Predictions (Auth Required)

| Method | Route          | Description                       |
| ------ | -------------- | --------------------------------- |
| GET    | `/api`         | Get all predictions (user-scoped) |
| POST   | `/api/predict` | Create a new prediction           |
| DELETE | `/api/:id`     | Delete a prediction               |

### Health

| Method | Route                 | Description             |
| ------ | --------------------- | ----------------------- |
| GET    | `/health`             | Backend health check    |
| GET    | `/health` (port 8000) | AI service health check |

## Tech Stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| AI/ML    | Python, FastAPI, scikit-learn, Random Forest |
| Backend  | Node.js, Express 5, Mongoose 9, JWT, bcrypt  |
| Frontend | React 19, Vite 7, Tailwind CSS 4, Recharts   |
| Database | MongoDB Atlas                                |
| DevOps   | Docker, Docker Compose, GitHub Actions       |

## Project Structure

```
delivery-delay-ai-system/
├── ai-service/          # Python ML service
│   ├── app.py           # FastAPI server + /predict endpoint
│   ├── train_model.py   # Model training script
│   ├── data/            # Data generation + CSV
│   └── Dockerfile
├── backend/             # Node.js API
│   ├── src/
│   │   ├── controllers/ # Auth + prediction handlers
│   │   ├── middlewares/  # Auth, validation, error handler
│   │   ├── models/      # Mongoose schemas (User, Prediction)
│   │   ├── routes/      # Express routers
│   │   └── services/    # AI service client
│   └── Dockerfile
├── dashboard/           # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main dashboard
│   │   ├── AuthPage.jsx # Login/Register
│   │   └── AuthContext.jsx
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/   # CI/CD pipeline
```

## License

MIT
