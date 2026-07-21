import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  LoaderCircle,
  LogOut,
  RefreshCcw,
  TriangleAlert,
  UsersRound,
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  const teacherName =
    localStorage.getItem("full_name") ||
    localStorage.getItem("name") ||
    "Teacher";

  const teacherInitial = teacherName
    .trim()
    .charAt(0)
    .toUpperCase();

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
        Array.isArray(classRes.data)
          ? classRes.data
          : [],
      );

      setHomework(
        Array.isArray(homeworkRes.data)
          ? homeworkRes.data
          : [],
      );

      setScores(
        Array.isArray(scoreRes.data)
          ? scoreRes.data
          : [],
      );

      setSchedules(
        Array.isArray(scheduleRes.data)
          ? scheduleRes.data
          : [],
      );
    } catch (err) {
      console.error(
        "TEACHER DASHBOARD ERROR:",
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

  useEffect(() => {
    loadDashboard();
  }, []);

  const todayName = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
    },
  );

  const todayFullDate = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );

  const todaySchedules = useMemo(() => {
    return [...schedules]
      .filter(
        (schedule) =>
          String(schedule.day || "")
            .trim()
            .toLowerCase() ===
          todayName.toLowerCase(),
      )
      .sort((a, b) =>
        String(a.start_time || "").localeCompare(
          String(b.start_time || ""),
        ),
      );
  }, [schedules, todayName]);

  const recentHomework = useMemo(() => {
    const oneDayAgo = new Date();

    oneDayAgo.setHours(
      oneDayAgo.getHours() - 24,
    );

    return [...homework]
      .filter((item) => {
        if (!item.created_at) return false;

        const createdDate = new Date(
          item.created_at,
        );

        if (
          Number.isNaN(
            createdDate.getTime(),
          )
        ) {
          return false;
        }

        return createdDate >= oneDayAgo;
      })
      .sort((a, b) => {
        const firstDate = new Date(
          a.created_at || 0,
        ).getTime();

        const secondDate = new Date(
          b.created_at || 0,
        ).getTime();

        return secondDate - firstDate;
      })
      .slice(0, 5);
  }, [homework]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("teacher_id");
    localStorage.removeItem("user_id");
    localStorage.removeItem("id");
    localStorage.removeItem("full_name");
    localStorage.removeItem("name");
    localStorage.removeItem("role");

    setShowLogoutModal(false);

    navigate("/login", {
      replace: true,
    });
  };

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
              Loading dashboard
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
    <>
      <div className="space-y-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-6 py-6 text-white md:px-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-bold shadow-lg backdrop-blur">
                  {teacherInitial}
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Welcome back
                  </p>

                  <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">
                    {teacherName}
                  </h1>

                  <p className="mt-1 text-sm text-blue-100">
                    Here is your teaching summary for today.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs text-blue-100">
                    Today
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {todayFullDate}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadDashboard(true)
                  }
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
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

                <button
                  type="button"
                  onClick={() =>
                    setShowLogoutModal(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-red-600"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
            <MiniSummary
              label="Classes Today"
              value={todaySchedules.length}
            />

            <MiniSummary
              label="Total Classes"
              value={classes.length}
            />

            <MiniSummary
              label="Homework"
              value={homework.length}
            />

            <MiniSummary
              label="Scores"
              value={scores.length}
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

        <section>
          <SectionHeader
            title="Teaching Overview"
            subtitle="Your teaching activity at a glance"
          />

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="My Classes"
              value={classes.length}
              subtitle="Classes assigned to you"
              icon={GraduationCap}
              iconClass="bg-blue-50 text-blue-600"
              topClass="bg-blue-500"
            />

            <StatCard
              title="Homework"
              value={homework.length}
              subtitle="Total homework created"
              icon={BookOpen}
              iconClass="bg-violet-50 text-violet-600"
              topClass="bg-violet-500"
            />

            <StatCard
              title="Scores"
              value={scores.length}
              subtitle="Scores recorded"
              icon={FileText}
              iconClass="bg-emerald-50 text-emerald-600"
              topClass="bg-emerald-500"
            />

            <StatCard
              title="Schedules"
              value={schedules.length}
              subtitle="Weekly schedules"
              icon={CalendarDays}
              iconClass="bg-orange-50 text-orange-600"
              topClass="bg-orange-500"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DashboardSection
            icon={CalendarDays}
            iconClass="bg-blue-50 text-blue-600"
            title="Today Schedule"
            subtitle={`${todayName} · ${todaySchedules.length} class${
              todaySchedules.length !== 1
                ? "es"
                : ""
            }`}
          >
            {todaySchedules.length > 0 ? (
              <div className="space-y-3">
                {todaySchedules.map(
                  (schedule, index) => (
                    <div
                      key={
                        schedule.id ||
                        index
                      }
                      className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-blue-600 shadow-sm">
                            {index + 1}
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-800">
                              {schedule.subject_name ||
                                `Subject ${
                                  schedule.subject_id ||
                                  ""
                                }`}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {schedule.class_name ||
                                `Class ${
                                  schedule.class_id ||
                                  "-"
                                }`}
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-600 shadow-sm">
                          <Clock3 size={16} />

                          {formatTime(
                            schedule.start_time,
                          )}

                          <span className="text-slate-400">
                            -
                          </span>

                          {formatTime(
                            schedule.end_time,
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <EmptyBox
                icon={CalendarDays}
                title="No schedule today"
                description="You have no classes scheduled for today."
              />
            )}
          </DashboardSection>

          <DashboardSection
            icon={BookOpen}
            iconClass="bg-violet-50 text-violet-600"
            title="Recent Homework"
            subtitle="Created during the last 24 hours"
          >
            {recentHomework.length > 0 ? (
              <div className="space-y-3">
                {recentHomework.map(
                  (item, index) => (
                    <div
                      key={
                        item.id || index
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-200 hover:bg-violet-50/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                          <BookOpen
                            size={20}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="font-bold text-slate-800">
                                {item.title ||
                                  "Homework"}
                              </h3>

                              <p className="mt-1 text-sm text-slate-500">
                                {item.class_name ||
                                  "Unknown class"}
                                {" · "}
                                {item.subject_name ||
                                  "Unknown subject"}
                              </p>
                            </div>

                            <HomeworkStatus
                              dueDate={
                                item.due_date
                              }
                            />
                          </div>

                          {item.description && (
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                              {
                                item.description
                              }
                            </p>
                          )}

                          {item.due_date && (
                            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <CalendarDays
                                size={14}
                              />

                              Due{" "}
                              {formatDate(
                                item.due_date,
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <EmptyBox
                icon={BookOpen}
                title="No recent homework"
                description="No homework was created during the last 24 hours."
              />
            )}
          </DashboardSection>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <QuickInfoCard
            icon={UsersRound}
            iconClass="bg-blue-50 text-blue-600"
            title="Assigned Classes"
            value={classes.length}
            description="Classes currently assigned to your account."
          />

          <QuickInfoCard
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
            title="Recorded Scores"
            value={scores.length}
            description="Student scores you have already recorded."
          />

          <QuickInfoCard
            icon={CalendarDays}
            iconClass="bg-orange-50 text-orange-600"
            title="Weekly Periods"
            value={schedules.length}
            description="Teaching periods in your weekly schedule."
          />
        </section>
      </div>

      {showLogoutModal && (
        <LogoutModal
          onCancel={() =>
            setShowLogoutModal(false)
          }
          onConfirm={handleLogout}
        />
      )}
    </>
  );
}

function MiniSummary({ label, value }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900">
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
  topClass,
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div
        className={`absolute left-0 right-0 top-0 h-1 ${topClass}`}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-4xl font-extrabold text-slate-900">
            {value}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105 ${iconClass}`}
        >
          <Icon size={26} />
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-4 border-b border-slate-100 pb-5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon size={23} />
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
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
  description,
}) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon size={26} />
      </div>

      <h3 className="mt-4 font-bold text-slate-700">
        {title}
      </h3>

      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function QuickInfoCard({
  icon: Icon,
  iconClass,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon size={23} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {value}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function HomeworkStatus({ dueDate }) {
  if (!dueDate) {
    return (
      <span className="w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
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

  const daysLeft = Math.ceil(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (daysLeft < 0) {
    return (
      <span className="w-fit shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
        Overdue
      </span>
    );
  }

  if (daysLeft === 0) {
    return (
      <span className="w-fit shrink-0 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
        Due today
      </span>
    );
  }

  if (daysLeft === 1) {
    return (
      <span className="w-fit shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-600">
        Due tomorrow
      </span>
    );
  }

  return (
    <span className="w-fit shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
      {daysLeft} days left
    </span>
  );
}

function LogoutModal({
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <TriangleAlert size={31} />
        </div>

        <h2 className="mt-5 text-center text-xl font-extrabold text-slate-900">
          Confirm Logout
        </h2>

        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Are you sure you want to logout from your teacher account?
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </div>
    </div>
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

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}