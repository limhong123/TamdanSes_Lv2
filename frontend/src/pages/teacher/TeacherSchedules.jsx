import {
  CalendarDays,
  ChevronDown,
  Clock3,
  GraduationCap,
  LoaderCircle,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/axios";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TeacherSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSchedules = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/schedules/teacher/me");

      setSchedules(
        Array.isArray(response.data)
          ? response.data
          : [],
      );
    } catch (err) {
      console.error(
        "LOAD TEACHER SCHEDULE ERROR:",
        err?.response?.data || err,
      );

      setSchedules([]);

      const detail = err?.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Failed to load your teaching schedule.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const classOptions = useMemo(() => {
    const classMap = new Map();

    schedules.forEach((schedule) => {
      const classId =
        schedule.class_id ??
        schedule.class_name;

      if (!classId) return;

      classMap.set(String(classId), {
        id: String(classId),
        name:
          schedule.class_name ||
          `Class ${schedule.class_id}`,
      });
    });

    return Array.from(classMap.values()).sort(
      (a, b) =>
        a.name.localeCompare(b.name),
    );
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    if (selectedClass === "all") {
      return schedules;
    }

    return schedules.filter((schedule) => {
      const scheduleClassId = String(
        schedule.class_id ??
          schedule.class_name ??
          "",
      );

      return scheduleClassId === selectedClass;
    });
  }, [schedules, selectedClass]);

  const times = useMemo(() => {
    const uniqueTimes = new Set();

    filteredSchedules.forEach((schedule) => {
      if (
        !schedule.start_time ||
        !schedule.end_time
      ) {
        return;
      }

      uniqueTimes.add(
        `${schedule.start_time} - ${schedule.end_time}`,
      );
    });

    return Array.from(uniqueTimes).sort(
      (first, second) => {
        const firstStart =
          first.split(" - ")[0];

        const secondStart =
          second.split(" - ")[0];

        return firstStart.localeCompare(
          secondStart,
        );
      },
    );
  }, [filteredSchedules]);

  const getItems = (day, time) => {
    return filteredSchedules.filter(
      (schedule) =>
        normalizeText(schedule.day) ===
          normalizeText(day) &&
        `${schedule.start_time} - ${schedule.end_time}` ===
          time,
    );
  };

  const selectedClassName =
    selectedClass === "all"
      ? "All Classes"
      : classOptions.find(
          (item) =>
            item.id === selectedClass,
        )?.name || "Selected Class";

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <LoaderCircle
              size={30}
              className="animate-spin"
            />
          </div>

          <div className="text-center">
            <p className="font-bold text-slate-800">
              Loading schedule
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Please wait a moment
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-6 py-6 text-white md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur">
                <CalendarDays size={27} />
              </div>

              <div>
                <p className="text-sm font-medium text-blue-100">
                  Teacher Portal
                </p>

                <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">
                  My Teaching Schedule
                </h1>

                <p className="mt-1 text-sm text-blue-100">
                  View and filter your weekly classes
                  from Monday to Saturday.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                loadSchedules(true)
              }
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100 bg-white md:grid-cols-4">
          <SummaryBox
            title="Total Schedules"
            value={schedules.length}
          />

          <SummaryBox
            title="Classes"
            value={classOptions.length}
          />

          <SummaryBox
            title="Displayed"
            value={filteredSchedules.length}
          />

          <SummaryBox
            title="Time Periods"
            value={times.length}
          />
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          <XCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Weekly Timetable
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Currently showing:{" "}
              <span className="font-bold text-blue-600">
                {selectedClassName}
              </span>
            </p>
          </div>

          <div className="w-full lg:w-72">
            <label
              htmlFor="class-filter"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Filter by class
            </label>

            <div className="relative">
              <GraduationCap
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                id="class-filter"
                value={selectedClass}
                onChange={(event) =>
                  setSelectedClass(
                    event.target.value,
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">
                  All Classes
                </option>

                {classOptions.map(
                  (classItem) => (
                    <option
                      key={classItem.id}
                      value={classItem.id}
                    >
                      {classItem.name}
                    </option>
                  ),
                )}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-extrabold text-slate-900">
              Monday – Saturday
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredSchedules.length} assigned
              schedule(s)
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            <Clock3 size={16} />

            {times.length} time period(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="sticky left-0 z-20 w-44 border-b border-r border-slate-200 bg-slate-100 px-4 py-4 text-left font-extrabold">
                  Time
                </th>

                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="min-w-[165px] border-b border-r border-slate-200 px-4 py-4 text-center font-extrabold last:border-r-0"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {times.map((time, rowIndex) => (
                <tr
                  key={time}
                  className={
                    rowIndex % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50/50"
                  }
                >
                  <td className="sticky left-0 z-10 border-r border-t border-slate-200 bg-inherit px-4 py-4 align-top">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <Clock3
                        size={16}
                        className="text-blue-500"
                      />

                      {formatTimeRange(time)}
                    </div>
                  </td>

                  {DAYS.map((day) => {
                    const items = getItems(
                      day,
                      time,
                    );

                    return (
                      <td
                        key={`${day}-${time}`}
                        className="border-r border-t border-slate-200 p-3 align-top last:border-r-0"
                      >
                        {items.length > 0 ? (
                          <div className="space-y-2">
                            {items.map(
                              (
                                item,
                                itemIndex,
                              ) => (
                                <ScheduleCard
                                  key={
                                    item.id ||
                                    `${day}-${time}-${itemIndex}`
                                  }
                                  item={item}
                                  showClass={
                                    selectedClass ===
                                    "all"
                                  }
                                />
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="flex min-h-[110px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xl text-slate-300">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {times.length === 0 && (
                <tr>
                  <td
                    colSpan={DAYS.length + 1}
                    className="px-6 py-14 text-center"
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <CalendarDays
                        size={30}
                      />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-700">
                      No schedule found
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      There is no schedule for the
                      selected class.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryBox({ title, value }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-2xl font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ScheduleCard({
  item,
  showClass,
}) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <BookIcon />
        </div>

        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">
          Class
        </span>
      </div>

      <h3 className="mt-3 font-extrabold text-blue-800">
        {item.subject_name ||
          `Subject ${item.subject_id || ""}`}
      </h3>

      {showClass && (
        <p className="mt-1 text-sm font-semibold text-slate-700">
          {item.class_name ||
            `Class ${item.class_id || "-"}`}
        </p>
      )}

      {item.room_name && (
        <p className="mt-2 text-xs text-slate-500">
          Room: {item.room_name}
        </p>
      )}
    </div>
  );
}

function BookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatTimeRange(value) {
  const [startTime, endTime] =
    String(value).split(" - ");

  return `${formatTime(
    startTime,
  )} - ${formatTime(endTime)}`;
}

function formatTime(value) {
  if (!value) return "-";

  const parts = String(value).split(":");

  return parts.length >= 2
    ? `${parts[0]}:${parts[1]}`
    : String(value);
}