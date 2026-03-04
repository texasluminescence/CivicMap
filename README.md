# CivicMap 

**Connecting Austin residents to local political events that matter to them.**

CivicMap is a web platform that solves the fragmented discovery of civic engagement opportunities. Instead of checking multiple websites, users get personalized recommendations for city council meetings, town halls, community forums, and political events based on their interests.

---

## 🎯 Problem We're Solving

- **Fragmented Discovery:** Political events are scattered across city websites, Facebook, Eventbrite, and email lists
- **Information Overload:** Too many irrelevant events, no way to filter by topics you care about
- **Lack of Context:** Event descriptions are vague—is this a routine meeting or a heated debate?

---

## ✨ Features

- **Centralized Event Feed:** All Austin political events in one place
- **Personalized Recommendations:** Set your interests (Housing, Environment, Education, etc.) and see relevant events first
- **Smart Categorization:** ML-powered auto-tagging of event topics
- **Tone Classification:** Know if an event is informational, contentious, or action-oriented before attending
- **Save Events:** Bookmark events you want to attend
- **User Accounts:** Personalized experience with secure authentication

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Next.js API Routes, Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **Machine Learning** | Python, Hugging Face Transformers |
| **Hosting** | Vercel |
| **Version Control** | Git, GitHub |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

---

## 🤖 Machine Learning

CivicMap uses ML for two key features:

1. **Automatic Event Categorization**
   - Tags events with relevant topics (Housing, Environment, Education, etc.)
   - Hugging Face zero-shot classification -> BERT models

2. **Event Tone Classification**
   - Classifies events as: Informational, Contentious, Action-Oriented, Procedural, Celebration
   - Helps users know what to expect before attending

3. **Personalized Recommendations**
   - Content-based filtering matches user interests to event tags
   - Events ranked by relevance score

---

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

---

## 👥 Team

**Build Team Lead:** Ashi Sharma

### Frontend Team
- Arav Bazar
- Shravan Venkat
- Khushi Bhalani

### Backend Team
- Hana Alsayed
- Anshu Siripurapu

### Machine Learning Team
- Nidhi Ilanthalavian
- Sasha Haltom
- Raina James

## 📧 Contact

- **Project Lead:** ashisharma@utexas.edu 
