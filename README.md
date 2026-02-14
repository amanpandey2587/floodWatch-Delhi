# FloodWatch Delhi

FloodWatch Delhi is a multi-platform system for waterlogging risk awareness and citizen issue management in Delhi. It includes:

- `backend/`: FastAPI service for flood-risk analysis, routing safety, complaints, auth, notifications, safe parking, and social monitoring.
- `frontend/`: Next.js web dashboard for citizens and ward/admin workflows.
- `mobile/waterlogging-app/`: Expo React Native app for on-ground reporting and tracking.
- `fast/`: standalone mock FastAPI prototype for model testing (optional, not part of main stack).

## Core Features

- Flood-risk prediction from rainfall + hotspot characteristics.
- Ward-level risk and preparedness views.
- Safe routing with risk scoring on route segments.
- Citizen complaint filing, tracking, timeline updates, ETA, and rating.
- Role-aware admin dashboard and ward broadcasts.
- Safe parking recommendation endpoints.
- Social monitoring panel with mock/API-backed ward signal aggregation.
- Web and mobile clients consuming the same backend API.

## Monorepo Structure

```text
floodWatch-Delhi/
  backend/                  # FastAPI backend
    main.py
    requirements.txt
    routes/
    controllers/
    core/
    east_delhi_data/
  frontend/                 # Next.js (App Router)
    app/
    components/
    lib/
    package.json
  mobile/
    waterlogging-app/       # Expo app
      app/
      lib/
      package.json
```

## Tech Stack

- Backend: FastAPI, Uvicorn, MongoDB (PyMongo), GeoPandas, OSMnx, scikit-learn, Google Maps Directions/Geocoding APIs.
- Web: Next.js , React , Tailwind CSS, Axios.
- Mobile: Expo SDK , React Native, Expo Router, NativeWind, Axios.
- Auth: JWT (backend), localStorage (web), secure token cache support (mobile).

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+
- MongoDB (local or remote)


## Environment Variables

### Backend (`backend/.env`)

```env
# Required for auth
JWT_SECRET_KEY=replace-with-strong-secret

# Required for database
MONGODB_URI=mongodb://localhost:27017/
DATABASE_NAME=floodwatch_delhi

# Required for map routing + geocoding APIs
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Optional, used in social monitor geocoding
MAPBOX_TOKEN=your_mapbox_token

# Optional, image verification
OPENAI_API_KEY=your_openai_api_key

SOCIAL_TWITTER_BEARER_TOKEN=
SOCIAL_REDDIT_CLIENT_ID=
SOCIAL_REDDIT_CLIENT_SECRET=
SOCIAL_YOUTUBE_API_KEY=

FCM_SERVICE_ACCOUNT_PATH=
FCM_PROJECT_ID=
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```


## Local Development Setup

Run each app in a separate terminal.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health checks:

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/docs`

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

### 3. Mobile (Expo)

```bash
cd mobile/waterlogging-app
npm install
npm run start
```

Then choose Android/iOS/Web from Expo CLI.



