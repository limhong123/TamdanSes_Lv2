import {
  BookOpen,
  CalendarDays,
  Clock3,
  FileText,
  GraduationCap,
  LoaderCircle,
  LogOut,
  RefreshCcw,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [homework, setHomework] = useState([]);
  const [scores, setScores] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  const teacherName =
    localStorage.getItem("full_name") ||
    localStorage.getItem("name") ||
    "Teacher";

  const teacherInitial = String(teacherName)
    .trim()
    .charAt(0)
    .toUpperCase();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [classRes, homeworkRes, scoreRes, scheduleRes] =
        await Promise.all([
          api.get("/classes/teacher/my-classes"),
          api.get(`/homework/teacher/${teacherId}`),
          api.get("/scores/"),
          api.get("/schedules/teacher/me"),
        ]);

      setClasses(
        Array.isArray(classRes.data) ? classRes.data : [],
      );

      setHomework(
        Array.isArray(homeworkRes.data) ? homeworkRes.data : [],
      );

      setScores(
        Array.isArray(scoreRes.data) ? scoreRes.data : [],
      );

      setSchedules(
        Array.isArray(scheduleRes.data) ? scheduleRes.data : [],
      );
    } catch (err) {
      console.error(
        "DASHBOARD ERROR:",
        err?.response?.data || err,
      );

      const detail = err?.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Failed to load teacher dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm(
      "Are you sure you want to logout?",
    );

    if (!confirmed) return;

    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("teacher_id");
    localStorage.removeItem("user_id");
    localStorage.removeItem("id");
    localStorage.removeItem("full_name");
    localStorage.removeItem("name");
    localStorage.removeItem("role");

    navigate("/login", {
      replace: true,
    });
  };

  const recentHomework = useMemo(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    return [...homework]
      .filter((item) => {
        if (!item.created_at) return false;

        const createdDate = new Date(item.created_at);

        if (Number.isNaN(createdDate.getTime())) {
          return false;
        }

        return createdDate >= oneDayAgo;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [homework]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });

  const fullTodayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const todaySchedules = useMemo(() => {
    return schedules
      .filter(
        (schedule) =>
          String(schedule.day || "")
            .trim()
            .toLowerCase() === today.toLowerCase(),
      )
      .sort((a, b) =>
        String(a.start_time || "").localeCompare(
          String(b.start_time || ""),
        ),
      );
  }, [schedules, today]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white bg-white/80 px-10 py-9 shadow-xl backdrop-blur">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <LoaderCircle
              size={34}
              className="animate-spin"
            />
          </div>

          <div className="text-center">
            <p className="font-bold text-slate-800">
              Loading dashboard
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Please wait a moment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/70 pb-12">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-5 lg:px-7">
        <header className="relative overflow-hidden rounded-b-[34px] bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 px-5 py-7 text-white shadow-2xl sm:px-8 sm:py-9 lg:px-10">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-2xl" />

          <div className="relative">
            <div className="mb-8 flex flex-col gap-4 border-b border-white/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-bold shadow-lg backdrop-blur">
                  {teacherInitial}
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Welcome back
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    {teacherName}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadDashboard(true)}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw
                    size={18}
                    className={
                      refreshing ? "animate-spin" : ""
                    }
                  />

                  <span className="hidden sm:inline">
                    Refresh
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-xl"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>

            <div className="grid items-center gap-8 lg:grid-cols-[1fr_330px]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50 backdrop-blur">
                  <GraduationCap size={17} />
                  Teacher Portal
                </div>

                <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                  Teacher Dashboard
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base lg:text-lg">
                  Manage your classes, homework, scores, and
                  teaching schedule in one place.
                </p>
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/15 p-5 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow">
                    <UserRound size={27} />
                  </div>

                  <div>
                    <p className="text-sm text-blue-100">
                      Today
                    </p>

                    <p className="mt-1 font-bold text-white">
                      {fullTodayDate}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xs text-blue-100">
                      Classes today
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {todaySchedules.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xs text-blue-100">
                      Recent homework
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {recentHomework.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-8 px-1 py-8 sm:px-2 lg:py-10">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 shadow-sm">
              <XCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          <section>
            <SectionTitle
              title="Teaching Overview"
              subtitle="Summary of your classes and teaching activities"
            />

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="My Classes"
                value={classes.length}
                subtitle="Classes assigned to you"
                icon={GraduationCap}
                iconClass="bg-blue-100 text-blue-600"
                accentClass="from-blue-500 to-cyan-500"
              />

              <StatCard
                title="Homework"
                value={homework.length}
                subtitle="Total homework created"
                icon={BookOpen}
                iconClass="bg-violet-100 text-violet-600"
                accentClass="from-violet-500 to-purple-600"
              />

              <StatCard
                title="Scores"
                value={scores.length}
                subtitle="Scores recorded"
                icon={FileText}
                iconClass="bg-emerald-100 text-emerald-600"
                accentClass="from-emerald-500 to-green-600"
              />

              <StatCard
                title="Schedules"
                value={schedules.length}
                subtitle="Weekly teaching schedules"
                icon={CalendarDays}
                iconClass="bg-orange-100 text-orange-600"
                accentClass="from-orange-500 to-red-500"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DashboardSection
              icon={CalendarDays}
              iconClass="bg-blue-100 text-blue-600"
              title="Today Schedule"
              subtitle={fullTodayDate}
            >
              {todaySchedules.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedules.map((schedule, index) => (
                    <div
                      key={schedule.id || index}
                      className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white font-bold text-blue-600 shadow-sm">
                          {index + 1}
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-800">
                            {schedule.subject_name ||
                              `Subject ${schedule.subject_id || ""}`}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Class:{" "}
                            {schedule.class_name ||
                              schedule.class_id ||
                              "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-600 shadow-sm">
                        <Clock3 size={16} />

                        {formatTime(schedule.start_time)}

                        <span className="text-slate-400">
                          -
                        </span>

                        {formatTime(schedule.end_time)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBox
                  icon={CalendarDays}
                  title="No schedule today"
                  text="You have no classes scheduled for today."
                />
              )}
            </DashboardSection>

            <DashboardSection
              icon={BookOpen}
              iconClass="bg-violet-100 text-violet-600"
              title="Recent Homework"
              subtitle="Homework created during the last 24 hours"
            >
              {recentHomework.length > 0 ? (
                <div className="space-y-3">
                  {recentHomework.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                            <BookOpen size={22} />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-800">
                              {item.title || "Homework"}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {item.class_name || "Unknown class"}
                              {" • "}
                              {item.subject_name ||
                                "Unknown subject"}
                            </p>
                          </div>
                        </div>

                        <HomeworkBadge
                          dueDate={item.due_date}
                        />
                      </div>

                      {item.description && (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                          {item.description}
                        </p>
                      )}

                      {item.due_date && (
                        <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">
                          <CalendarDays size={15} />

                          Due: {formatDate(item.due_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBox
                  icon={BookOpen}
                  title="No recent homework"
                  text="No homework was created during the last 24 hours."
                />
              )}
            </DashboardSection>
          </section>
        </main>

        <footer className="pb-6 text-center text-sm text-slate-400">
          Teacher Dashboard • School Management System
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  accentClass,
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentClass}`}
      />

      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-slate-500 sm:text-base">
            {title}
          </p>

          <h3 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
            {value}
          </h3>

          <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-110 ${iconClass}`}
        >
          <Icon size={27} />
        </div>
      </div>
    </div>
  );
}

function DashboardSection({
  icon: Icon,
  iconClass,
  title,
  subtitle,
  children,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center gap-4 border-b border-slate-100 pb-5">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon size={27} />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}

function EmptyBox({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon size={26} />
      </div>

      <h3 className="mt-4 font-bold text-slate-700">
        {title}
      </h3>

      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function HomeworkBadge({ dueDate }) {
  if (!dueDate) {
    return (
      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
        No due date
      </span>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);

  if (Number.isNaN(due.getTime())) {
    return null;
  }

  due.setHours(0, 0, 0, 0);

  const differenceInDays = Math.ceil(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (differenceInDays < 0) {
    return (
      <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
        Overdue
      </span>
    );
  }

  if (differenceInDays === 0) {
    return (
      <span className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
        Due today
      </span>
    );
  }

  if (differenceInDays === 1) {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-600">
        Due tomorrow
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
      {differenceInDays} days left
    </span>
  );
}

function formatTime(value) {
  if (!value) return "-";

  const parts = String(value).split(":");

  return parts.length >= 2
    ? `${parts[0]}:${parts[1]}`
    : String(value);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}