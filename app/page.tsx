"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download, GraduationCap, Loader2, Plus, RotateCcw, Sparkles, Trash2, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import type { Course, Day, Meeting, RankedSchedule, SolverPreferences, SolverResult } from "@/lib/scheduler";

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string; title: string; description: string; inputSchema: object;
        annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
        execute: (input: unknown) => unknown | Promise<unknown>;
      }, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_NAMES: Record<Day, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };

const COURSE_CATALOG: Course[] = [
  {
    code: "CS 211", title: "Data Structures", color: "#4f46e5",
    sections: [
      { id: "cs211-01", courseCode: "CS 211", section: "01", professor: "Dr. Maya Lin", credits: 4, workload: 3, meetings: [{ day: "Mon", start: "09:00", end: "10:15" }, { day: "Wed", start: "09:00", end: "10:15" }] },
      { id: "cs211-02", courseCode: "CS 211", section: "02", professor: "Prof. Jonah Reed", credits: 4, workload: 3, meetings: [{ day: "Tue", start: "10:30", end: "11:45" }, { day: "Thu", start: "10:30", end: "11:45" }] },
      { id: "cs211-03", courseCode: "CS 211", section: "03", professor: "Dr. Maya Lin", credits: 4, workload: 4, meetings: [{ day: "Mon", start: "15:00", end: "16:15" }, { day: "Wed", start: "15:00", end: "16:15" }] },
    ],
  },
  {
    code: "MATH 250", title: "Discrete Mathematics", color: "#0891b2",
    sections: [
      { id: "math250-01", courseCode: "MATH 250", section: "01", professor: "Dr. Priya Patel", credits: 3, workload: 3, meetings: [{ day: "Mon", start: "10:30", end: "11:45" }, { day: "Wed", start: "10:30", end: "11:45" }] },
      { id: "math250-02", courseCode: "MATH 250", section: "02", professor: "Prof. Elliot Stone", credits: 3, workload: 3, meetings: [{ day: "Tue", start: "09:00", end: "10:15" }, { day: "Thu", start: "09:00", end: "10:15" }] },
    ],
  },
  {
    code: "PHYS 203", title: "General Physics I", color: "#e11d48",
    sections: [
      { id: "phys203-01", courseCode: "PHYS 203", section: "01", professor: "Dr. Lena Ortiz", credits: 4, workload: 4, meetings: [{ day: "Mon", start: "13:00", end: "14:50" }, { day: "Wed", start: "13:00", end: "14:50" }] },
      { id: "phys203-02", courseCode: "PHYS 203", section: "02", professor: "Dr. Lena Ortiz", credits: 4, workload: 4, meetings: [{ day: "Tue", start: "13:00", end: "14:50" }, { day: "Thu", start: "13:00", end: "14:50" }] },
    ],
  },
  {
    code: "ITI 202", title: "Network & Internet Technology", color: "#ca8a04",
    sections: [
      { id: "iti202-01", courseCode: "ITI 202", section: "01", professor: "Prof. Tessa Green", credits: 3, workload: 2, meetings: [{ day: "Fri", start: "10:00", end: "12:40" }] },
      { id: "iti202-02", courseCode: "ITI 202", section: "02", professor: "Prof. Amir Shah", credits: 3, workload: 2, meetings: [{ day: "Tue", start: "15:00", end: "16:15" }, { day: "Thu", start: "15:00", end: "16:15" }] },
    ],
  },
];

const DEFAULT_PREFERENCES: SolverPreferences = {
  unavailable: [{ day: "Tue", start: "12:00", end: "13:00" }],
  preferredProfessors: ["Dr. Maya Lin", "Dr. Priya Patel"],
  maxWorkload: 12, maxDays: 5, earliestStart: "09:00",
};

const formatTime = (time: string) => {
  if (time === "—") return time;
  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};
const getCourse = (code: string) => COURSE_CATALOG.find((course) => course.code === code)!;

