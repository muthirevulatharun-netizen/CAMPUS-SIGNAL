def calculate_priority_score(severity: str, frequency: int, affected_users: int, recent_increase: float, location_spread: int) -> float:
    # Priority Score = Severity×30 + Frequency×25 + Affected Users×20 + Recent Increase×15 + Location Spread×10
    
    severity_val = 0.5
    if severity == 'high': severity_val = 1.0
    elif severity == 'medium': severity_val = 0.5
    elif severity == 'low': severity_val = 0.2
    
    freq_val = min(1.0, frequency / 10.0)
    users_val = min(1.0, affected_users / 50.0)
    increase_val = min(1.0, recent_increase / 5.0)
    loc_val = min(1.0, location_spread / 5.0)
    
    score = (severity_val * 30) + (freq_val * 25) + (users_val * 20) + (increase_val * 15) + (loc_val * 10)
    return min(100.0, max(0.0, score))

def get_priority_label(score: float) -> str:
    if score < 35: return "low"
    elif score < 60: return "medium"
    elif score < 80: return "high"
    return "critical"

def generate_priority_explanation(score: float, frequency: int, location_spread: int, recent_increase: float, affected_users: int) -> str:
    label = get_priority_label(score).upper()
    return f"{label} priority because {frequency} related reports were detected across {location_spread} locations, reports increased {recent_increase:.1f}x this week, and {affected_users} users are affected."
