export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export type Meeting = {
  day: Day;
  start: string;
  end: string;
};

export type Section = {
  id: string;
  courseCode: string;
  section: string;
  professor: string;
  credits: number;
  workload: number;
  meetings: Meeting[];
};

export type Course = {
  code: string;
  title: string;
  color: string;
  sections: Section[];
};

export type SolverPreferences = {
  unavailable: Meeting[];
  preferredProfessors: string[];
  maxWorkload: number;
  maxDays: number;
  earliestStart: string;
};

export type RankedSchedule = {
  id: string;
  sections: Section[];
  score: number;
  metrics: {
    daysOnCampus: number;
    weeklyWorkload: number;
    credits: number;
    preferenceMatches: number;
    earliestStart: string;
  };
  highlights: string[];
};

export type RejectionReason = {
  id: string;
  title: string;
  detail: string;
  count: number;
};

export type SolverResult = {
  schedules: RankedSchedule[];
  totalValid: number;
  combinationsChecked: number;
  rejections: RejectionReason[];
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const overlaps = (a: Meeting, b: Meeting) =>
  a.day === b.day &&
  toMinutes(a.start) < toMinutes(b.end) &&
  toMinutes(b.start) < toMinutes(a.end);

const dayCount = (sections: Section[]) =>
  new Set(sections.flatMap((section) => section.meetings.map((meeting) => meeting.day))).size;

const getEarliestStart = (sections: Section[]) => {
  const starts = sections.flatMap((section) => section.meetings.map((meeting) => meeting.start));
  return starts.sort()[0] ?? "—";
};

export function solveSchedules(
  courses: Course[],
  selectedCodes: string[],
  preferences: SolverPreferences,
  limit = 20,
): SolverResult {
  const selected = selectedCodes
    .map((code) => courses.find((course) => course.code === code))
    .filter((course): course is Course => Boolean(course));

  if (!selected.length) {
    return { schedules: [], totalValid: 0, combinationsChecked: 0, rejections: [] };
  }

  const rejectionCounts = new Map<string, number>();
  const valid: Section[][] = [];
  let combinationsChecked = 0;

  const reject = (key: string) => rejectionCounts.set(key, (rejectionCounts.get(key) ?? 0) + 1);

  const backtrack = (courseIndex: number, chosen: Section[]) => {
    if (courseIndex === selected.length) {
      combinationsChecked += 1;
      const workload = chosen.reduce((sum, section) => sum + section.workload, 0);
      if (workload > preferences.maxWorkload) {
        reject("workload");
        return;
      }
      if (dayCount(chosen) > preferences.maxDays) {
        reject("days");
        return;
      }
      valid.push([...chosen]);
      return;
    }

    for (const section of selected[courseIndex].sections) {
      const unavailableConflict = section.meetings.some((meeting) =>
        preferences.unavailable.some((blocked) => overlaps(meeting, blocked)),
      );
      if (unavailableConflict) {
        reject("unavailable");
        continue;
      }

      const tooEarly = section.meetings.some(
        (meeting) => toMinutes(meeting.start) < toMinutes(preferences.earliestStart),
      );
      if (tooEarly) {
        reject("early");
        continue;
      }

      const courseConflict = section.meetings.some((meeting) =>
        chosen.some((picked) => picked.meetings.some((other) => overlaps(meeting, other))),
      );
      if (courseConflict) {
        reject("collision");
        continue;
      }

      chosen.push(section);
      backtrack(courseIndex + 1, chosen);
      chosen.pop();
    }
  };

  backtrack(0, []);

  const ranked = valid
    .map((sections, index): RankedSchedule => {
      const daysOnCampus = dayCount(sections);
      const weeklyWorkload = sections.reduce((sum, section) => sum + section.workload, 0);
      const credits = sections.reduce((sum, section) => sum + section.credits, 0);
      const preferenceMatches = sections.filter((section) =>
        preferences.preferredProfessors.includes(section.professor),
      ).length;
      const earliestStart = getEarliestStart(sections);
      const score = Math.max(
        0,
        Math.min(
          100,
          68 + preferenceMatches * 10 + (5 - daysOnCampus) * 4 + (preferences.maxWorkload - weeklyWorkload) * 2,
        ),
      );
      const highlights = [
        preferenceMatches
          ? `${preferenceMatches} preferred professor${preferenceMatches === 1 ? "" : "s"}`
          : "No professor preference matches",
        `${daysOnCampus} day${daysOnCampus === 1 ? "" : "s"} on campus`,
        `${weeklyWorkload}/${preferences.maxWorkload} workload points`,
      ];

      return {
        id: `schedule-${index + 1}-${sections.map((section) => section.id).join("-")}`,
        sections,
        score,
        metrics: { daysOnCampus, weeklyWorkload, credits, preferenceMatches, earliestStart },
        highlights,
      };
    })
    .sort((a, b) => b.score - a.score || a.metrics.daysOnCampus - b.metrics.daysOnCampus);

  const reasonCopy: Record<string, Omit<RejectionReason, "id" | "count">> = {
    collision: {
      title: "Overlapping class times",
      detail: "Two required sections meet at the same time, so they cannot appear together.",
    },
    unavailable: {
      title: "Blocked by unavailable time",
      detail: "At least one section overlaps a time you marked as unavailable.",
    },
    early: {
      title: "Starts earlier than allowed",
      detail: `At least one section begins before ${preferences.earliestStart}.`,
    },
    workload: {
      title: "Above workload limit",
      detail: `The combined workload is higher than ${preferences.maxWorkload} points.`,
    },
    days: {
      title: "Too many campus days",
      detail: `The combination requires classes on more than ${preferences.maxDays} days.`,
    },
  };

  const rejections = [...rejectionCounts.entries()]
    .map(([id, count]) => ({ id, count, ...reasonCopy[id] }))
    .sort((a, b) => b.count - a.count);

  return {
    schedules: ranked.slice(0, limit),
    totalValid: ranked.length,
    combinationsChecked,
    rejections,
  };
}
