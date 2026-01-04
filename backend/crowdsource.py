import random
import time

CROWDSOURCE_TEMPLATES = [
    "User reported {depth}ft water here",
    "Car stuck at {location}",
    "Traffic moving very slowly",
    "Water level rising rapidly",
    "Avoid this area",
    "Drain overflow reported",
    "Pedestrians wading through water",
    "Shop flooded on {location}",
]

LOCATIONS = [
    "Minto Bridge", "Zakhira", "ITO Crossing", "Ashram Chowk",
    "Kashmere Gate", "Connaught Place", "Dwarka", "Laxmi Nagar"
]

def generate_crowdsource_reports(rainfall_intensity: float, hotspots: list = None) -> list:
    reports = []
    num_reports = min(int(rainfall_intensity / 10) + 2, 8)
    
    if hotspots is None or len(hotspots) == 0:
        from hotspots import HOTSPOTS
        hotspots = HOTSPOTS
    
    for _ in range(num_reports):
        hotspot = random.choice(hotspots) if hotspots else None
        
        if hotspot and (hotspot.get('risk_level', 0) > 0 or random.random() > 0.5):
            template = random.choice(CROWDSOURCE_TEMPLATES)
            location = hotspot.get('name', random.choice(LOCATIONS))
            depth = random.choice(["1", "2", "3", "1.5", "2.5"])
            
            message = template.format(
                location=location,
                depth=depth
            )
            
            reports.append({
                "id": f"report_{int(time.time() * 1000)}_{random.randint(1000, 9999)}",
                "lat": hotspot['lat'] + random.uniform(-0.005, 0.005),
                "lng": hotspot['lng'] + random.uniform(-0.005, 0.005),
                "message": message,
                "timestamp": int(time.time()),
                "severity": hotspot.get('risk_level', 1)
            })
    
    return reports
