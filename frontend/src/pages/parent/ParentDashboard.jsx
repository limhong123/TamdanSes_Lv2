import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  LoaderCircle,
  LogOut,
  RefreshCcw,
  Trophy,
  UserRound,
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
  present_days: 0,
  absent_days: 0,
  permission_days: 0,
  present_subject_count: 0,
  absent_subject_count: 0,
  permission_subject_count: 0,
  today_schedules: [],
  recent_homeworks: [],
  semester: null,
  month: null,
};

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isPresentStatus = (status) =>
  status === "p" || status === "present";

const isAbsentStatus = (status) =>
  status === "a" || status === "absent";

const isPermissionStatus = (status) =>
  status === "l" ||
  status === "leave" ||
  status === "permission";

function calculateAttendanceSummary(attendance) {
  const attendanceByDate = attendance.reduce((groups, item) => {
    const dateKey = String(item.date || "").trim();

    if (!dateKey) return groups;

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(item);

    return groups;
  }, {});

  let presentDays = 0;
  let absentDays = 0;
  let permissionDays = 0;

  Object.values(attendanceByDate).forEach((dailyAttendance) => {
    const statuses = dailyAttendance.map((item) =>
      normalizeStatus(item.status),
    );

    const hasPresent = statuses.some(isPresentStatus);

    const allAbsent =
      statuses.length > 0 &&
      statuses.every(isAbsentStatus);

    const allPermission =
      statuses.length > 0 &&
      statuses.every(isPermissionStatus);

    if (hasPresent) {
      presentDays += 1;
    } else if (allAbsent) {
      absentDays += 1;
    } else if (allPermission) {
      permissionDays += 1;
    } else {
      const hasPermission =
        statuses.some(isPermissionStatus);

      const hasAbsent =
        statuses.some(isAbsentStatus);

      if (hasPermission && !hasAbsent) {
        permissionDays += 1;
      } else if (hasAbsent) {
        absentDays += 1;
      }
    }
  });

  return {
    presentDays,
    absentDays,
    permissionDays,

    presentSubjects: attendance.filter((item) =>
      isPresentStatus(
        normalizeStatus(item.status),
      ),
    ).length,

    absentSubjects: attendance.filter((item) =>
      isAbsentStatus(
        normalizeStatus(item.status),
      ),
    ).length,

    permissionSubjects: attendance.filter((item) =>
      isPermissionStatus(
        normalizeStatus(item.status),
      ),
    ).length,
  };
}

