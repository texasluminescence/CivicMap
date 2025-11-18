import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load from .env.local in the parent directory
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials! Make sure .env.local exists in the root directory.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# CATEGORY KEYWORDS
# ==========================
category_keywords = {
    "Housing": [
        "housing", "rent", "rental", "renter", "tenant", "tenants", "affordable housing",
        "home ownership", "owning a home", "houses", "house", "shelter", "emergency shelter",
        "residency", "residential", "apartment", "apartments", "condo", "condominium",
        "eviction", "evicted", "homeless", "homelessness", "unhoused", "unsheltered",
        "public housing", "landlord", "lease", "leasing", "low-income housing",
        "property taxes", "real estate", "real estate costs", "housing crisis",
        "housing insecurity", "housing stability", "housing assistance", "hud",
        "gentrification", "displacement"
    ],
    "Environment": [
        "environment", "environmental", "sustainable", "sustainability", "climate change",
        "global warming", "environmental justice", "green politics", "conservation",
        "environmentalism", "biodiversity", "environmental policy", "epa",
        "environmental protection agency", "renewable energy", "clean energy",
        "carbon footprint", "fossil fuel", "emissions", "climate activism", "pollution",
        "air quality", "water quality", "recycling", "waste management", "composting",
        "solar energy", "wind energy", "green energy", "ecosystem", "wildlife",
        "natural resources", "deforestation", "climate resilience", "climate justice",
        "drought", "flood", "natural disaster", "environmental regulation", "parks",
        "park", "recreation"
    ],
    "Education": [
        "education", "educational", "school", "schooling", "schools", "pupils", "learners",
        "educator", "student", "students", "learning", "workshop", "seminar", "lecture",
        "civic education", "curriculum", "teacher", "class", "professor", "classroom",
        "college", "university", "higher education", "tuition", "financial aid",
        "scholarships", "loans", "public schools", "private schools", "charter schools",
        "literacy", "tutoring", "stem", "early childhood", "preschool", "academic achievement",
        "test scores", "graduation", "graduation rates", "education policy",
        "board of education", "school district", "campus", "student loans", "youth leadership",
        "civic engagement workshop"
    ],
    "Healthcare": [
        "healthcare", "health care", "health system", "medical", "hospital", "clinic",
        "medical center", "clinical access", "medical access", "healthcare access",
        "mental health", "wellness", "doctor", "nurse", "physician", "patient",
        "health insurance", "health coverage", "medicaid", "medicare", "public health",
        "community health", "preventative care", "screenings", "health disparities",
        "access to care", "prescriptions", "medication", "pharmacy", "covid", "pandemic",
        "vaccination", "immunization", "reproductive health", "maternal health",
        "emergency care", "urgent care", "health reform", "healthcare policy",
        "chronic illness", "disease prevention", "medicine", "treatment"
    ],
    "Transportation": [
        "transportation", "transit", "commute", "commuting", "bus", "metro", "subway",
        "train", "rail", "traffic", "congestion", "road", "highway", "infrastructure",
        "bike lanes", "sidewalks", "pedestrian", "walkability", "public transit",
        "mass transit", "airport", "flight", "airline", "parking", "carpool", "rideshare",
        "uber", "lyft", "mobility", "accessibility", "ev charging", "transportation funding",
        "dot", "txdot", "infrastructure bill", "construction", "bridge repair",
        "urban planning", "smart cities", "route", "fare"
    ],
    "Public Safety": [
        "public safety", "community safety", "policing", "law enforcement", "sheriff",
        "crime", "criminal", "violence", "homicide", "assault", "fire department",
        "firefighter", "emergency services", "ems", "safety measures", "safety training",
        "self-defense", "disaster response", "emergency response", "gun violence", "weapons",
        "firearm", "shooting", "public security", "homeland security", "safety initiative",
        "neighborhood watch", "traffic safety", "road safety", "police", "law and order",
        "crime prevention", "security", "over-policing", "criminal justice", "civil order",
        "crime rate", "incarceration", "criminal violence", "prosecution", "sentencing",
        "rehabilitation", "bail", "bail reform", "civil rights", "due process",
        "crisis response", "gang violence", "disaster relief", "looting", "police reform",
        "de-escalation", "body cameras", "opioid epidemic", "fentanyl crisis",
        "drug trafficking", "gun control", "rescue", "first responders", "domestic violence",
        "abuse prevention", "abuse"
    ],
    "Economy": [
        "monopolies", "monopoly", "recession", "depression", "inflation", "economic growth",
        "paycheck-to-paycheck", "taxation policy", "tax rate", "interest rate", "tax policies",
        "economy", "economic policy", "market", "market crash", "stock market", "stocks",
        "wealth distribution", "wealth inequality", "capitalism", "communism", "socialism",
        "wealth redistribution", "free market", "market regulation", "progressive taxation",
        "rich", "poor", "ultra-wealthy", "unemployment", "employment", "job market",
        "tech for good", "hackathon"
    ],
    "Social Justice": [
        "social justice", "justice", "equality", "equity", "inclusion", "human rights",
        "civil rights", "discrimination", "racism", "sexism", "bias", "gender",
        "gender equality", "women's rights", "womens rights", "lgbtq+", "lgbtq",
        "immigration", "immigrant", "refugee", "asylum", "voting rights", "voter suppression",
        "democracy", "incarceration", "prison reform", "criminal justice reform", "hate crimes",
        "hate", "systematic oppression", "marginalization", "community organizing",
        "grassroots", "diversity", "belonging", "anti-racism", "freedom of speech",
        "freedom of religion", "voter registration", "voting", "vote", "civic engagement",
        "volunteer", "volunteers", "food drive", "donation", "women in policy",
        "tenant rights", "inequality", "equity town hall"
    ]
}


