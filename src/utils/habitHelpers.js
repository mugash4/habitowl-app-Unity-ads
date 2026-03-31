export const DAY_OPTIONS = [
  { value: 0, short: "Sun", label: "Sunday" },
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
];

export const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Daily", description: "Every day" },
  { value: "weekdays", label: "Weekdays", description: "Mon to Fri" },
  { value: "weekends", label: "Weekends", description: "Sat and Sun" },
  { value: "custom", label: "Custom days", description: "Choose exact days" },
  {
    value: "timesPerWeek",
    label: "Times / week",
    description: "Set a weekly target",
  },
];

const DEFAULT_SELECTED_DAYS = [1, 2, 3, 4, 5];

export const getTodayDateKey = (date = new Date()) => date.toDateString();

export const getDateKey = (date = new Date()) => new Date(date).toDateString();

export const startOfDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const normalizeHabitSchedule = (habit = {}) => {
  const scheduleType = habit.scheduleType || "daily";
  const selectedDays = Array.isArray(habit.selectedDays)
    ? habit.selectedDays
        .map(Number)
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b)
    : scheduleType === "custom"
      ? DEFAULT_SELECTED_DAYS
      : [];

  return {
    ...habit,
    scheduleType,
    selectedDays,
    weeklyTarget:
      Number(habit.weeklyTarget) > 0 ? Number(habit.weeklyTarget) : 3,
    cue: habit.cue || "",
    location: habit.location || "",
    reward: habit.reward || "",
    templateId: habit.templateId || null,
    isPremiumTemplate: !!habit.isPremiumTemplate,
  };
};