export default function ParentDashboard() {
  const navigate = useNavigate();

  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout;

  const [students, setStudents] = useState([]);

  const [selectedStudentId, setSelectedStudentId] =
    useState(
      localStorage.getItem(
        "selected_student_id",
      ) || "",
    );

  const [dashboardData, setDashboardData] =
    useState(EMPTY_DASHBOARD);

  const [loading, setLoading] = useState(true);

  const [
    loadingDashboard,
    setLoadingDashboard,
  ] = useState(false);

  const [error, setError] = useState("");

  const getErrorMessage = (
    err,
    defaultMessage,
  ) => {
    const status = err?.response?.status;
    const detail =
      err?.response?.data?.detail;
    const url = err?.config?.url;

    if (typeof detail === "string") {
      return `${detail}${
        url ? ` (${url})` : ""
      }`;
    }

    if (Array.isArray(detail)) {
      return detail
        .map(
          (item) =>
            item?.msg ||
            "Validation error",
        )
        .join(", ");
    }

    if (status) {
      return `${defaultMessage} Status: ${status}${
        url ? ` (${url})` : ""
      }`;
    }

    return defaultMessage;
  };

  const normalizeStudents = (result) => {
    if (Array.isArray(result)) {
      return result;
    }

    if (Array.isArray(result?.students)) {
      return result.students;
    }

    if (Array.isArray(result?.children)) {
      return result.children;
    }

    return [];
  };

  const getStoredStudents = () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(
          "parent_students",
        ) || "[]",
      );

      return Array.isArray(saved)
        ? saved
        : [];
    } catch {
      return [];
    }
  };

  const selectedStudent = useMemo(
    () =>
      students.find(
        (student) =>
          String(student.id) ===
          String(selectedStudentId),
      ),
    [students, selectedStudentId],
  );

  const selectedStudentName =
    selectedStudent?.student_name ||
    selectedStudent?.full_name ||
    selectedStudent?.name ||
    "Student";

  const selectedStudentCode =
    selectedStudent?.student_code ||
    selectedStudent?.code ||
    "";

  const parentName =
    user?.full_name ||
    user?.name ||
    localStorage.getItem("full_name") ||
    "Parent";

  const parentInitial = String(
    parentName || "P",
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      let studentList = [];

      try {
        const response = await api.get(
          "/parents/children",
        );

        studentList =
          normalizeStudents(response.data);
      } catch (parentsError) {
        console.error(
          "GET /parents/children failed:",
          parentsError?.response?.status,
          parentsError?.response?.data,
        );

        studentList =
          getStoredStudents();

        if (
          studentList.length === 0 &&
          Array.isArray(user?.students)
        ) {
          studentList = user.students;
        }

        if (studentList.length === 0) {
          throw parentsError;
        }
      }

      setStudents(studentList);

      if (studentList.length === 0) {
        setSelectedStudentId("");
        setDashboardData(
          EMPTY_DASHBOARD,
        );

        setError(
          "No child is connected to this parent account.",
        );

        return;
      }

      localStorage.setItem(
        "parent_students",
        JSON.stringify(studentList),
      );

      const savedId =
        localStorage.getItem(
          "selected_student_id",
        );

      const savedExists =
        studentList.some(
          (student) =>
            String(student.id) ===
            String(savedId),
        );

      const initialId = savedExists
        ? String(savedId)
        : String(studentList[0].id);

      setSelectedStudentId(initialId);

      localStorage.setItem(
        "selected_student_id",
        initialId,
      );

      localStorage.setItem(
        "student_id",
        initialId,
      );
    } catch (err) {
      console.error(
        "Load parent students error:",
        err,
      );

      setStudents([]);
      setSelectedStudentId("");
      setDashboardData(
        EMPTY_DASHBOARD,
      );

      setError(
        getErrorMessage(
          err,
          "Failed to load your children.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async (
    studentId,
  ) => {
    if (!studentId) {
      setDashboardData(
        EMPTY_DASHBOARD,
      );

      return;
    }

    try {
      setLoadingDashboard(true);
      setError("");

      const dashboardResponse =
        await api.get(
          `/parents/dashboard/${studentId}`,
        );

      const result =
        dashboardResponse.data || {};

      const rankData =
        result.rank || {};

      const homework =
        Array.isArray(result.homework)
          ? result.homework
          : [];

      const submissions =
        Array.isArray(result.submissions)
          ? result.submissions
          : [];

      const schedules =
        Array.isArray(result.schedules)
          ? result.schedules
          : [];

      const attendance =
        Array.isArray(result.attendance)
          ? result.attendance
          : [];

      const submittedHomeworkIds =
        new Set(
          submissions.map((item) =>
            String(item.homework_id),
          ),
        );

      const pendingHomeworkCount =
        homework.filter(
          (item) =>
            !submittedHomeworkIds.has(
              String(item.id),
            ),
        ).length;

      const attendanceSummary =
        calculateAttendanceSummary(
          attendance,
        );

      const todayName = new Date()
        .toLocaleDateString("en-US", {
          weekday: "long",
        })
        .trim()
        .toLowerCase();

      const todaySchedules =
        schedules.filter(
          (schedule) =>
            String(
              schedule.day || "",
            )
              .trim()
              .toLowerCase() ===
            todayName,
        );

      const recentHomeworks = [
        ...homework,
      ]
        .sort((a, b) => {
          const dateA = new Date(
            a.created_at ||
              a.due_date ||
              0,
          ).getTime();

          const dateB = new Date(
            b.created_at ||
              b.due_date ||
              0,
          ).getTime();

          return dateB - dateA;
        })
        .slice(0, 5);

      setDashboardData({
        rank: rankData.rank ?? "-",

        total_students:
          rankData.total_students ?? 0,

        average: Number(
          rankData.average ?? 0,
        ),

        homework_count:
          homework.length,

        pending_homework_count:
          pendingHomeworkCount,

        present_days:
          attendanceSummary.presentDays,

        absent_days:
          attendanceSummary.absentDays,

        permission_days:
          attendanceSummary.permissionDays,

        present_subject_count:
          attendanceSummary.presentSubjects,

        absent_subject_count:
          attendanceSummary.absentSubjects,

        permission_subject_count:
          attendanceSummary.permissionSubjects,

        today_schedules:
          todaySchedules,

        recent_homeworks:
          recentHomeworks,

        semester:
          rankData.semester ?? null,

        month:
          rankData.month ?? null,
      });
    } catch (err) {
      console.error(
        "PARENT DASHBOARD ERROR:",
        err?.response?.status,
        err?.response?.data,
        err?.config?.url,
      );

      setDashboardData(
        EMPTY_DASHBOARD,
      );

      setError(
        getErrorMessage(
          err,
          "Failed to load parent dashboard.",
        ),
      );
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleRefresh = () => {
    if (selectedStudentId) {
      fetchDashboard(
        selectedStudentId,
      );
    }
  };

  const handleLogout = async () => {
    const isConfirmed =
      window.confirm(
        "Are you sure you want to logout?",
      );

    if (!isConfirmed) return;

    try {
      if (
        typeof logout === "function"
      ) {
        await logout();
      }
    } catch (logoutError) {
      console.error(
        "Logout error:",
        logoutError,
      );
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem(
        "access_token",
      );

      localStorage.removeItem("user");
      localStorage.removeItem(
        "full_name",
      );

      localStorage.removeItem(
        "parent_students",
      );

      localStorage.removeItem(
        "selected_student_id",
      );

      localStorage.removeItem(
        "student_id",
      );

      navigate("/login", {
        replace: true,
      });
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setDashboardData(
        EMPTY_DASHBOARD,
      );

      return;
    }

    localStorage.setItem(
      "selected_student_id",
      selectedStudentId,
    );

    localStorage.setItem(
      "student_id",
      selectedStudentId,
    );

    fetchDashboard(
      selectedStudentId,
    );
  }, [selectedStudentId]);

  const rank =
    dashboardData.rank !== "-"
      ? `${dashboardData.rank} / ${
          dashboardData.total_students ||
          0
        }`
      : "-";

  const average = Number(
    dashboardData.average || 0,
  );

  const todayDate =
    new Date().toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    );

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
        <section className="relative overflow-hidden rounded-b-[34px] bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 px-5 py-7 text-white shadow-2xl sm:px-8 sm:py-9 lg:px-10">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-2xl" />

          <div className="relative">
            <div className="mb-8 flex flex-col gap-4 border-b border-white/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-bold shadow-lg backdrop-blur">
                  {parentInitial}
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Welcome back
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    {parentName}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={
                    loadingDashboard
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw
                    size={18}
                    className={
                      loadingDashboard
                        ? "animate-spin"
                        : ""
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

                  <span>Logout</span>
                </button>
              </div>
            </div>

            <div className="grid items-center gap-8 lg:grid-cols-[1fr_390px]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50 backdrop-blur">
                  <GraduationCap size={17} />
                  Parent Portal
                </div>

                <h1 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                  Parent Dashboard
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base lg:text-lg">
                  Track your child&apos;s
                  homework, attendance,
                  academic results, schedule,
                  and permission requests.
                </p>

                {selectedStudent && (
                  <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700">
                      <UserRound size={21} />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-blue-100">
                        Viewing student
                      </p>

                      <p className="font-bold text-white">
                        {selectedStudentName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/15 p-5 shadow-xl backdrop-blur-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow">
                    <GraduationCap size={23} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white">
                      Select Child
                    </p>

                    <p className="text-xs text-blue-100">
                      Choose a student to view
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <select
                    id="parent-student"
                    value={
                      selectedStudentId
                    }
                    onChange={(event) =>
                      setSelectedStudentId(
                        event.target.value,
                      )
                    }
                    className="w-full appearance-none rounded-2xl border border-white/30 bg-white py-4 pl-5 pr-12 text-sm font-bold text-slate-800 shadow-lg outline-none transition focus:ring-4 focus:ring-white/25 sm:text-base"
                  >
                    {students.map(
                      (student) => (
                        <option
                          key={student.id}
                          value={student.id}
                        >
                          {student.student_name ||
                            student.full_name ||
                            student.name ||
                            `Student ${student.id}`}
                          {student.student_code
                            ? ` - ${student.student_code}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  <ChevronDown
                    size={21}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>

                {selectedStudent && (
                  <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs text-blue-100">
                      Selected student
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {selectedStudentName}
                    </p>

                    {selectedStudentCode && (
                      <p className="mt-1 text-xs text-blue-100">
                        Code:{" "}
                        {selectedStudentCode}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <main className="space-y-7 px-1 py-8 sm:px-2 lg:py-10">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 shadow-sm">
              <XCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {students.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-lg sm:p-14">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                <GraduationCap
                  size={42}
                />
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-800">
                No child connected
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                This parent account is not
                connected to any student.
                Please contact the school
                administrator.
              </p>
            </div>
          ) : (
            <>
              <section>
                <SectionTitle
                  title="Academic Overview"
                  subtitle="Summary of rank, average, and homework"
                />

                <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="Class Rank"
                    value={rank}
                    subtitle={
                      dashboardData.semester
                        ? `Semester ${dashboardData.semester}`
                        : "Current ranking"
                    }
                    icon={Award}
                    iconClass="bg-amber-100 text-amber-600"
                    accentClass="from-amber-500 to-orange-500"
                  />

                  <StatCard
                    title="Average Score"
                    value={average.toFixed(
                      1,
                    )}
                    suffix="%"
                    subtitle={
                      dashboardData.month
                        ? `Month ${dashboardData.month}`
                        : "Current average"
                    }
                    icon={Trophy}
                    iconClass="bg-violet-100 text-violet-600"
                    accentClass="from-violet-500 to-purple-600"
                  />

                  <StatCard
                    title="Total Homework"
                    value={
                      dashboardData.homework_count
                    }
                    subtitle="All assigned homework"
                    icon={BookOpen}
                    iconClass="bg-blue-100 text-blue-600"
                    accentClass="from-blue-500 to-cyan-500"
                  />

                  <StatCard
                    title="Pending Homework"
                    value={
                      dashboardData.pending_homework_count
                    }
                    subtitle="Not submitted yet"
                    icon={ClipboardList}
                    iconClass="bg-orange-100 text-orange-600"
                    accentClass="from-orange-500 to-red-500"
                  />
                </div>
              </section>

              <section>
                <SectionTitle
                  title="Attendance Overview"
                  subtitle="Attendance summary by day and subject"
                />

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <StatCard
                    title="Present Days"
                    value={
                      dashboardData.present_days
                    }
                    subtitle={`${dashboardData.present_subject_count} present subjects`}
                    icon={CheckCircle}
                    iconClass="bg-emerald-100 text-emerald-600"
                    accentClass="from-emerald-500 to-green-600"
                  />

                  <StatCard
                    title="Absent Days"
                    value={
                      dashboardData.absent_days
                    }
                    subtitle={`${dashboardData.absent_subject_count} absent subjects`}
                    icon={XCircle}
                    iconClass="bg-red-100 text-red-600"
                    accentClass="from-red-500 to-rose-600"
                  />

                  <StatCard
                    title="Permission Days"
                    value={
                      dashboardData.permission_days
                    }
                    subtitle={`${dashboardData.permission_subject_count} permission subjects`}
                    icon={CalendarDays}
                    iconClass="bg-cyan-100 text-cyan-600"
                    accentClass="from-cyan-500 to-blue-600"
                    onClick={() =>
                      navigate(
                        `/parent/permission?student_id=${selectedStudentId}`,
                      )
                    }
                    actionText="Open permission page"
                  />
                </div>
              </section>

              {loadingDashboard ? (
                <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col items-center gap-4">
                    <LoaderCircle
                      size={38}
                      className="animate-spin text-blue-600"
                    />

                    <p className="font-medium text-slate-500">
                      Loading student data...
                    </p>
                  </div>
                </div>
              ) : (
                <section className="grid gap-6 xl:grid-cols-2">
                  <DashboardSection
                    icon={CalendarDays}
                    iconClass="bg-blue-100 text-blue-600"
                    title="Today Schedule"
                    subtitle={todayDate}
                  >
                    {dashboardData.today_schedules
                      .length === 0 ? (
                      <EmptyBox
                        icon={CalendarDays}
                        title="No schedule today"
                        text="There are no scheduled classes for today."
                      />
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.today_schedules.map(
                          (
                            schedule,
                            index,
                          ) => (
                            <div
                              key={
                                schedule.id ||
                                index
                              }
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
                                    {schedule.teacher_name ||
                                      `Teacher ${schedule.teacher_id || ""}`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-600 shadow-sm">
                                <Clock3
                                  size={16}
                                />

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
                          ),
                        )}
                      </div>
                    )}
                  </DashboardSection>

                  <DashboardSection
                    icon={BookOpen}
                    iconClass="bg-violet-100 text-violet-600"
                    title="Recent Homework"
                    subtitle="Latest assignments for this student"
                  >
                    {dashboardData.recent_homeworks
                      .length === 0 ? (
                      <EmptyBox
                        icon={BookOpen}
                        title="No recent homework"
                        text="There are no recent homework assignments."
                      />
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.recent_homeworks.map(
                          (
                            homework,
                            index,
                          ) => (
                            <div
                              key={
                                homework.id ||
                                index
                              }
                              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                                    <FileText
                                      size={22}
                                    />
                                  </div>

                                  <div>
                                    <h3 className="font-bold text-slate-800">
                                      {homework.title ||
                                        "Homework"}
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                      {homework.subject_name ||
                                        `Subject ${homework.subject_id || ""}`}
                                    </p>
                                  </div>
                                </div>

                                <HomeworkBadge
                                  dueDate={
                                    homework.due_date
                                  }
                                />
                              </div>

                              {homework.description && (
                                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                                  {
                                    homework.description
                                  }
                                </p>
                              )}

                              {homework.due_date && (
                                <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">
                                  <CalendarDays
                                    size={15}
                                  />

                                  Due:{" "}
                                  {formatDate(
                                    homework.due_date,
                                  )}
                                </div>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </DashboardSection>
                </section>
              )}
            </>
          )}
        </main>

        <footer className="pb-6 text-center text-sm text-slate-400">
          <p>
            Parent Dashboard • School
            Management System
          </p>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  suffix = "",
  subtitle = "",
  icon: Icon,
  iconClass,
  accentClass,
  onClick,
  actionText = "",
}) {
  const cardClass = `
    group relative overflow-hidden rounded-3xl
    border border-slate-200 bg-white p-6 text-left
    shadow-sm transition duration-300
    hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl
  `;

  const content = (
    <>
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentClass}`}
      />

      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 sm:text-base">
            {title}
          </p>

          <h3 className="mt-4 break-words text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {value ?? 0}
            {suffix}
          </h3>

          {subtitle && (
            <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-110 ${iconClass}`}
        >
          <Icon size={27} />
        </div>
      </div>

      {onClick && (
        <div className="mt-5 border-t border-slate-100 pt-4 text-sm font-bold text-blue-600">
          {actionText ||
            "Click to open"}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full ${cardClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cardClass}>
      {content}
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

        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 truncate text-sm text-slate-500">
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

  const parts =
    String(value).split(":");

  return parts.length >= 2
    ? `${parts[0]}:${parts[1]}`
    : String(value);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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