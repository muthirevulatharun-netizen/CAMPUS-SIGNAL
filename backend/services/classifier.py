import re

SECTOR_KEYWORDS = {
    'IT & Wi-Fi': {
        'keywords': ['wifi', 'wi-fi', 'internet', 'network', 'connection', 'portal', 'slow', 'disconnecting', 'bandwidth', 'router', 'access point', 'connect', 'online', 'website', 'server', 'computer network'],
        'weight': 1.0,
        'icon': 'Wifi',
        'color': '#6366F1'
    },
    'Transportation': {
        'keywords': ['bus', 'transport', 'route', 'driver', 'late', 'delay', 'timing', 'vehicle', 'shuttle', 'pickup', 'drop', 'overcrowding'],
        'weight': 1.0,
        'icon': 'Bus',
        'color': '#F59E0B'
    },
    'Sports & Games': {
        'keywords': ['cricket', 'football', 'badminton', 'sports', 'equipment', 'ground', 'net', 'bat', 'ball', 'kit', 'gym', 'stadium', 'court', 'field'],
        'weight': 1.0,
        'icon': 'Trophy',
        'color': '#10B981'
    },
    'Fee & Finance': {
        'keywords': ['fee', 'receipt', 'payment', 'refund', 'balance', 'finance', 'money', 'challan', 'fine', 'scholarship', 'transaction', 'bank'],
        'weight': 1.0,
        'icon': 'DollarSign',
        'color': '#EF4444'
    },
    'Classrooms': {
        'keywords': ['projector', 'classroom', 'room', 'smart board', 'microphone', 'fan', 'light', 'ac', 'air condition', 'furniture', 'chair', 'desk', 'board', 'marker', 'chalk'],
        'weight': 1.0,
        'icon': 'School',
        'color': '#8B5CF6'
    },
    'Laboratories': {
        'keywords': ['lab', 'laboratory', 'computer lab', 'equipment', 'software', 'experiment', 'machine', 'hardware', 'printer', 'scanner'],
        'weight': 1.0,
        'icon': 'FlaskConical',
        'color': '#06B6D4'
    },
    'Library': {
        'keywords': ['library', 'book', 'reading', 'seating', 'reference', 'journal', 'study room', 'librarian', 'catalog', 'return'],
        'weight': 1.0,
        'icon': 'BookOpen',
        'color': '#D97706'
    },
    'Academic Services': {
        'keywords': ['timetable', 'attendance', 'exam', 'certificate', 'result', 'marks', 'schedule', 'teacher', 'professor', 'lecture', 'course', 'syllabus', 'academic'],
        'weight': 1.0,
        'icon': 'GraduationCap',
        'color': '#EC4899'
    },
    'Campus Facilities': {
        'keywords': ['water', 'washroom', 'toilet', 'clean', 'electricity', 'maintenance', 'garden', 'parking', 'canteen', 'cafeteria', 'hygiene', 'pest'],
        'weight': 1.0,
        'icon': 'Building2',
        'color': '#14B8A6'
    },
    'Student Services': {
        'keywords': ['id card', 'identity', 'document', 'certificate', 'application', 'hostel', 'noc', 'bonafide', 'admission', 'enrollment'],
        'weight': 1.0,
        'icon': 'Users',
        'color': '#6366F1'
    }
}

def classify(title: str, description: str):
    text = f"{title} {description}".lower()
    words = set(re.findall(r'\b\w+\b', text))
    
    best_sector = "Campus Facilities"
    best_score = 0.0
    best_category = "General"
    
    for sector, data in SECTOR_KEYWORDS.items():
        score = 0.0
        for kw in data['keywords']:
            if kw in text:
                score += data['weight']
        
        if score > best_score:
            best_score = score
            best_sector = sector
            best_category = data['keywords'][0].capitalize()
            
    confidence = min(1.0, best_score / 3.0)
    reason = f"Found matches for {best_sector} keywords" if best_score > 0 else "Default fallback"
    
    return {
        "sector": best_sector,
        "category": best_category,
        "confidence": confidence,
        "reason": reason
    }

def calculate_text_similarity(text1: str, text2: str) -> float:
    words1 = set(re.findall(r'\b\w+\b', text1.lower()))
    words2 = set(re.findall(r'\b\w+\b', text2.lower()))
    if not words1 and not words2:
        return 1.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union) if union else 0.0
