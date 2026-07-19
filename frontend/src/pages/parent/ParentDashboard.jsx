import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  LoaderCircle,
  Trophy,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const EMPTY_DASHBOARD = {
  rank: "-",
  total_students: 0,
  average: 0,
  homework_count: 0,
  pending_homework_count: 0,
  present_count: 0,
  absent_count: 0,
  permission_count: 0,
  today_schedules: [],
  recent_homeworks: [],
  semester: null,
  month: null,
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(
    localStorage.getItem("selected_student_id") || "",
  );
  const [dashboardData, setDashboardData] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (err, defaultMessage) => {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail;
    const url = err?.config?.url;

    if (status === 404) {
      return `API not found: ${url || "unknown endpoint"}`;
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || "Validation error")
        .join(", ");
    }

    return defaultMessage;
  };

  const selectedStudent = useMemo(
    () =>
      students.find(
        (student) => String(student.id) === String(selectedStudentId),
      ),
    [students, selectedStudentId],
  );

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/parents/children");
      const result = response.data;

      const studentList = Array.isArray(result)
        ? result
        : result?.students || result?.children || [];

      setStudents(studentList);
      localStorage.setItem("parent_students", JSON.stringify(studentList));

      if (studentList.length === 0) {
        setSelectedStudentId("");
        setDashboardData(EMPTY_DASHBOARD);
        return;
      }

      const savedId = localStorage.getItem("selected_student_id");
      const savedExists = studentList.some(
        (student) => String(student.id) === String(savedId),
      );

      const initialId = savedExists
        ? String(savedId)
        : String(studentList[0].id);

      setSelectedStudentId(initialId);
      localStorage.setItem("selected_student_id", initialId);
      localStorage.setItem("student_id", initialId);
    } catch (err) {
      console.error("Load parent students error:", err?.response?.data || err);
      setStudents([]);
      setDashboardData(EMPTY_DASHBOARD);
      setError(getErrorMessage(err, "Failed to load your children."));
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async (studentId) => {
    if (!studentId) {
      setDashboardData(EMPTY_DASHBOARD);
      return;
    }

    try {
      setLoadingDashboard(true);
      setError("");

      const response = await api.get(`/parents/dashboard/${studentId}`);
      const data = response.data || {};

      setDashboardData({
        rank: data.rank ?? data.student_rank ?? "-",
        total_students: data.total_students ?? 0,
        average: Number(data.average ?? data.average_score ?? 0),
        homework_count:
          data.homework_count ?? data.total_homework ?? data.homeworks_count ?? 0,
        pending_homework_count:
          data.pending_homework_count ?? data.pending_count ?? 0,
        present_count: data.present_count ?? data.present ?? 0,
        absent_count: data.absent_count ?? data.absent ?? 0,
        permission_count:
          data.permission_count ?? data.permissions_count ?? 0,
        today_schedules: data.today_schedules ?? data.schedules ?? [],
        recent_homeworks: data.recent_homeworks ?? data.homeworks ?? [],
        semester: data.semester ?? null,
        month: data.month ?? null,
      });
    } catch (err) {
      console.error("Load parent dashboard error:", err?.response?.data || err);
      setDashboardData(EMPTY_DASHBOARD);
      setError(getErrorMessage(err, "Unable to load parent dashboard."));
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }

    localStorage.setItem("selected_student_id", selectedStudentId);
    localStorage.setItem("student_id", selectedStudentId);
    fetchDashboard(selectedStudentId);
  }, [selectedStudentId]);

  const rank =
    dashboardData.rank !== "-"
      ? `${dashboardData.rank} / ${dashboardData.total_students || 0}`
      : "-";

  const average = Number(dashboardData.average ?? 0);
  const homeworkCount = dashboardData.homework_count ?? 0;
  const pendingHomeworkCount = dashboardData.pending_homework_count ?? 0;
  const presentCount = dashboardData.present_count ?? 0;
  const absentCount = dashboardData.absent_count ?? 0;
  const permissionCount = dashboardData.permission_count ?? 0;
  const todaySchedules = dashboardData.today_schedules || [];
  const recentHomeworks = dashboardData.recent_homeworks || [];

  const parentName =
    user?.full_name || localStorage.getItem("full_name") || "Parent";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle size={38} className="animate-spin" />
          <p className="font-medium">Loading parent dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="mx-auto max-w-[1600px]">
        <section className="rounded-b-[28px] bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-6 py-9 text-white shadow-lg md:px-9">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-base font-medium text-blue-100">
                Welcome, {parentName}
              </p>

              <h1 className="mt-2 text-3xl font-bold md:text-4xl">
                Parent Dashboard
              </h1>

              <p className="mt-3 text-base text-blue-100 md:text-lg">
                Track your child&apos;s homework, attendance, results, schedule,
                and permission requests.
              </p>

              {selectedStudent && (
                <p className="mt-5 font-semibold text-white">
                  Showing information for{" "}
                  {selectedStudent.full_name ||
                    selectedStudent.student_name ||
                    selectedStudent.name ||
                    "Student"}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="parent-student"
                className="mb-3 block font-semibold text-white"
              >
                Select Child
              </label>

              <div className="relative">
                <GraduationCap
                  size={21}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  id="parent-student"
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="w-full appearance-none rounded-2xl border-0 bg-white py-5 pl-14 pr-12 text-base font-semibold text-slate-800 shadow-lg outline-none"
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name ||
                        student.student_name ||
                        student.name ||
                        `Student ${student.id}`}
                      {student.student_code ? ` - ${student.student_code}` : ""}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={21}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>
        </section>

        <main className="space-y-8 px-4 py-8 md:px-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {students.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <GraduationCap size={60} className="mx-auto text-slate-300" />
              <h2 className="mt-4 text-xl font-bold text-slate-800">
                No child connected
              </h2>
              <p className="mt-2 text-slate-500">
                This parent account is not connected to a student.
              </p>
            </div>
          ) : (
            <>
              <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Rank"
                  value={rank}
                  icon={Award}
                  iconClass="bg-amber-50 text-amber-600"
                />
                <StatCard
                  title="Average"
                  value={average.toFixed(1)}
                  suffix="%"
                  icon={Trophy}
                  iconClass="bg-violet-50 text-violet-600"
                />
                <StatCard
                  title="Homework"
                  value={homeworkCount}
                  icon={BookOpen}
                  iconClass="bg-blue-50 text-blue-600"
                />
                <StatCard
                  title="Pending"
                  value={pendingHomeworkCount}
                  icon={ClipboardList}
                  iconClass="bg-orange-50 text-orange-600"
                />
              </section>

              <section className="grid gap-5 md:grid-cols-3">
                <StatCard
                  title="Present"
                  value={presentCount}
                  icon={CheckCircle}
                  iconClass="bg-green-50 text-green-600"
                />
                <StatCard
                  title="Absent"
                  value={absentCount}
                  icon={XCircle}
                  iconClass="bg-red-50 text-red-600"
                />
                <StatCard
                  title="Permission"
                  value={permissionCount}
                  icon={CalendarDays}
                  iconClass="bg-cyan-50 text-cyan-600"
                  onClick={() =>
                    navigate(
                      `/parent/permission?student_id=${selectedStudentId}`,
                    )
                  }
                />
              </section>

              {loadingDashboard ? (
                <div className="flex min-h-[250px] items-center justify-center">
                  <LoaderCircle
                    size={35}
                    className="animate-spin text-blue-600"
                  />
                </div>
              ) : (
                <section className="grid gap-6 xl:grid-cols-2">
                  <DashboardSection
                    icon={CalendarDays}
                    iconClass="bg-blue-50 text-blue-600"
                    title="Today Schedule"
                    subtitle={new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                    })}
                  >
                    {todaySchedules.length === 0 ? (
                      <EmptyBox text="No schedule today" />
                    ) : (
                      <div className="space-y-3">
                        {todaySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div>
                              <h3 className="font-bold text-slate-800">
                                {schedule.subject_name || "Subject"}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {schedule.teacher_name || "Teacher"}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-blue-600">
                              {formatTime(schedule.start_time)} -{" "}
                              {formatTime(schedule.end_time)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </DashboardSection>

                  <DashboardSection
                    icon={BookOpen}
                    iconClass="bg-violet-50 text-violet-600"
                    title="Recent Homework"
                    subtitle="Recent assignments for this child"
                  >
                    {recentHomeworks.length === 0 ? (
                      <EmptyBox text="No recent homework" />
                    ) : (
                      <div className="space-y-3">
                        {recentHomeworks.slice(0, 5).map((homework) => (
                          <div
                            key={homework.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-bold text-slate-800">
                                  {homework.title || "Homework"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                  {homework.subject_name || "Subject"}
                                </p>
                              </div>
                              <FileText
                                size={20}
                                className="shrink-0 text-violet-500"
                              />
                            </div>

                            {homework.due_date && (
                              <p className="mt-3 text-xs font-medium text-slate-400">
                                Due: {formatDate(homework.due_date)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </DashboardSection>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, suffix = "", icon: Icon, iconClass, onClick }) {
  const content = (
    <div className="flex items-center justify-between gap-5">
      <div>
        <p className="text-base font-medium text-slate-500">{title}</p>
        <h2 className="mt-5 text-4xl font-bold text-slate-900">
          {value ?? 0}
          {suffix}
        </h2>
      </div>

      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        <Icon size={30} />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
      >
        {content}
        <p className="mt-4 text-sm font-semibold text-blue-600">
          Click to open permission
        </p>
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      {content}
    </div>
  );
}

function DashboardSection({ icon: Icon, iconClass, title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon size={27} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="flex min-h-[105px] items-center justify-center rounded-2xl bg-slate-50 px-5 text-center text-slate-500">
      {text}
    </div>
  );
}

function formatTime(value) {
  if (!value) return "-";

  const stringValue = String(value);

  if (stringValue.includes(":")) {
    const parts = stringValue.split(":");
    return `${parts[0]}:${parts[1]}`;
  }

  return stringValue;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
