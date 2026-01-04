# FloodWatch Delhi

A full-stack application that predicts and visualizes waterlogging hotspots in Delhi based on rainfall intensity.

## Tech Stack

- **Backend:** Python (FastAPI) with Scikit-Learn (Random Forest)
- **Frontend:** Next.js (App Router) + Tailwind CSS + Leaflet (OpenStreetMap)

## Quick Start

### Option 1: Using Batch Scripts (Windows)

1. **Start Backend:** Double-click `start-backend.bat`
2. **Start Frontend:** Open a new terminal and double-click `start-frontend.bat` (or run in a new window)
3. **Open Browser:** Go to http://localhost:3000

### Option 2: Manual Setup

See [QUICKSTART.md](QUICKSTART.md) for detailed step-by-step instructions.

## Project Structure

```
.
├── backend/
│   ├── main.py          # FastAPI application
│   ├── model.py         # ML model training script
│   ├── hotspots.py      # Delhi hotspots data
│   └── requirements.txt # Python dependencies
└── frontend/
    ├── app/             # Next.js app directory
    ├── components/      # React components
    └── package.json     # Node dependencies
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Train the model (optional, dummy logic will be used if model is not found):
   ```bash
   python model.py
   ```

5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Features

- **Real-time Prediction:** Adjust rainfall intensity slider to see live flood risk predictions
- **Interactive Map:** Leaflet (OpenStreetMap) map with color-coded markers (Green=Safe, Orange=Warning, Red=Critical)
- **Hotspot Details:** Click on markers to see detailed flood probability information
- **Active Alerts:** Dashboard showing count of critical flood alerts

\
