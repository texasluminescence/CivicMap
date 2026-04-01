# CivicMap

CivicMap is a web platform that centralizes the discovery of civic engagement opportunities in Austin, TX. Instead of checking multiple websites, users get a personalized feed of city council meetings, town halls, community forums, and political events based on their interests, preferred formats, and schedules.

---

## Problem

- **Fragmented Discovery:** Civic events are scattered across city websites, Facebook, Eventbrite, and email lists
- **Information Overload:** Too many irrelevant events with no way to filter by topics you care about
- **Lack of Context:** Event descriptions are vague -- hard to tell if something is a routine meeting or a heated debate

---

## Features

- **Centralized Event Feed:** All Austin civic events in one searchable, filterable feed
- **Onboarding Questionnaire:** 5-step preference setup (topics, tone, location, schedule, format) on first signup
- **Personalized Recommendations:** Events ranked by relevance to your selected interests
- **Smart Categorization:** Keyword-based auto-tagging of event topics (Housing, Environment, Education, Healthcare, Transportation, Public Safety, Economy, Social Justice)
- **Tone Classification:** Events labeled by tone (Informational, Contentious, Collaborative, Action-Oriented, etc.) so users know what to expect
- **Event Detail Pages:** View full event info with bookmark and register actions
- **User Profiles:** View and edit preferences, manage saved events
- **Supabase Auth:** Email/password signup and login with session management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (`@supabase/ssr`) |
| ML / Data Processing | Python, sentence-transformers, Supabase Python client |
| Hosting | Amplify |

---

## Database Schema

Key tables in Supabase:

- **events** -- id, title, description, event_date, location, event_url, categories, tone, sector, source, is_virtual, embedding
- **categories** -- id, name
- **user_preferences** -- user_id, tone, sector, schedule, format (all text arrays)
- **user_category_prefs** -- user_id, category_id
- **user_interactions** -- id, user_id, event_id, interaction_type, weight, created_at
- **saved_events** -- user_id, event_id, saved_at
- **user_profiles** -- id, location, created_at, updated_at

---

## Machine Learning

Hybrid Python script in the `ml/` directory combining:

1. **Keyword-Based Event Tagging** (`ml/tag_events.py`)
   - Tags events with categories and tone based on keyword matching against event title and description
   - Reads from and writes back to the Supabase `events` table

2. **Vector Embeddings** (`ml/generate_embeddings.py`)
   - Generates 384-dimensional embeddings using sentence-transformers (all-MiniLM-L6-v2)
   - Combines title, description, and category into a single text for embedding
   - Stores embeddings in the embedding column for future similarity-based recommendations

--- 

## Team

**Build Team Lead:** Ashi Sharma

### Frontend
- Arav Bazar
- Shravan Venkat
- Khushi Bhalani

### Backend
- Hana Alsayed
- Anshu Siripurapu
- Vishal Rajkumar

### Machine Learning
- Nidhi Ilanthalavian
- Sasha Haltom
- Raina James

---

## Contact

Project Lead: ashisharma@utexas.edu
