# FloodWatch Delhi Backend Setup

This guide covers how to start the backend properly, including the local Docker + Redis part.

## What runs locally

- FastAPI backend on `http://127.0.0.1:8000`
- Redis in Docker on `localhost:6380`
- Optional local MongoDB in Docker if you are not using a cloud Mongo URI

## Important note

This repo does **not** currently include a `docker-compose.yml` or `Dockerfile` for the backend.  
So for local setup, start Redis with plain Docker commands.

Also, the backend reads some environment variables very early during startup, so the safest way to run it is with:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

## Prerequisites

- Python 3.10+ installed
- `pip` available
- Docker Desktop installed and running
- The repo cloned locally

## 1. Check backend environment variables

Open `backend/.env` and make sure these values exist:

```env
MONGODB_URI=...
DATABASE_NAME=floodwatch_delhi
JWT_SECRET_KEY=...
POSTGRESQL_CONNECTION_STRING=...
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=
```

Optional but useful for some routes/features:

```env
GOOGLE_MAPS_API_KEY=...
OPENAI_API_KEY=...
MAPBOX_TOKEN=...
FCM_SERVICE_ACCOUNT_PATH=...
```

## 2. Start Redis with Docker

### First time only

```powershell
docker run -d --name floodwatch-redis -p 6380:6379 redis:7-alpine
```

This maps:

- local port `6380` -> container port `6379`

That matches the backend default:

- `REDIS_HOST=localhost`
- `REDIS_PORT=6380`

### Next time onward

If the container already exists, just start it:

```powershell
docker start floodwatch-redis
```

### Verify Redis is up

```powershell
docker ps
docker exec -it floodwatch-redis redis-cli ping
```

Expected response:

```text
PONG
```

### Stop Redis when needed

```powershell
docker stop floodwatch-redis
```

## 3. Optional: start MongoDB with Docker

Only do this if your `MONGODB_URI` points to local MongoDB.

Example local Mongo container:

```powershell
docker run -d --name floodwatch-mongo -p 27017:27017 mongo:7
```

If you use this, your `.env` should look like:

```env
MONGODB_URI=mongodb://localhost:27017/
DATABASE_NAME=floodwatch_delhi
```

If your `.env` already points to MongoDB Atlas or another hosted Mongo instance, you do **not** need this step.

## 4. Create and activate the Python virtual environment

From the project root:

```powershell
cd backend
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

If script execution is blocked:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

## 5. Install backend dependencies

```powershell
pip install -r requirements.txt
```

## 6. Start the backend

Run this from inside the `backend` folder:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

## 7. Verify the backend

Open these in the browser:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

Expected health response:

```json
{"status":"ok"}
```

## What to expect on startup

The backend does a lot of work during startup:

- connects to PostgreSQL
- loads flood grid data from `backend/east_delhi_data`
- loads village and cluster data
- loads Redis
- initializes Mongo usage
- may load the Delhi road network for routing

So the first boot can take a while.  
Do not assume it is stuck unless it has clearly failed with an error.

## Typical daily startup

### Terminal 1: Redis

```powershell
docker start floodwatch-redis
```

### Terminal 2: Backend

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

## Troubleshooting

### Redis connection refused

Check:

```powershell
docker ps
docker logs floodwatch-redis
```

Also confirm `.env` still says:

```env
REDIS_HOST=localhost
REDIS_PORT=6380
```

### PostgreSQL warning at startup

If `POSTGRESQL_CONNECTION_STRING` is wrong or the DB is unreachable, some map/village/cluster features will be disabled.

### MongoDB connection failed

If MongoDB is down or `MONGODB_URI` is wrong, auth, complaints, and notifications will fail.

### Backend starts but some APIs fail

That usually means one of these is missing or invalid:

- `POSTGRESQL_CONNECTION_STRING`
- `MONGODB_URI`
- `JWT_SECRET_KEY`
- `MAPBOX_TOKEN`
- `GOOGLE_MAPS_API_KEY`

## Quick command summary

```powershell
# start redis
docker start floodwatch-redis

# if redis container does not exist yet
docker run -d --name floodwatch-redis -p 6380:6379 redis:7-alpine

# start backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```
