def calculate_preparedness_score(
    pumps_available: int,
    pumps_total: int,
    drains_desilted: bool,
    hotspot_risk_level: int
) -> dict:
    if pumps_total == 0:
        pump_score = 0
    else:
        pump_score = (pumps_available / pumps_total) * 60
    
    drain_score = 40 if drains_desilted else 0
    
    total_score = pump_score + drain_score
    
    if total_score >= 80:
        level = "Excellent"
    elif total_score >= 60:
        level = "Good"
    elif total_score >= 40:
        level = "Fair"
    else:
        level = "Poor"
    
    has_gap = hotspot_risk_level >= 1 and total_score < 60
    
    gap_message = ""
    if has_gap:
        if pumps_available < pumps_total:
            gap_message = f"Preparedness GAP: Only {pumps_available}/{pumps_total} pumps deployed"
        if not drains_desilted:
            if gap_message:
                gap_message += ", Drains not desilted"
            else:
                gap_message = "Preparedness GAP: Drains not desilted"
    
    return {
        "score": round(total_score),
        "level": level,
        "has_gap": has_gap,
        "gap_message": gap_message,
        "pump_score": round(pump_score),
        "drain_score": drain_score
    }

def calculate_ward_preparedness(ward: dict, hotspots_in_ward: list) -> dict:
    pumps_available = ward.get("pumps_available", 0)
    pumps_total = ward.get("pumps_total", 0)
    drains_desilted = ward.get("drains_desilted", False)
    
    max_risk = max([h.get("risk_level", 0) for h in hotspots_in_ward], default=0)
    
    return calculate_preparedness_score(
        pumps_available,
        pumps_total,
        drains_desilted,
        max_risk
    )