# TONE KEYWORDS
# ==========================
tone_keywords = {
    "Informational": [
        "information", "update", "details", "reminder", "agenda", "meeting",
        "announcement", "notice", "resources", "rsvp", "session", "webinar",
        "presentation", "overview", "schedule", "invite", "workshop", "seminar",
        "discussion", "forum", "listening", "session", "screening", "demos", "talks"
    ],
    "Contentious": [
        "outrage", "angry", "boycott", "fight", "against", "hate", "protest",
        "unacceptable", "injustice", "demand change", "resist", "clash",
        "controversial", "debate", "conflict", "petition"
    ],
    "Collaborative": [
        "together", "join us", "work with", "partner", "collaborate", "community",
        "discussion", "listening", "feedback", "dialogue", "co-create", "coalition",
        "networking", "roundtable", "forum"
    ],
    "Action-Oriented": [
        "volunteer", "volunteers", "register", "sign up", "participate",
        "join", "help", "donate", "contribute", "get involved", "take part",
        "beautify", "drive", "rally", "advocating"
    ],
    "Procedural": [
        "council meeting", "hearing", "comment session", "public comment",
        "proposed", "policy", "ordinance", "vote", "legislative", "zoning",
        "government", "city council", "chambers"
    ],
    "Celebration": [
        "celebrate", "celebration", "festival", "screening", "film", "meetup",
        "networking", "women in", "holiday", "kickoff"
    ],
    "Advocacy": [
        "demand", "we call on", "sign", "support", "oppose", "urge", "take action",
        "vote", "pressure", "campaign", "petition", "stand up", "speak out",
        "mobilize", "defend", "protect"
    ],
    "Empathetic": [
        "understand", "care", "help", "support", "we're here for", "together",
        "stand with", "comfort", "solidarity", "healing", "compassion",
        "mental health", "kindness", "uplift", "hope", "share experiences"
    ],
    "Urgent": [
        "now", "immediately", "urgent", "deadline", "last chance", "critical",
        "don't wait", "act fast", "time-sensitive", "today", "asap",
        "register now", "limited time"
    ],
    "Neutral": [
        "policy", "procedure", "report", "regulation", "update", "data",
        "statistics", "findings", "requirements", "compliance", "administrative",
        "governance", "official", "minutes"
    ]
}


# TAGGING FUNCTIONS
# ==========================
def tag_categories(text):
    # Tag with ONE primary category based on keywords in title + description
    text = str(text).lower()
    for cat, keywords in category_keywords.items():
        for kw in keywords:
            if kw in text:
                return cat  # return immediately on first match; only tag ONE category  
    return "Economy" 

def tag_tones(text):
    # Tag with tones based on keywords in title + description
    text = str(text).lower()
    matched = []
    for tone, keywords in tone_keywords.items():
        for kw in keywords:
            if kw in text:
                matched.append(tone)
                break
    return ", ".join(sorted(set(matched))) if matched else "Informational"


# MAIN FUNCTION
# ==========================
def main():
    print("Fetching events from Supabase...")
    
    # Fetch all events
    response = supabase.table("events").select("id, title, description").execute()
    events = response.data
    
    if not events:
        print("No events found!")
        return
    
    print(f"Found {len(events)} events. Tagging with category and tones...\n")
    
    # Tag each event
    for i, event in enumerate(events, 1):
        event_id = event["id"]
        title = event.get("title", "")
        description = event.get("description", "")
        
        # Combine title and description for better accuracy
        full_text = f"{title} {description}"
        
        category = tag_categories(full_text)
        tone = tag_tones(full_text)
        
        # Update Supabase
        try:
            supabase.table("events").update({
                "category": category,  
                "tone": tone
            }).eq("id", event_id).execute()
            
            print(f"✓ [{i}/{len(events)}] '{title[:50]}...'")
            print(f"   Category: {category}")
            print(f"   Tone: {tone}\n")
        except Exception as e:
            print(f"✗ [{i}/{len(events)}] Failed to tag event {event_id}: {e}\n")
    
    print(f"Successfully tagged {len(events)} events!")

if __name__ == "__main__":
    main()