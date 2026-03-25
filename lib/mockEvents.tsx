import { Tag } from "@/lib/types";

export interface MockEvent {
  id: string;
  title: string;
  location: string;
  event_date: string;
  description: string;
  image_url?: string;
  tone: string; // comma-separated like backend
  tags: Tag[];
}

export const mockEvents: MockEvent[] = [
  {
    id: "1",
    title: "Community Cleanup Day",
    location: "Riverfront Park",
    event_date: "2026-02-10 10:00:00",
    description:
      "Join your neighbors for a hands-on community cleanup to protect local waterways and public spaces.",
    tone: "Community,Environment",
    tags: [
      { id: "t1", label: "Action-Oriented", type: "Tone" },
      { id: "t2", label: "Environment", type: "Topic" },
    ],
  },
  {
    id: "2",
    title: "City Council Public Forum",
    location: "Downtown City Hall",
    event_date: "2026-02-12 18:30:00",
    description:
      "Meet city officials and discuss upcoming legislation and community priorities.",
    tone: "Official,Informational",
    tags: [
      { id: "t3", label: "Procedural", type: "Tone" },
      { id: "t4", label: "Civic", type: "Topic" },
    ],
  },
  {
    id: "3",
    title: "Youth Voter Registration Drive",
    location: "Lincoln High School",
    event_date: "2026-02-15 14:00:00",
    description:
      "Help register new voters and educate students on the importance of civic participation.",
    tone: "Educational,Empowering",
    tags: [
      { id: "t5", label: "Informational", type: "Tone" },
      { id: "t6", label: "Youth", type: "Topic" },
    ],
  },
  {
    id: "4",
    title: "Affordable Housing Town Hall",
    location: "Westside Community Center",
    event_date: "2026-02-18 19:00:00",
    description:
      "A public discussion on affordable housing initiatives and zoning reform.",
    tone: "Official,Community",
    tags: [
      { id: "t7", label: "Housing", type: "Topic" },
      { id: "t8", label: "Contentious", type: "Tone" },
    ],
  },
  {
    id: "5",
    title: "Climate Action Workshop",
    location: "Green Earth Hub",
    event_date: "2026-02-20 16:00:00",
    description:
      "Learn how to reduce your carbon footprint and advocate for climate-forward policy.",
    tone: "Educational,Activist",
    tags: [
      { id: "t9", label: "Environment", type: "Topic" },
      { id: "t10", label: "Action-Oriented", type: "Tone" },
    ],
  },
  {
    id: "6",
    title: "Local Election Candidate Meet & Greet",
    location: "Civic Plaza",
    event_date: "2026-02-22 17:30:00",
    description:
      "Meet candidates running for local office and ask questions about their platforms.",
    tone: "Official,Neutral",
    tags: [
      { id: "t11", label: "Celebratory", type: "Tone" },
      { id: "t12", label: "Civic", type: "Topic" },
    ],
  },
  {
    id: "7",
    title: "School Board Policy Discussion",
    location: "Education Center Auditorium",
    event_date: "2026-02-25 18:00:00",
    description:
      "Discuss upcoming school policies, budgets, and curriculum changes.",
    tone: "Educational,Official",
    tags: [
      { id: "t13", label: "Education", type: "Topic" },
      { id: "t14", label: "Procedural", type: "Tone" },
    ],
  },
  {
    id: "8",
    title: "Community Mental Health Awareness Night",
    location: "Hope Wellness Center",
    event_date: "2026-02-27 19:30:00",
    description:
      "An open forum on mental health resources, stigma reduction, and community support.",
    tone: "Supportive,Community",
    tags: [
      { id: "t15", label: "Health", type: "Topic" },
      { id: "t16", label: "Contentious", type: "Tone" },
    ],
  },
  {
    id: "9",
    title: "Public Transportation Planning Session",
    location: "Transit Authority HQ",
    event_date: "2026-03-01 15:00:00",
    description:
      "Provide input on future transit routes, accessibility, and sustainability plans.",
    tone: "Official,Informational",
    tags: [
      { id: "t17", label: "Transportation", type: "Topic" },
      { id: "t18", label: "Procedural", type: "Tone" },
    ],
  },
  {
    id: "10",
    title: "Civic Tech Hackathon",
    location: "Innovation Lab",
    event_date: "2026-03-05 09:00:00",
    description:
      "Collaborate with developers, designers, and activists to build tools for civic engagement.",
    tone: "Innovative,Empowering",
    tags: [
      { id: "t19", label: "Technology", type: "Topic" },
      { id: "t20", label: "Action-Oriented", type: "Tone" },
    ],
  },
];
