from sqlalchemy.orm import Session

from database import settings
from models import User, Sector, Complaint, IssueGroup, ComplaintGroupMember, Notification, StatusHistory, StaffAssignment
from services.classifier import SECTOR_KEYWORDS, classify
import random
from datetime import datetime, timedelta
import uuid


def generate_uuid():
    return str(uuid.uuid4())


def run_seed_data(db: Session):
    if db.query(Sector).count() > 0:
        return

    print("🌱 Seeding database with campus data...")

    # ─────────────────────────────────────────────
    # SECTORS
    # ─────────────────────────────────────────────
    sectors = {}
    for name, data in SECTOR_KEYWORDS.items():
        s = Sector(
            id=generate_uuid(),
            name=name,
            description=f"Handles all {name.lower()} related complaints and requests",
            icon=data['icon'],
            color=data['color']
        )
        db.add(s)
        sectors[name] = s
    db.flush()

    # ─────────────────────────────────────────────
    # ADMIN
    # ─────────────────────────────────────────────
    admin = User(
        id=generate_uuid(),
        full_name="Dr. Anil Mehta",
        email="admin@college.edu",
        role="admin" if settings.ALLOW_DEV_LOGIN else "student",
        department="Administration",
        profile_photo=None
    )
    db.add(admin)

    # ─────────────────────────────────────────────
    # STAFF (one per sector)
    # ─────────────────────────────────────────────
    staff_data = [
        {"name": "Ravi Kumar",    "email": "ravi.kumar@college.edu",    "sector": "IT & Wi-Fi",          "dept": "IT Department"},
        {"name": "Sunita Patel",  "email": "sunita.patel@college.edu",  "sector": "Transportation",       "dept": "Transport Office"},
        {"name": "Coach Ramesh",  "email": "ramesh.sports@college.edu", "sector": "Sports & Games",       "dept": "Sports Department"},
        {"name": "Priya Nair",    "email": "priya.finance@college.edu", "sector": "Fee & Finance",        "dept": "Finance Office"},
        {"name": "Suresh Yadav",  "email": "suresh.maint@college.edu",  "sector": "Classrooms",           "dept": "Maintenance"},
        {"name": "Dr. Kavitha",   "email": "kavitha.lab@college.edu",   "sector": "Laboratories",         "dept": "Lab Management"},
        {"name": "Mr. Shankar",   "email": "shankar.lib@college.edu",   "sector": "Library",              "dept": "Library"},
        {"name": "Ms. Deepa",     "email": "deepa.acad@college.edu",    "sector": "Academic Services",    "dept": "Academic Office"},
        {"name": "Mohan Reddy",   "email": "mohan.facil@college.edu",   "sector": "Campus Facilities",    "dept": "Facilities"},
        {"name": "Lakshmi Iyer",  "email": "lakshmi.stu@college.edu",   "sector": "Student Services",     "dept": "Student Affairs"},
    ]

    staff_users = {}
    for sd in staff_data:
        u = User(
            id=generate_uuid(),
            full_name=sd["name"],
            email=sd["email"],
            role="staff",
            department=sd["dept"]
        )
        db.add(u)
        staff_users[sd["sector"]] = u

    db.flush()

    # Create StaffAssignments
    for sd in staff_data:
        sector_obj = sectors.get(sd["sector"])
        staff_obj = staff_users.get(sd["sector"])
        if sector_obj and staff_obj:
            sa = StaffAssignment(
                id=generate_uuid(),
                staff_user_id=staff_obj.id,
                sector_id=sector_obj.id
            )
            db.add(sa)

    # ─────────────────────────────────────────────
    # STUDENTS (20)
    # ─────────────────────────────────────────────
    student_data = [
        {"name": "Arjun Mehta",    "email": "arjun.mehta@student.edu",    "dept": "Computer Science"},
        {"name": "Priya Sharma",   "email": "priya.sharma@student.edu",   "dept": "Electronics"},
        {"name": "Rahul Gupta",    "email": "rahul.gupta@student.edu",    "dept": "Mechanical"},
        {"name": "Anjali Singh",   "email": "anjali.singh@student.edu",   "dept": "Civil"},
        {"name": "Vikram Rao",     "email": "vikram.rao@student.edu",     "dept": "Computer Science"},
        {"name": "Sneha Joshi",    "email": "sneha.joshi@student.edu",    "dept": "Information Technology"},
        {"name": "Kiran Bhat",     "email": "kiran.bhat@student.edu",     "dept": "Electronics"},
        {"name": "Deepak Verma",   "email": "deepak.verma@student.edu",   "dept": "Computer Science"},
        {"name": "Meera Nair",     "email": "meera.nair@student.edu",     "dept": "Chemistry"},
        {"name": "Aditya Kumar",   "email": "aditya.kumar@student.edu",   "dept": "Physics"},
        {"name": "Pooja Reddy",    "email": "pooja.reddy@student.edu",    "dept": "Computer Science"},
        {"name": "Suresh Iyer",    "email": "suresh.iyer@student.edu",    "dept": "Mechanical"},
        {"name": "Nidhi Patel",    "email": "nidhi.patel@student.edu",    "dept": "Civil"},
        {"name": "Rohit Sharma",   "email": "rohit.sharma@student.edu",   "dept": "Electronics"},
        {"name": "Kavya Menon",    "email": "kavya.menon@student.edu",    "dept": "Computer Science"},
        {"name": "Ankit Mishra",   "email": "ankit.mishra@student.edu",   "dept": "Information Technology"},
        {"name": "Ritu Singh",     "email": "ritu.singh@student.edu",     "dept": "Chemistry"},
        {"name": "Gaurav Thakur",  "email": "gaurav.thakur@student.edu",  "dept": "Mechanical"},
        {"name": "Divya Kumari",   "email": "divya.kumari@student.edu",   "dept": "Computer Science"},
        {"name": "Harish Pillai",  "email": "harish.pillai@student.edu",  "dept": "Electronics"},
    ]

    students = []
    for sd in student_data:
        u = User(
            id=generate_uuid(),
            full_name=sd["name"],
            email=sd["email"],
            role="student",
            department=sd["dept"]
        )
        db.add(u)
        students.append(u)

    db.flush()

    # ─────────────────────────────────────────────
    # COMPLAINTS (100+)
    # ─────────────────────────────────────────────
    locations = [
        "C Block – 3rd Floor", "A Block – Ground Floor", "B Block – 2nd Floor",
        "D Block – 1st Floor", "Main Block", "Labs Block – Wing A",
        "Labs Block – Wing B", "Library Building", "Sports Ground",
        "Cafeteria", "Hostel Block A", "Admin Block", "Main Gate",
        "Computer Lab 1", "Computer Lab 2", "Seminar Hall", "Auditorium"
    ]

    # Each tuple: (title, description, manual_sector_hint)
    complaint_pool = [
        # ─── IT & Wi-Fi (35 complaints)
        ("WiFi is down in C Block", "The network is not connecting at all on the 3rd floor of C Block. Multiple students are affected.", "IT & Wi-Fi"),
        ("Internet isn't working", "Can't access the student portal or any website since morning. Very urgent for assignments.", "IT & Wi-Fi"),
        ("Network keeps dropping", "Wi-Fi connection is very unstable in the library. It disconnects every 5 minutes.", "IT & Wi-Fi"),
        ("Slow internet in lab", "Bandwidth is too low to watch recorded lectures or download any files in the computer lab.", "IT & Wi-Fi"),
        ("Wi-Fi not connecting", "Cannot connect to campus Wi-Fi on my laptop. Shows connected but no internet access.", "IT & Wi-Fi"),
        ("Portal unavailable", "Student portal is not opening since yesterday evening. Need to check exam schedule.", "IT & Wi-Fi"),
        ("Network disconnecting repeatedly", "Wi-Fi keeps disconnecting every few minutes. Very frustrating during online classes.", "IT & Wi-Fi"),
        ("Internet extremely slow", "The internet speed is so slow that pages don't load. This has been going on for 3 days.", "IT & Wi-Fi"),
        ("Cannot connect to campus network", "My device is unable to connect to the campus network in D Block. Other students also having issues.", "IT & Wi-Fi"),
        ("Wi-Fi password issue", "The Wi-Fi password was changed but we were not notified. Cannot connect now.", "IT & Wi-Fi"),
        ("Internet outage in hostel", "There is no internet connectivity in the hostel block since last night.", "IT & Wi-Fi"),
        ("Student portal not loading", "The student portal takes too long to load and sometimes gives error 502.", "IT & Wi-Fi"),
        ("Network access point down", "The access point on the 2nd floor of B Block seems to be down. No Wi-Fi signal.", "IT & Wi-Fi"),
        ("Wi-Fi signal weak", "Very weak Wi-Fi signal in the seminar hall. Cannot attend online sessions properly.", "IT & Wi-Fi"),
        ("LAN not working in lab", "The LAN cable connections in Computer Lab 2 are not working properly.", "IT & Wi-Fi"),
        ("Internet drops during exams", "The internet keeps dropping during online examination sessions which is very problematic.", "IT & Wi-Fi"),
        ("Cannot access library resources", "Unable to access e-library databases and journals due to network issues.", "IT & Wi-Fi"),
        ("VPN not connecting", "The college VPN is not connecting which blocks access to research resources.", "IT & Wi-Fi"),
        ("Email server down", "College email server is not responding. Cannot send or receive emails.", "IT & Wi-Fi"),
        ("Network issue in A Block", "No internet connectivity in A Block classrooms since morning.", "IT & Wi-Fi"),
        ("Wi-Fi dead zone in corridor", "The corridor between C and D Block has no Wi-Fi coverage at all.", "IT & Wi-Fi"),
        ("Internet speed very slow today", "Internet speed dropped significantly today. Usually fast but today unusable.", "IT & Wi-Fi"),
        ("Portal login error", "Student portal keeps showing login error even with correct credentials.", "IT & Wi-Fi"),
        ("Printing server unavailable", "Cannot connect to the printing server in the lab to print assignments.", "IT & Wi-Fi"),
        ("Network authentication failing", "Network authentication is failing repeatedly. Have to keep re-entering credentials.", "IT & Wi-Fi"),
        ("Wi-Fi not working in classroom", "Wi-Fi is completely down in Room 204 during lecture hours.", "IT & Wi-Fi"),
        ("Internet connectivity issue", "Intermittent internet connectivity issue affecting multiple students in the block.", "IT & Wi-Fi"),
        ("Campus Wi-Fi login page not loading", "The campus Wi-Fi login page itself is not loading so cannot connect.", "IT & Wi-Fi"),
        ("Slow download speed", "Download speed is less than 0.5 Mbps on campus network today.", "IT & Wi-Fi"),
        ("Network firewall blocking sites", "Campus network is blocking legitimate educational websites needed for study.", "IT & Wi-Fi"),
        ("Wi-Fi completely down on 3rd floor", "No Wi-Fi at all on the 3rd floor of the main block since this morning.", "IT & Wi-Fi"),
        ("Internet not working after maintenance", "Internet stopped working after yesterday's maintenance and hasn't resumed.", "IT & Wi-Fi"),
        ("Cannot submit online assignment", "Internet keeps disconnecting while trying to submit assignment online. Very urgent.", "IT & Wi-Fi"),
        ("Network issue during lecture", "Wi-Fi went down in the middle of an important online lecture. Very disruptive.", "IT & Wi-Fi"),
        ("Portal showing wrong data", "Student portal is showing incorrect attendance data. Please check the server.", "IT & Wi-Fi"),

        # ─── Transportation (12 complaints)
        ("Bus 3 is late again", "The Route 3 shuttle was 40 minutes late today. This is happening daily.", "Transportation"),
        ("Bus didn't arrive", "The 8 AM shuttle from Main Gate did not come today. 30+ students were waiting.", "Transportation"),
        ("Bus overcrowded", "Bus Route 2 is severely overcrowded. Students are standing in dangerous conditions.", "Transportation"),
        ("Driver behavior complaint", "The driver of Route 5 bus was reckless and driving too fast on the highway.", "Transportation"),
        ("Route 3 delay every morning", "Bus Route 3 is consistently late by 30+ minutes every morning this week.", "Transportation"),
        ("No bus for route 7", "Bus for Route 7 was completely absent today. No alternative provided.", "Transportation"),
        ("Transport timing changed without notice", "The bus timing was changed without any student notification.", "Transportation"),
        ("Bus breakdown on highway", "Bus Route 4 broke down on the highway leaving 20 students stranded.", "Transportation"),
        ("Route 3 morning delay", "Again, Route 3 was delayed by 45 minutes this morning during peak hours.", "Transportation"),
        ("Bus not stopping at designated point", "The shuttle is not stopping at the designated stop near B Hostel anymore.", "Transportation"),
        ("Need additional bus for Route 3", "Route 3 has too many students and needs an additional bus in the morning.", "Transportation"),
        ("Late bus missed exam", "I was late for the exam because the college bus was 1 hour late.", "Transportation"),

        # ─── Sports & Games (10 complaints)
        ("Cricket bat missing", "All cricket bats are missing from the sports room. Cannot practice.", "Sports & Games"),
        ("Football net damaged", "The football goal net is torn and needs immediate replacement.", "Sports & Games"),
        ("Badminton rackets unavailable", "No badminton rackets available in sports room. Need at least 4 pairs.", "Sports & Games"),
        ("Cricket net is damaged", "The cricket practice net has multiple holes. Unusable for bowling practice.", "Sports & Games"),
        ("Sports ground flooded", "The main sports ground is waterlogged due to rain. Need drainage.", "Sports & Games"),
        ("Need more cricket equipment", "Not enough cricket bats and pads for the full cricket team.", "Sports & Games"),
        ("Volleyball court broken", "The volleyball court net post is broken and court lines are faded.", "Sports & Games"),
        ("Gym equipment not working", "Several gym equipment machines are broken and need servicing.", "Sports & Games"),
        ("Table tennis table damaged", "The table tennis table in the recreation room has a broken leg.", "Sports & Games"),
        ("Basketball hoop broken", "The basketball hoop backboard is cracked and dangerous to use.", "Sports & Games"),

        # ─── Fee & Finance (10 complaints)
        ("Fee receipt not generated", "Paid the fee online 3 days ago but receipt not generated in portal.", "Fee & Finance"),
        ("Payment status not updated", "My fee payment shows as pending in the portal even after 5 days of payment.", "Fee & Finance"),
        ("Wrong balance shown", "The portal is showing incorrect outstanding balance. I have already paid.", "Fee & Finance"),
        ("Refund not received", "Applied for refund 2 months ago but not yet received. Urgent financial need.", "Fee & Finance"),
        ("Scholarship amount not credited", "The merit scholarship amount has not been credited to my account.", "Fee & Finance"),
        ("Double payment deducted", "Two payments were deducted from my account for the same fee.", "Fee & Finance"),
        ("Fee payment portal error", "Fee payment portal is giving error when trying to make payment.", "Fee & Finance"),
        ("Fine incorrectly applied", "A late fee fine has been applied to my account but I paid on time.", "Fee & Finance"),
        ("Exam fee not updated", "I paid the exam fee but it still shows as unpaid in the portal.", "Fee & Finance"),
        ("No acknowledgment for payment", "Paid the fee but no confirmation email or receipt was received.", "Fee & Finance"),

        # ─── Classrooms (10 complaints)
        ("Projector not working in Room 204", "The projector in Room 204 has not been working for the past week. Lectures are affected.", "Classrooms"),
        ("AC not working in lecture hall", "Air conditioner in the main lecture hall is broken. Very hot inside.", "Classrooms"),
        ("Smart board problem", "The smart board in Room 105 doesn't connect to the laptop.", "Classrooms"),
        ("Microphone not working", "The wireless microphone in the seminar hall is not working.", "Classrooms"),
        ("Fan broken in classroom", "Two fans in Room 302 are not working. Very hot weather conditions.", "Classrooms"),
        ("Lights flickering in B Block", "Lights are flickering in B Block Room 201. Very distracting during lectures.", "Classrooms"),
        ("Chair broken in classroom", "Multiple chairs in Room 401 are broken and unsafe to sit on.", "Classrooms"),
        ("Whiteboard marker missing", "No whiteboard markers available in Room 103 for the past 2 days.", "Classrooms"),
        ("Classroom door lock broken", "The lock on Room 308 door is broken. Cannot secure the room.", "Classrooms"),
        ("Projector bulb blown", "Projector in Room 506 has a blown bulb. Screen is very dim.", "Classrooms"),

        # ─── Laboratories (8 complaints)
        ("Computers not working in Lab A", "10 out of 30 computers in Lab A are not working. Affects practical sessions.", "Laboratories"),
        ("Software not installed in lab", "Python and VS Code are not installed on lab computers. Need for practical exam.", "Laboratories"),
        ("Lab equipment damaged", "Several microscopes in the chemistry lab are broken and need repair.", "Laboratories"),
        ("Internet not working in lab", "No internet connection in Computer Lab 2. Cannot do online practicals.", "Laboratories"),
        ("Printer in lab not working", "The lab printer has been out of order for 2 weeks. Cannot print reports.", "Laboratories"),
        ("Lab AC not working", "AC in the electronics lab is not working. Equipment overheating risk.", "Laboratories"),
        ("Power outlets not working", "Several power outlets in Physics Lab are not functioning properly.", "Laboratories"),
        ("Lab ventilation poor", "Very poor ventilation in the chemistry lab during experiments.", "Laboratories"),

        # ─── Library (7 complaints)
        ("Library computers slow", "Library computers take very long to start up and are very slow.", "Library"),
        ("Books not available", "Several required textbooks for semester exams are not available in the library.", "Library"),
        ("Seating insufficient", "During exam season there are not enough seats in the library reading hall.", "Library"),
        ("Library AC not working", "AC in the library is not working. Cannot study in the heat.", "Library"),
        ("Library timing issue", "Library closes at 5 PM but students need access until 9 PM during exams.", "Library"),
        ("Noisy in library reading hall", "Some students are making noise in the reading hall. Strict rules needed.", "Library"),
        ("E-library access down", "Cannot access e-library resources and online journals from campus.", "Library"),

        # ─── Campus Facilities (8 complaints)
        ("Washroom unclean in C Block", "Ground floor washroom in C Block is very unclean and has water leakage.", "Campus Facilities"),
        ("Drinking water not available", "The drinking water RO system in B Block has been broken for 3 days.", "Campus Facilities"),
        ("Electricity fluctuation", "Frequent electricity fluctuations in D Block causing equipment damage.", "Campus Facilities"),
        ("Garbage not collected", "Garbage bins near the cafeteria are overflowing and not being collected.", "Campus Facilities"),
        ("Parking area maintenance", "The student parking area has large potholes making it dangerous for bikes.", "Campus Facilities"),
        ("Canteen food quality issue", "The canteen is serving stale food. Several students got sick last week.", "Campus Facilities"),
        ("Broken bench in campus garden", "Several benches in the campus garden are broken and need replacement.", "Campus Facilities"),
        ("Pest problem in hostel", "There is a cockroach and rat problem in Hostel Block A. Urgent pest control needed.", "Campus Facilities"),
    ]

    # Build 110 complaints with varied timing for trend analysis
    now = datetime.utcnow()
    year = now.year
    complaint_counter = 1000

    for title, description, sector_hint in complaint_pool:
        student = random.choice(students)
        classification = classify(title, description)

        # Use the sector hint if available, else use classifier
        sector_name = sector_hint if sector_hint in sectors else classification['sector']
        sector_obj = sectors.get(sector_name, list(sectors.values())[0])

        # Staff assignment
        staff_for_sector = staff_users.get(sector_name)

        # Vary creation time: most IT complaints recent (last 7 days), others 30 days
        if sector_hint == "IT & Wi-Fi":
            days_ago = random.choices(
                [0, 1, 2, 3, 4, 5, 6],
                weights=[15, 12, 8, 6, 5, 4, 3]
            )[0]
        else:
            days_ago = random.randint(0, 30)

        hours_ago = random.randint(0, 23)
        created_time = now - timedelta(days=days_ago, hours=hours_ago)

        # Priority - IT complaints more likely high/critical given clustering
        if sector_hint == "IT & Wi-Fi" and days_ago <= 2:
            priority = random.choices(["high", "critical"], weights=[60, 40])[0]
        elif sector_hint == "Transportation":
            priority = random.choices(["medium", "high"], weights=[60, 40])[0]
        else:
            priority = random.choices(["low", "medium", "high", "critical"], weights=[30, 35, 25, 10])[0]

        # Status based on age and priority
        if days_ago == 0:
            status = random.choices(["submitted", "assigned"], weights=[60, 40])[0]
        elif days_ago <= 2:
            status = random.choices(["assigned", "investigating", "action_taken"], weights=[30, 50, 20])[0]
        else:
            status = random.choices(["investigating", "resolved", "closed"], weights=[30, 50, 20])[0]

        complaint_number = f"CS-{year}-{complaint_counter:04d}"
        complaint_counter += 1

        priority_score = {"low": random.uniform(10, 34), "medium": random.uniform(35, 59),
                          "high": random.uniform(60, 79), "critical": random.uniform(80, 100)}[priority]

        c = Complaint(
            id=generate_uuid(),
            complaint_number=complaint_number,
            student_id=student.id,
            title=title,
            description=description,
            location=random.choice(locations),
            category=classification['category'],
            sector_id=sector_obj.id,
            priority=priority,
            priority_score=round(priority_score, 1),
            severity=priority,
            status=status,
            assigned_staff_id=staff_for_sector.id if staff_for_sector and status != "submitted" else None,
            created_at=created_time,
            updated_at=created_time + timedelta(minutes=random.randint(5, 120)),
            resolved_at=created_time + timedelta(hours=random.randint(2, 24)) if status in ("resolved", "closed") else None
        )
        db.add(c)
        db.flush()

        # Add status history
        if status != "submitted":
            history1 = StatusHistory(
                id=generate_uuid(),
                complaint_id=c.id,
                old_status="submitted",
                new_status="assigned",
                changed_by=admin.id,
                comment="Automatically assigned based on sector classification",
                created_at=created_time + timedelta(minutes=2)
            )
            db.add(history1)

        if status in ("investigating", "action_taken", "resolved", "closed"):
            history2 = StatusHistory(
                id=generate_uuid(),
                complaint_id=c.id,
                old_status="assigned",
                new_status="investigating",
                changed_by=staff_for_sector.id if staff_for_sector else admin.id,
                comment="Started investigating the issue",
                created_at=created_time + timedelta(minutes=random.randint(10, 60))
            )
            db.add(history2)

        if status in ("resolved", "closed"):
            history3 = StatusHistory(
                id=generate_uuid(),
                complaint_id=c.id,
                old_status="investigating",
                new_status="resolved",
                changed_by=staff_for_sector.id if staff_for_sector else admin.id,
                comment="Issue resolved successfully",
                created_at=c.resolved_at
            )
            db.add(history3)

    db.flush()

    # ─────────────────────────────────────────────
    # ISSUE GROUPS
    # ─────────────────────────────────────────────
    it_sector = sectors.get("IT & Wi-Fi")
    transport_sector = sectors.get("Transportation")
    sports_sector = sectors.get("Sports & Games")

    # Issue Group 1: Campus Network Instability (MAIN SIGNAL)
    ig1 = IssueGroup(
        id=generate_uuid(),
        title="Campus Network Instability",
        description="Multiple students reporting Wi-Fi and internet connectivity issues across different blocks of the campus. The pattern indicates a possible infrastructure-level problem.",
        sector_id=it_sector.id if it_sector else None,
        category="Network Connectivity",
        complaint_count=42,
        affected_users=27,
        affected_locations=["C Block – 3rd Floor", "A Block – Ground Floor", "B Block – 2nd Floor", "Labs Block – Wing A"],
        trend_percentage=320.0,
        priority="high",
        first_detected=now - timedelta(days=7),
        last_updated=now - timedelta(hours=1),
        status="active"
    )
    db.add(ig1)

    # Issue Group 2: Route 3 Morning Delays
    ig2 = IssueGroup(
        id=generate_uuid(),
        title="Route 3 Morning Delays",
        description="Bus Route 3 is consistently delayed during morning peak hours, affecting students' punctuality for morning lectures.",
        sector_id=transport_sector.id if transport_sector else None,
        category="Bus Delays",
        complaint_count=17,
        affected_users=34,
        affected_locations=["Main Gate", "Hostel Block A"],
        trend_percentage=210.0,
        priority="high",
        first_detected=now - timedelta(days=5),
        last_updated=now - timedelta(hours=3),
        status="active"
    )
    db.add(ig2)

    # Issue Group 3: Sports Equipment Shortage
    ig3 = IssueGroup(
        id=generate_uuid(),
        title="Cricket Equipment Shortage",
        description="Multiple students requesting cricket equipment for practice. Indicates a shortage in sports inventory.",
        sector_id=sports_sector.id if sports_sector else None,
        category="Equipment Shortage",
        complaint_count=12,
        affected_users=18,
        affected_locations=["Sports Ground"],
        trend_percentage=100.0,
        priority="medium",
        first_detected=now - timedelta(days=3),
        last_updated=now - timedelta(hours=5),
        status="active"
    )
    db.add(ig3)
    db.flush()

    # Link IT complaints to ig1
    it_complaints = db.query(Complaint).join(
        Complaint.sector
    ).filter(
        Complaint.sector_id == it_sector.id
    ).limit(35).all() if it_sector else []

    for idx, c in enumerate(it_complaints[:35]):
        member = ComplaintGroupMember(
            id=generate_uuid(),
            complaint_id=c.id,
            issue_group_id=ig1.id,
            similarity_score=round(random.uniform(0.65, 0.98), 2)
        )
        db.add(member)

    # ─────────────────────────────────────────────
    # NOTIFICATIONS
    # ─────────────────────────────────────────────
    it_staff = staff_users.get("IT & Wi-Fi")
    arjun = next((s for s in students if "Arjun" in s.full_name), students[0])

    # Notification for IT staff about high priority signal
    if it_staff:
        n1 = Notification(
            id=generate_uuid(),
            recipient_user_id=it_staff.id,
            issue_group_id=ig1.id,
            title="🔴 HIGH PRIORITY: Campus Network Instability",
            message="42 related complaints detected across 4 campus locations. Immediate investigation required.",
            type="NEW_EMERGING_ISSUE",
            is_read=False,
            created_at=now - timedelta(hours=1)
        )
        db.add(n1)

    # Notification for admin
    n2 = Notification(
        id=generate_uuid(),
        recipient_user_id=admin.id,
        issue_group_id=ig1.id,
        title="⚠️ Emerging Signal Detected",
        message="Campus Network Instability signal detected. 42 complaints, ↑4.2x increase this week. IT team has been notified.",
        type="ADMIN_ALERT",
        is_read=False,
        created_at=now - timedelta(minutes=30)
    )
    db.add(n2)

    # Student notification for resolved complaint
    n3 = Notification(
        id=generate_uuid(),
        recipient_user_id=arjun.id,
        title="✅ Complaint Resolved",
        message="Your complaint 'WiFi is down in C Block' has been resolved. Network access point was restarted and connectivity has been restored.",
        type="COMPLAINT_RESOLVED",
        is_read=False,
        created_at=now - timedelta(hours=2)
    )
    db.add(n3)

    transport_staff = staff_users.get("Transportation")
    if transport_staff:
        n4 = Notification(
            id=generate_uuid(),
            recipient_user_id=transport_staff.id,
            issue_group_id=ig2.id,
            title="🔴 Route 3 Delay Signal",
            message="17 transport complaints detected. Route 3 morning delays affecting 34 students. Review morning schedule.",
            type="NEW_EMERGING_ISSUE",
            is_read=True,
            created_at=now - timedelta(hours=3)
        )
        db.add(n4)

    db.commit()
    print("✅ Seed complete! Database has:")
    print(f"   - 10 sectors")
    print(f"   - 1 admin, 10 staff, 20 students")
    print(f"   - {len(complaint_pool)} complaints")
    print(f"   - 3 issue groups")
    print(f"   - Notifications and status history")
