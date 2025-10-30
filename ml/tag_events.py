import pandas as pd

# loading dataset (**change the csv name**)
df = pd.read_csv("events_cleaned.csv")

# various category dict
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
        "drought", "flood", "natural disaster", "environmental regulation"
    ],
    "Education": [
        "education", "educational", "school", "schooling", "schools", "pupils", "learners", 
        "educator", "student", "students", "learning", "workshop", "seminar", "lecture", 
        "civic education", "curriculum", "teacher", "class", "professor", "classroom", 
        "college", "university", "higher education", "tuition", "financial aid", 
        "scholarships", "loans", "public schools", "private schools", "charter schools", 
        "literacy", "tutoring", "stem", "early childhood", "preschool", "academic achievement", 
        "test scores", "graduation", "graduation rates", "education policy", 
        "board of education", "school district", "campus", "student loans"
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
        "urban planning", "smart cities"
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
        "rich", "poor", "ultra-wealthy", "unemployment", "employment", "job market"
    ],
    "Social Justice": [
        "social justice", "justice", "equality", "equity", "inclusion", "human rights", 
        "civil rights", "discrimination", "racism", "sexism", "bias", "gender", 
        "gender equality", "women’s rights", "womens rights", "lgbtq+", "lgbtq", 
        "immigration", "immigrant", "refugee", "asylum", "voting rights", "voter suppression", 
        "democracy", "incarceration", "prison reform", "criminal justice reform", "hate crimes", 
        "hate", "systematic oppression", "marginalization", "community organizing", 
        "grassroots", "diversity", "belonging", "anti-racism", "freedom of speech", 
        "freedom of religion"
    ]
}

# working on toning synonyms

# tagging functions
def tag_categories(description):
    description = str(description).lower()
    matched = []
    for cat, keywords in category_keywords.items():
        for kw in keywords:
            if kw in description:
                matched.append(cat)
                break
    return ", ".join(sorted(set(matched))) if matched else "Economy"  # default 

# tagging functions for categories 
df['categories'] = df['description'].apply(tag_categories)

df.to_csv("events_tagged.csv", index=False)
print("✅Done :ppp'")
