#  FloodWatch Delhi

> **A multi-platform solution for urban flood risk awareness, safe routing, and citizen issue management in Delhi.**

![Status](https://img.shields.io/badge/Status-Prototype-blue) ![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%20%7C%20Expo-orange) ![License](https://img.shields.io/badge/License-MIT-green)

## 📖 Overview

FloodWatch Delhi bridges the gap between **Proactive Intelligence** and **Reactive Governance**. It empowers citizens with real-time flood risk visualization and safe routing while providing Ward Officers with a command center for monitoring social distress signals and managing verified complaints.

 The system operates as a monorepo containing a **FastAPI** backend (analytics & logic), a **Next.js** web dashboard (for citizens/admins), and an **Expo React Native** mobile app (for on-ground reporting).

---

## 🚀 Key Features

###  Live Simulation & Analytics
* **Flood-Risk Prediction:** Uses **GeoPandas** and **scikit-learn** to model risk based on elevation, drainage capacity, and rainfall intensity.
* **Ward-Level Insights:** Granular risk views and preparedness stats for specific Delhi wards.
* **Simulation Control:** Adjust rainfall parameters to visualize potential impact hotspots.

###  Smart Routing & Safe Parking
* **Risk-Aware Navigation:** Integrated with **OSMnx** and **Google Maps API** to score route segments based on flood risk, guiding users away from waterlogged areas.
* **Safe Parking:** API endpoints that recommend high-elevation parking spots within a user's vicinity.

###  Citizen Reporting & Management
* **Unified Complaint System:** File complaints via Web or Mobile with location tagging, water depth, and priority levels.
* **Image Verification:** Automated pipelines to verify complaint authenticity (filtering AI-generated/spam images).
* **Timeline & Tracking:** Real-time status updates (Pending → Resolved) with Ward Officer ETAs.

###  Ward Officer Dashboard
* **Social Monitoring Panel:** Aggregates distress signals from Twitter/X, Reddit, and YouTube (via API integration) to identify unreported hotspots.
* **Emergency Broadcasts:** Admin tools to send alerts to specific wards.
* **Role-Based Access:** Secure JWT authentication separating Citizen and Admin workflows.

---

##  Monorepo Structure

```text
floodWatch-Delhi/
  backend/                  # FastAPI backend
    main.py                 # Entry point
    requirements.txt        # Python dependencies
    routes/                 # API endpoints (Auth, Flood, Complaints)
    controllers/            # Business logic
    core/                   # Config & Security
    east_delhi_data/        # GIS Data (Shapefiles/GeoJSON)
  frontend/                 # Next.js (App Router)
    app/                    # Pages & Layouts
    components/             # UI Components
    lib/                    # Utils & Axios instances
  mobile/
    waterlogging-app/       # Expo React Native App
      app/                  # Screens
      lib/                  # API connectors

```

## 🛠️ Tech Stack

**Frontend & Mobile**
![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Expo](https://img.shields.io/badge/expo-1C1E21?style=for-the-badge&logo=expo&logoColor=white)

**Backend & Data Science**
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Pandas](https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white)

**Infrastructure & APIs**
![Google Maps](https://img.shields.io/badge/Google_Maps-4285F4?style=for-the-badge&logo=google-maps&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

## ⚙️ Environment Variables

Create the `.env` files in their respective directories before running the project.

### 1. Backend (`backend/.env`)

```env
# --- Authentication ---
JWT_SECRET_KEY=replace-with-strong-secret-key

# --- Database ---
MONGODB_URI=mongodb://localhost:27017/
DATABASE_NAME=floodwatch_delhi

# --- Mapping & Geocoding ---
GOOGLE_MAPS_API_KEY=your_google_maps_key
MAPBOX_TOKEN=your_mapbox_token  # Optional (Social Monitor Geocoding)

# --- AI & Verification ---
OPENAI_API_KEY=your_openai_api_key

# --- Social Monitoring Keys ---
SOCIAL_TWITTER_BEARER_TOKEN=
SOCIAL_REDDIT_CLIENT_ID=
SOCIAL_REDDIT_CLIENT_SECRET=
SOCIAL_YOUTUBE_API_KEY=

# --- Notifications ---
FCM_SERVICE_ACCOUNT_PATH=path/to/fcm.json
FCM_PROJECT_ID=your_project_id

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
npx expo start
```

Then choose Android/iOS/Web from Expo CLI.
