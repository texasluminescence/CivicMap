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

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/your-username/civicmap.git
   cd civicmap
```

2. **Install dependencies**
```bash
   npm install
```

3. **Set up environment variables**
```bash
   cp .env.example .env.local
```
   
   Edit `.env.local` and add your Supabase credentials:
```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. **Run the development server**
```bash
   npm run dev
```

5. **Open your browser**
   
   Visit [http://localhost:3000](http://localhost:3000)

---

## 🤖 Machine Learning

CivicMap uses ML for two key features:

1. **Automatic Event Categorization**
   - Tags events with relevant topics (Housing, Environment, Education, etc.)
   - Sprint 1-2: Keyword-based matching
   - Sprint 3+: Hugging Face zero-shot classification

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
- Adrian Casares
- Ved Puranik
- Hana Alsayed
- Anshu Siripurapu

### Machine Learning Team
- Nidhi Ilanthalavian
- Sasha Haltom
- Raina James

---

## 🙏 Acknowledgments

- Texas Luminescence (at the University of Texas at Austin) for project support
- Democracy Works for civic engagement inspiration
- Austin City Government for open data access
- All contributors and team members

---

## 📧 Contact

- **Project Lead:** ashisharma@utexas.edu 
