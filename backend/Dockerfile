FROM python:3.11

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gdal-bin libgdal-dev libspatialindex-dev \
    libgeos-dev libproj-dev \
    && rm -rf /var/lib/apt/lists/*

# Add this line — change the date to force fresh pip install
ARG CACHE_BUST=2026-03-28
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]