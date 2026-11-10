export const industries = [
  {
    slug: "tech",
    name: "Tech & Software",
    icon: "⌘",
    professions: [
      "Software Developer",
      "Frontend Developer",
      "Backend Developer",
      "QA Engineer",
      "Data Analyst",
      "Other Tech Role",
    ],
  },
  {
    slug: "design",
    name: "Design & Creative",
    icon: "✳",
    professions: [
      "Product Designer",
      "Graphic Designer",
      "Illustrator",
      "Writer",
      "Other Creative Role",
    ],
  },
  {
    slug: "business",
    name: "Business & Finance",
    icon: "↗",
    professions: [
      "Accountant",
      "Financial Analyst",
      "Operations",
      "Other Business Role",
    ],
  },
  {
    slug: "marketing",
    name: "Marketing & Sales",
    icon: "◎",
    professions: [
      "Marketer",
      "Sales Representative",
      "Content Strategist",
      "Other Marketing Role",
    ],
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    icon: "♡",
    professions: [
      "Nurse",
      "Clinician",
      "Administrator",
      "Other Healthcare Role",
    ],
  },
  {
    slug: "education",
    name: "Education",
    icon: "▤",
    professions: ["Teacher", "Researcher", "Tutor", "Other Education Role"],
  },
  {
    slug: "engineering",
    name: "Engineering",
    icon: "⚙",
    professions: [
      "Civil Engineer",
      "Mechanical Engineer",
      "Electrical Engineer",
      "Other Engineering Role",
    ],
  },
  {
    slug: "other",
    name: "Other Careers",
    icon: "✦",
    professions: ["Exploring options", "Other"],
  },
] as const;
export const eras = [
  "Fresh graduate",
  "Recently laid off",
  "Searching for months",
  "Changing careers",
  "Taking a career break",
  "Prefer not to say",
] as const;
export const categories = [
  "Harassment",
  "Hate or abuse",
  "Spam",
  "Scam",
  "Threats",
  "Other",
] as const;
export const prompts = [
  "What's the weirdest interview question you've ever been asked?",
  "Anything go well today?",
  "What job requirement made you close the browser?",
  "What have you been doing away from the job search?",
  "What's your most creative answer to ‘so, what do you do?’",
  "What helps you take a break from applications?",
  "What have you learned outside a job this week?",
];
export function dailyPrompt(date = new Date()) {
  return prompts[Math.floor(date.getTime() / 86400000) % prompts.length];
}
export function nickname() {
  const words = [
    "LateCoffee",
    "OpenTabs",
    "QuietPenguin",
    "LunchBreak",
    "WindowSeat",
  ];
  return `${words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length]}_${crypto.getRandomValues(new Uint32Array(1))[0] % 100000}`;
}
export const AI_ENABLED = false;
