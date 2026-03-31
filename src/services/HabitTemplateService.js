const HABIT_TEMPLATES = [
  {
    id: "morning_reset",
    title: "Morning Reset",
    description: "Water, stretch, and plan your top 1 priority.",
    category: "wellness",
    difficulty: 2,
    estimatedTime: "10 min",
    scheduleType: "daily",
    cue: "you get out of bed",
    location: "your bedroom",
    reward: "a calm and focused start",
    premiumOnly: false,
  },
  {
    id: "focus_sprint",
    title: "Focus Sprint",
    description: "25 minutes of deep work with notifications off.",
    category: "productivity",
    difficulty: 3,
    estimatedTime: "30 min",
    scheduleType: "weekdays",
    cue: "you open your laptop",
    location: "your work desk",
    reward: "mark one meaningful win",
    premiumOnly: false,
  },
  {
    id: "walk_after_lunch",
    title: "Walk After Lunch",
    description: "A short walk to reset energy and improve digestion.",
    category: "health",
    difficulty: 1,
    estimatedTime: "15 min",
    scheduleType: "weekdays",
    cue: "you finish lunch",
    location: "outside or corridor",
    reward: "fresh air and better focus",
    premiumOnly: false,
  },
  {
    id: "strength_3x",
    title: "Strength 3× Week",
    description: "A realistic full-body strength habit with recovery days.",
    category: "fitness",
    difficulty: 4,
    estimatedTime: "45 min",
    scheduleType: "timesPerWeek",
    weeklyTarget: 3,
    selectedDays: [1, 3, 5],
    cue: "your workday ends",
    location: "gym or living room",
    reward: "tick off a strong session",
    premiumOnly: true,
  },
  {
    id: "language_loop",
    title: "Language Loop",
    description: "Micro-practice a language 5 times per week.",
    category: "learning",
    difficulty: 2,
    estimatedTime: "15 min",
    scheduleType: "timesPerWeek",
    weeklyTarget: 5,
    selectedDays: [1, 2, 3, 4, 5],
    cue: "you sit down for breakfast",
    location: "kitchen table",
    reward: "keep a visible streak",
    premiumOnly: true,
  },
  {
    id: "money_checkin",
    title: "Money Check-in",
    description: "Review spending and move money toward a savings goal.",
    category: "finance",
    difficulty: 3,
    estimatedTime: "15 min",
    scheduleType: "custom",
    selectedDays: [0, 3],
    cue: "you open your banking app",
    location: "somewhere quiet",
    reward: "peace of mind",
    premiumOnly: true,
  },
];

class HabitTemplateService {
  getTemplates() {
    return HABIT_TEMPLATES;
  }

  getTemplateById(templateId) {
    return (
      HABIT_TEMPLATES.find((template) => template.id === templateId) || null
    );
  }
}

export default new HabitTemplateService();