export const getScheduledDays = (habit = {}) => {
  const normalized = normalizeHabitSchedule(habit);

  switch (normalized.scheduleType) {
    case "weekdays":
      return [1, 2, 3, 4, 5];
    case "weekends":
      return [0, 6];
    case "custom":
      return normalized.selectedDays.length
        ? normalized.selectedDays
        : DEFAULT_SELECTED_DAYS;
    case "timesPerWeek":
      if (normalized.selectedDays.length) {
        return normalized.selectedDays;
      }
      if (normalized.weeklyTarget <= 2) return [1, 4];
      if (normalized.weeklyTarget === 3) return [1, 3, 5];
      if (normalized.weeklyTarget === 4) return [1, 2, 4, 6];
      if (normalized.weeklyTarget >= 5) return [1, 2, 3, 4, 5];
      return [1, 3, 5];
    case "daily":
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
};

export const isHabitDueOnDate = (habit = {}, date = new Date()) => {
  const normalized = normalizeHabitSchedule(habit);
  const targetDate = new Date(date);
  const jsDay = targetDate.getDay();

  if (normalized.scheduleType === "timesPerWeek") {
    return getScheduledDays(normalized).includes(jsDay);
  }

  return getScheduledDays(normalized).includes(jsDay);
};

export const getHabitScheduleLabel = (habit = {}) => {
  const normalized = normalizeHabitSchedule(habit);

  switch (normalized.scheduleType) {
    case "weekdays":
      return "Weekdays";
    case "weekends":
      return "Weekends";
    case "custom":
      return normalized.selectedDays.length
        ? normalized.selectedDays
            .map(
              (day) =>
                DAY_OPTIONS.find((item) => item.value === day)?.short || "",
            )
            .join(", ")
        : "Custom days";
    case "timesPerWeek":
      return `${normalized.weeklyTarget}× / week`;
    case "daily":
    default:
      return "Daily";
  }
};

export const getImplementationPlanText = (habit = {}) => {
  const normalized = normalizeHabitSchedule(habit);
  const parts = [];

  if (normalized.cue) parts.push(`When ${normalized.cue}`);
  if (normalized.location) parts.push(`at ${normalized.location}`);
  if (normalized.reward) parts.push(`reward: ${normalized.reward}`);

  return parts.join(" • ");
};

export const getDueStatus = (habit = {}, date = new Date()) => {
  const dueToday = isHabitDueOnDate(habit, date);
  const label = dueToday ? "Due today" : "Not due today";
  return { dueToday, label };
};

export const getWeekDateKeys = (endDate = new Date()) => {
  const finalDate = startOfDay(endDate);
  const keys = [];
  for (let i = 6; i >= 0; i -= 1) {
    keys.push(getDateKey(addDays(finalDate, -i)));
  }
  return keys;
};

export const getCompletionsInRange = (
  habit = {},
  days = 7,
  endDate = new Date(),
) => {
  const completions = Array.isArray(habit.completions) ? habit.completions : [];
  const start = startOfDay(addDays(endDate, -(days - 1)));
  const end = startOfDay(endDate);

  return completions.filter((dateKey) => {
    const value = startOfDay(new Date(dateKey));
    return value >= start && value <= end;
  });
};

export const getCompletedCountForCurrentWeek = (
  habit = {},
  endDate = new Date(),
) => {
  return getCompletionsInRange(habit, 7, endDate).length;
};

export const getWeeklyTarget = (habit = {}) => {
  const normalized = normalizeHabitSchedule(habit);
  if (normalized.scheduleType === "timesPerWeek") {
    return normalized.weeklyTarget || 3;
  }
  return Math.min(getScheduledDays(normalized).length, 7);
};

export const getWeeklyCompletionPercent = (
  habit = {},
  endDate = new Date(),
) => {
  const target = getWeeklyTarget(habit);
  if (!target) return 0;
  const completed = getCompletedCountForCurrentWeek(habit, endDate);
  return Math.min(100, Math.round((completed / target) * 100));
};

export const getNextDueDate = (habit = {}, fromDate = new Date()) => {
  const start = startOfDay(fromDate);
  for (let i = 0; i < 14; i += 1) {
    const candidate = addDays(start, i);
    if (isHabitDueOnDate(habit, candidate)) {
      return candidate;
    }
  }
  return null;
};

export const getNextDueLabel = (habit = {}, fromDate = new Date()) => {
  const nextDue = getNextDueDate(habit, fromDate);
  if (!nextDue) return "No schedule set";
  const todayKey = getDateKey(fromDate);
  const nextKey = getDateKey(nextDue);
  if (todayKey === nextKey) return "Due today";

  const tomorrow = addDays(startOfDay(fromDate), 1);
  if (getDateKey(tomorrow) === nextKey) return "Due tomorrow";

  return `Next: ${nextDue.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
};

export const sortHabitsForDashboard = (habits = []) => {
  return [...habits].sort((a, b) => {
    const aDue = isHabitDueOnDate(a) ? 0 : 1;
    const bDue = isHabitDueOnDate(b) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    return (b.currentStreak || 0) - (a.currentStreak || 0);
  });
};

export const calculateHabitStreak = (habit = {}) => {
  const normalized = normalizeHabitSchedule(habit);
  const completionSet = new Set(
    Array.isArray(normalized.completions) ? normalized.completions : [],
  );
  let streak = 0;
  const today = startOfDay(new Date());

  for (let i = 0; i < 365; i += 1) {
    const candidate = addDays(today, -i);
    if (!isHabitDueOnDate(normalized, candidate)) {
      continue;
    }

    const key = getDateKey(candidate);
    if (completionSet.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

export const getLastNDaysSeries = (habits = [], days = 7) => {
  const labels = [];
  const values = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(new Date(), -i);
    const key = getDateKey(date);
    labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));
    values.push(
      habits.reduce(
        (count, habit) =>
          count + ((habit.completions || []).includes(key) ? 1 : 0),
        0,
      ),
    );
  }

  return { labels, values };
};

export const getCategoryBreakdown = (habits = []) => {
  return habits.reduce((accumulator, habit) => {
    const key = habit.category || "other";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
};

export const getHeatmapData = (habits = [], days = 56) => {
  const result = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(new Date(), -i);
    const key = getDateKey(date);
    const count = habits.reduce(
      (sum, habit) => sum + ((habit.completions || []).includes(key) ? 1 : 0),
      0,
    );
    result.push({
      key,
      date,
      count,
      intensity: Math.min(4, count),
      weekday: date.getDay(),
    });
  }
  return result;
};

export const getBestCompletionDay = (habits = []) => {
  const score = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  habits.forEach((habit) => {
    (habit.completions || []).forEach((dateKey) => {
      const day = new Date(dateKey).getDay();
      score[day] += 1;
    });
  });

  const bestDay = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  if (!bestDay) return "No data yet";
  const label =
    DAY_OPTIONS.find((item) => item.value === Number(bestDay[0]))?.label ||
    "No data yet";
  return label;
};

export const getTodayProgress = (habits = []) => {
  const dueToday = habits.filter((habit) => isHabitDueOnDate(habit));
  const completedToday = dueToday.filter((habit) =>
    (habit.completions || []).includes(getTodayDateKey()),
  );
  const percent = dueToday.length
    ? Math.round((completedToday.length / dueToday.length) * 100)
    : 0;
  return {
    dueToday: dueToday.length,
    completedToday: completedToday.length,
    percent,
  };
};

export const getSuccessMessageForStreak = (streak = 0) => {
  if (streak >= 100) return "Habit master unlocked";
  if (streak >= 30) return "Your routine is sticking";
  if (streak >= 14) return "Momentum is real";
  if (streak >= 7) return "One strong week";
  if (streak >= 3) return "Consistency is forming";
  return "Nice work today";
};