async function requestSchedules(selectedCodes: string[], preferences: SolverPreferences) {
  const response = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courses: COURSE_CATALOG, selectedCodes, preferences }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Could not generate schedules.");
  return payload as SolverResult;
}

function ScheduleGrid({ schedule }: { schedule: RankedSchedule }) {
  const hours = Array.from({ length: 11 }, (_, index) => index + 8);
  return (
    <div className="schedule-scroll" aria-label="Weekly schedule calendar">
      <div className="schedule-grid">
        <div className="day-label spacer" />
        {DAYS.map((day) => <div className="day-label" key={day}><span>{day}</span></div>)}
        <div className="time-column">{hours.slice(0, -1).map((hour) => <span key={hour}>{formatTime(`${String(hour).padStart(2, "0")}:00`).replace(":00", "")}</span>)}</div>
        {DAYS.map((day) => (
          <div className="day-column" key={day}>
            {hours.slice(0, -1).map((hour) => <span className="hour-line" key={hour} />)}
            {schedule.sections.flatMap((section) => section.meetings.filter((meeting) => meeting.day === day).map((meeting) => {
              const [startH, startM] = meeting.start.split(":").map(Number);
              const [endH, endM] = meeting.end.split(":").map(Number);
              const top = ((startH * 60 + startM - 480) / 60) * 48;
              const height = ((endH * 60 + endM - startH * 60 - startM) / 60) * 48;
              const color = getCourse(section.courseCode).color;
              return <div className="class-block" key={`${section.id}-${day}`} style={{ top, height: Math.max(height, 42), borderColor: color, backgroundColor: `${color}16` }}><strong>{section.courseCode}</strong><span>{formatTime(meeting.start)}–{formatTime(meeting.end)}</span><small>{section.professor}</small></div>;
            }))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleSummary({ schedule }: { schedule: RankedSchedule }) {
  return <div className="metric-row"><div><span>Match</span><strong>{schedule.score}%</strong></div><div><span>Credits</span><strong>{schedule.metrics.credits}</strong></div><div><span>Campus days</span><strong>{schedule.metrics.daysOnCampus}</strong></div><div><span>Earliest</span><strong>{formatTime(schedule.metrics.earliestStart)}</strong></div></div>;
}

export default function Home() {
  const [selectedCodes, setSelectedCodes] = useState(["CS 211", "MATH 250", "PHYS 203"]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [pendingBlock, setPendingBlock] = useState<Meeting>({ day: "Fri", start: "14:00", end: "16:00" });
  const [result, setResult] = useState<SolverResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saved, setSaved] = useState<RankedSchedule[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("coursecraft-saved");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    if (!selectedCodes.length) { setError("Choose at least one required course."); return null; }
    setLoading(true); setError("");
    try { const nextResult = await requestSchedules(selectedCodes, preferences); setResult(nextResult); setSelectedIndex(0); return nextResult; }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not generate schedules."); return null; }
    finally { setLoading(false); }
  }, [preferences, selectedCodes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void requestSchedules(["CS 211", "MATH 250", "PHYS 203"], DEFAULT_PREFERENCES)
        .then(setResult)
        .catch(() => setError("Could not load the example schedule."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "generate_course_schedules", title: "Generate course schedules",
      description: "Generate and rank valid schedules from the courses and constraints currently selected in CourseCraft.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (typeof input !== "object" || input === null || Object.keys(input).length > 0) {
          throw new Error("This action does not accept inputs; change constraints in the visible planner first.");
        }
        const generated = await generate();
        if (!generated) throw new Error("Schedule generation failed.");
        return { validSchedules: generated.totalValid, combinationsChecked: generated.combinationsChecked, topScore: generated.schedules[0]?.score ?? null };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [generate]);

  const activeSchedule = result?.schedules[selectedIndex];
  const professorOptions = useMemo(() => [...new Set(COURSE_CATALOG.flatMap((course) => course.sections.map((section) => section.professor)))], []);
  const toggleCourse = (code: string, checked: boolean) => setSelectedCodes((current) => checked ? [...current, code] : current.filter((item) => item !== code));
  const toggleProfessor = (professor: string, checked: boolean) => setPreferences((current) => ({ ...current, preferredProfessors: checked ? [...current.preferredProfessors, professor] : current.preferredProfessors.filter((item) => item !== professor) }));

  const addBlockedTime = () => {
    if (pendingBlock.start >= pendingBlock.end) { toast.error("End time must be after start time."); return; }
    setPreferences((current) => ({ ...current, unavailable: [...current.unavailable, pendingBlock] }));
    toast.success("Unavailable time added");
  };
  const saveSchedule = (schedule: RankedSchedule) => {
    if (saved.some((item) => item.id === schedule.id)) { toast("This schedule is already saved."); return; }
    const next = [...saved, schedule]; setSaved(next); window.localStorage.setItem("coursecraft-saved", JSON.stringify(next)); toast.success("Schedule saved to this device");
  };
  const removeSaved = (id: string) => { const next = saved.filter((item) => item.id !== id); setSaved(next); window.localStorage.setItem("coursecraft-saved", JSON.stringify(next)); };
  const exportCalendar = (schedule: RankedSchedule) => {
    const nextMonday = new Date(); const daysUntilMonday = ((8 - nextMonday.getDay()) % 7) || 7; nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    const events = schedule.sections.flatMap((section) => section.meetings.map((meeting) => {
      const date = new Date(nextMonday); date.setDate(nextMonday.getDate() + DAYS.indexOf(meeting.day));
      const stamp = (time: string) => { const [hours, minutes] = time.split(":").map(Number); const value = new Date(date); value.setHours(hours, minutes, 0, 0); return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
      return ["BEGIN:VEVENT", `UID:${section.id}-${meeting.day}@coursecraft`, `DTSTART:${stamp(meeting.start)}`, `DTEND:${stamp(meeting.end)}`, "RRULE:FREQ=WEEKLY;COUNT=15", `SUMMARY:${section.courseCode} ${section.section}`, `DESCRIPTION:${section.professor}`, "END:VEVENT"].join("\r\n");
    }));
    const calendar = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CourseCraft//Schedule//EN", ...events, "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "coursecraft-schedule.ics"; anchor.click(); URL.revokeObjectURL(url); toast.success("Calendar file downloaded");
  };

  return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#top" aria-label="CourseCraft home"><span className="brand-mark"><GraduationCap aria-hidden="true" /></span><span>Course<span>Craft</span></span></a><div className="term-pill"><span /> Fall 2026 planner</div><div className="header-note">Schedules save on this device</div></header>
      <div className="workspace" id="top">
        <aside className="controls-panel">
          <div className="panel-intro"><p className="eyebrow">Build your constraints</p><h1>Plan a semester that fits.</h1><p>Choose courses, protect your time, and set your workload. We’ll handle the combinations.</p></div>
          <section className="control-section">
            <div className="section-heading"><div><span className="step">01</span><h2>Required courses</h2></div><span className="count-badge">{selectedCodes.length} selected</span></div>
            <div className="course-list">{COURSE_CATALOG.map((course) => { const checked = selectedCodes.includes(course.code); return <label className={`course-choice ${checked ? "selected" : ""}`} key={course.code}><Checkbox checked={checked} onCheckedChange={(value) => toggleCourse(course.code, value === true)} /><span className="course-dot" style={{ background: course.color }} /><span><strong>{course.code}</strong><small>{course.title} · {course.sections.length} sections</small></span></label>; })}</div>
          </section>
          <section className="control-section">
            <div className="section-heading"><div><span className="step">02</span><h2>Unavailable times</h2></div></div>
            <div className="blocked-list">{preferences.unavailable.map((block, index) => <div className="blocked-chip" key={`${block.day}-${block.start}-${index}`}><Clock3 aria-hidden="true" /><span><strong>{DAY_NAMES[block.day]}</strong>{formatTime(block.start)}–{formatTime(block.end)}</span><button aria-label={`Remove ${DAY_NAMES[block.day]} unavailable time`} onClick={() => setPreferences((current) => ({ ...current, unavailable: current.unavailable.filter((_, itemIndex) => itemIndex !== index) }))}><X /></button></div>)}</div>
            <div className="time-entry"><NativeSelect aria-label="Day" value={pendingBlock.day} onChange={(event) => setPendingBlock({ ...pendingBlock, day: event.target.value as Day })}>{DAYS.map((day) => <NativeSelectOption key={day} value={day}>{day}</NativeSelectOption>)}</NativeSelect><input aria-label="Start time" type="time" value={pendingBlock.start} onChange={(event) => setPendingBlock({ ...pendingBlock, start: event.target.value })} /><span>to</span><input aria-label="End time" type="time" value={pendingBlock.end} onChange={(event) => setPendingBlock({ ...pendingBlock, end: event.target.value })} /><Button size="icon" variant="outline" aria-label="Add unavailable time" onClick={addBlockedTime}><Plus /></Button></div>
          </section>
          <section className="control-section">
            <div className="section-heading"><div><span className="step">03</span><h2>Preferred professors</h2></div></div>
            <div className="professor-grid">{professorOptions.map((professor) => <label key={professor}><Checkbox checked={preferences.preferredProfessors.includes(professor)} onCheckedChange={(value) => toggleProfessor(professor, value === true)} /><span>{professor}</span></label>)}</div>
          </section>
          <section className="control-section limits-section">
            <div className="section-heading"><div><span className="step">04</span><h2>Workload limits</h2></div></div>
            <label className="range-field"><span><strong>Weekly workload</strong><output>{preferences.maxWorkload} points</output></span><Slider min={5} max={18} step={1} value={[preferences.maxWorkload]} onValueChange={([value]) => setPreferences({ ...preferences, maxWorkload: value })} /></label>
            <div className="limit-pair"><label><span>Earliest class</span><input type="time" value={preferences.earliestStart} onChange={(event) => setPreferences({ ...preferences, earliestStart: event.target.value })} /></label><label><span>Max campus days</span><NativeSelect value={String(preferences.maxDays)} onChange={(event) => setPreferences({ ...preferences, maxDays: Number(event.target.value) })}>{[2, 3, 4, 5].map((day) => <NativeSelectOption key={day} value={day}>{day} days</NativeSelectOption>)}</NativeSelect></label></div>
          </section>
          {error && <div className="inline-error" role="alert"><TriangleAlert />{error}</div>}
          <Button className="generate-button" size="lg" onClick={() => void generate()} disabled={loading}>{loading ? <Loader2 className="spin" /> : <Sparkles />}{loading ? "Finding valid schedules…" : "Generate schedules"}</Button>
          <button className="reset-button" onClick={() => { setPreferences(DEFAULT_PREFERENCES); setSelectedCodes(["CS 211", "MATH 250", "PHYS 203"]); }}><RotateCcw /> Reset example</button>
        </aside>
        <section className="results-panel">
          <Tabs defaultValue="results" className="results-tabs">
            <div className="results-header"><TabsList variant="line" aria-label="Schedule views"><TabsTrigger value="results">Results <span>{result?.totalValid ?? 0}</span></TabsTrigger><TabsTrigger value="saved">Saved <span>{saved.length}</span></TabsTrigger><TabsTrigger value="rejected">Why rejected</TabsTrigger></TabsList>{activeSchedule && <div className="result-actions"><Button variant="outline" onClick={() => saveSchedule(activeSchedule)}><Bookmark /> Save</Button><Button variant="outline" onClick={() => exportCalendar(activeSchedule)}><Download /> Export .ics</Button></div>}</div>
            <TabsContent value="results" className="tab-body">
              {loading && !result ? <div className="empty-state"><Loader2 className="spin" /><h2>Exploring combinations</h2><p>Checking conflicts, workload, and your preferences.</p></div> : activeSchedule ? <>
                <div className="result-title-row"><div><p className="eyebrow">Ranked option {selectedIndex + 1} of {result?.schedules.length}</p><h2>{selectedIndex === 0 ? "Best overall fit" : `Schedule option ${selectedIndex + 1}`}</h2><p>{activeSchedule.highlights.join(" · ")}</p></div><div className="schedule-nav"><Button size="icon" variant="outline" aria-label="Previous schedule" disabled={selectedIndex === 0} onClick={() => setSelectedIndex((value) => value - 1)}><ChevronLeft /></Button><span>{selectedIndex + 1} / {result?.schedules.length}</span><Button size="icon" variant="outline" aria-label="Next schedule" disabled={selectedIndex >= (result?.schedules.length ?? 1) - 1} onClick={() => setSelectedIndex((value) => value + 1)}><ChevronRight /></Button></div></div>
                <ScheduleSummary schedule={activeSchedule} /><ScheduleGrid schedule={activeSchedule} /><div className="solver-note"><Sparkles /><span><strong>How this ranked:</strong> preferred professors carry the most weight, followed by fewer campus days and remaining workload capacity.</span></div>
              </> : <div className="empty-state"><CalendarDays /><h2>No valid schedules found</h2><p>Try removing an unavailable time or increasing a workload limit.</p></div>}
            </TabsContent>
            <TabsContent value="saved" className="tab-body"><div className="saved-heading"><div><p className="eyebrow">Your short list</p><h2>Saved schedules</h2></div><p>Saved only in this browser.</p></div>{saved.length ? <div className="saved-grid">{saved.map((schedule, index) => <article className="saved-card" key={schedule.id}><div><span className="saved-number">{String(index + 1).padStart(2, "0")}</span><span className="score-chip">{schedule.score}% match</span></div><h3>{schedule.sections.map((section) => section.courseCode).join(" · ")}</h3><p>{schedule.metrics.credits} credits · {schedule.metrics.daysOnCampus} campus days · {schedule.metrics.weeklyWorkload} workload points</p><div className="saved-actions"><Button variant="outline" onClick={() => exportCalendar(schedule)}><Download /> Export</Button><Button variant="ghost" aria-label="Delete saved schedule" onClick={() => removeSaved(schedule.id)}><Trash2 /></Button></div></article>)}</div> : <div className="empty-state"><Bookmark /><h2>No saved schedules yet</h2><p>Save a ranked result to compare it here later.</p></div>}</TabsContent>
            <TabsContent value="rejected" className="tab-body"><div className="saved-heading"><div><p className="eyebrow">Constraint audit</p><h2>Why combinations were rejected</h2></div><p>{result?.combinationsChecked ?? 0} complete combinations checked</p></div><div className="rejection-list">{result?.rejections.length ? result.rejections.map((reason) => <article key={reason.id}><span className="reject-icon"><X /></span><div><h3>{reason.title}</h3><p>{reason.detail}</p></div><strong>{reason.count}</strong></article>) : <div className="success-state"><Check /><div><h3>No rejected paths</h3><p>Every checked combination met your current constraints.</p></div></div>}</div><div className="explanation-card"><h3>How the solver works</h3><p>A backtracking search picks one section per required course. It abandons a path as soon as it finds a time conflict, unavailable period, early start, excessive workload, or too many campus days. Valid combinations are then scored against your professor and schedule preferences.</p></div></TabsContent>
          </Tabs>
        </section>
      </div>
      <Toaster richColors position="bottom-right" />
    </main>
  );
}
