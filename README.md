# 🎯 CAMPUS SIGNAL

> **"From scattered complaints to clear campus action."**

An intelligent campus service management platform for engineering colleges. Campus Signal converts scattered student complaints into structured, assigned, explainable, and actionable campus signals.

## 🏆 Competition: INX – Signal in the Noise

**Many complaints. One signal. The right person. Faster action.**

---

## 🧠 Intelligence Pipeline

```
STUDENT REPORT → UNDERSTAND → CLASSIFY → IDENTIFY SECTOR → ASSIGN STAFF
→ NOTIFY → GROUP SIMILAR → CALCULATE PRIORITY → DETECT EMERGING ISSUES
→ RECOMMEND ACTION → RESOLVE → UPDATE STUDENT
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs on: http://localhost:8000
API Docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:3000

---

## 🔐 Environment Variables

### Backend `.env`
```
DATABASE_URL=sqlite:///./campus_signal.db
JWT_SECRET=
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-oauth-client-id
ALLOW_DEV_LOGIN=true
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
NEXT_PUBLIC_ENABLE_DEV_LOGIN=true
```

For deployment, set `JWT_SECRET` to a long random value, `GOOGLE_CLIENT_ID`, and `FRONTEND_URL` in Render, and set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel. Keep `ALLOW_DEV_LOGIN` and `NEXT_PUBLIC_ENABLE_DEV_LOGIN` disabled in production. Never commit actual credentials.

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Student** | Submit complaints, track status, receive notifications |
| **Staff** | Manage assigned complaints, update status, add evidence |
| **Admin** | Full access, analytics, signal detection, staff management |

### Demo Login (Development)

Visit http://localhost:3000/auth/login and use the dev login dropdown:
- **Admin**: admin@college.edu
- **Staff (IT)**: ravi.kumar@college.edu  
- **Staff (Transport)**: sunita.patel@college.edu
- **Student**: arjun.mehta@student.edu

---

## 📊 Key Features

### 🔍 Automatic Classification
Types text → Detects sector → Explains why

### 👤 Smart Staff Assignment  
Finds available staff in detected sector → Assigns → Notifies

### 🔗 Issue Grouping
Groups similar complaints → Identifies underlying problem

### 📈 Priority Scoring
```
Score = Severity×30 + Frequency×25 + Affected Users×20 + Recent Increase×15 + Location Spread×10
```

### ⚠️ Emerging Issue Detection
Detects rapid increase in similar complaints → Alerts admin

### 🎭 Live Demo Mode
Simulates a complete campus incident from report to resolution

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Animations | Framer Motion |
| Backend | Python FastAPI |
| Database | SQLite (dev) / PostgreSQL (production) |
| Auth | Google OAuth 2.0 |

---

## 📁 Project Structure

```
campus-signal/
├── frontend/          # Next.js 14 application
│   ├── app/           # App Router pages
│   ├── components/    # Reusable components
│   └── lib/           # Utilities and API client
├── backend/           # FastAPI server
│   ├── routers/       # API route handlers
│   ├── services/      # Business logic
│   └── models.py      # Database models
└── README.md
```

---

## 🎬 Demo Flow

1. Student signs in → Reports "Wi-Fi not working in C Block"
2. System classifies → IT & Wi-Fi detected
3. Auto-assigns → Ravi Kumar (IT Support) notified
4. More students report similar issues
5. System groups → "Campus Network Instability" detected
6. Priority: HIGH (42 reports, 4 locations, ↑4.2x)
7. Admin investigates → IT team resolves
8. Student receives resolution notification

---

## 📄 License

Built for INX – Signal in the Noise Competition 2026.
