import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  FileText,
  GraduationCap,
  Trophy,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/axios";

export default function ParentDashboard() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] =
    useState("");

  const [dashboard, setDashboard] = useState({
    student: null,
    rank: "-",
    total_students: 0,
    average: 0,
    month: null,
    semester: null,
    homework: [],
    submissions: [],
    scores: [],
    schedules: [],
    attendance: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const parentName =
    localStorage.getItem("full_name") || "Parent";

  const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // =====================================================
  // Load children from localStorage after parent login
  // =====================================================

  useEffect(() => {
    loadParentStudents();
  }, []);

  const loadParentStudents = () => {
    try {
      const storedStudents = JSON.parse(
        localStorage.getItem("parent_students") || "[]",
      );

      const safeStudents = Array.isArray(storedStudents)
        ? storedStudents
        : [];

      setStudents(safeStudents);

      const savedStudentId =
        localStorage.getItem("selected_student_id");

      const firstStudentId =
        savedStudentId ||
        safeStudents[0]?.id ||
        "";

      if (firstStudentId) {
        setSelectedStudentId(
          String(firstStudentId),
        );
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.log(
        "LOAD PARENT STUDENTS ERROR:",
        err,
      );

      setError(
        "Failed to load your children.",
      );

      setLoading(false);
    }
  };

  // =====================================================
  // Load selected child's dashboard
  // =====================================================

  useEffect(() => {
    if (!selectedStudentId) return;

    saveSelectedStudent(selectedStudentId);
    loadDashboard(selectedStudentId);
  }, [selectedStudentId]);

  const saveSelectedStudent = (studentId) => {
    const selectedStudent = students.find(
      (student) =>
        String(student.id) === String(studentId),
    );

    if (!selectedStudent) return;

    localStorage.setItem(
      "selected_student_id",
      String(selectedStudent.id),
    );

    localStorage.setItem(
      "student_id",
      String(selectedStudent.id),
    );

    localStorage.setItem(
      "selected_student_code",
      selectedStudent.student_code || "",
    );

    localStorage.setItem(
      "student_code",
      selectedStudent.student_code || "",
    );

    localStorage.setItem(
      "class_id",
      String(selectedStudent.class_id || ""),
    );
  };

  const loadDashboard = async (studentId) => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get(
        `/parents/dashboard/${studentId}`,
      );

      setDashboard({
        student: res.data?.student || null,

        rank:
          res.data?.rank?.rank ??
          res.data?.rank ??
          "-",

        total_students:
          res.data?.rank?.total_students ??
          res.data?.total_students ??
          0,

        average:
          res.data?.rank?.average ??
          res.data?.average ??
          0,

        month:
          res.data?.rank?.month ??
          res.data?.month ??
          null,

        semester:
          res.data?.rank?.semester ??
          res.data?.semester ??
          null,

        homework: Array.isArray(
          res.data?.homework,
        )
          ? res.data.homework
          : [],

        submissions: Array.isArray(
          res.data?.submissions,
        )
          ? res.data.submissions
          : [],

        scores: Array.isArray(
          res.data?.scores,
        )
          ? res.data.scores
          : [],

        schedules: Array.isArray(
          res.data?.schedules,
        )
          ? res.data.schedules
          : [],

        attendance: Array.isArray(
          res.data?.attendance,
        )
          ? res.data.attendance
          : [],
      });
    } catch (err) {
      console.log(
        "PARENT DASHBOARD ERROR:",
        err?.response?.data || err,
      );

      const detail =
        err?.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Failed to load student dashboard.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Calculated dashboard values
  // =====================================================

  const selectedStudent = useMemo(() => {
    return students.find(
      (student) =>
        String(student.id) ===
        String(selectedStudentId),
    );
  }, [students, selectedStudentId]);

  const rankMonthName = dashboard.month
    ? monthNames[Number(dashboard.month)]
    : "-";

  const rankValue =
    dashboard.rank &&
    dashboard.rank !== "-"
      ? `${dashboard.rank} / ${
          dashboard.total_students || "-"
        }`
      : "-";

  const submittedHomeworkIds = useMemo(() => {
    return new Set(
      dashboard.submissions.map(
        (submission) =>
          Number(submission.homework_id),
      ),
    );
  }, [dashboard.submissions]);

  const pendingHomework = dashboard.homework.filter(
    (homework) =>
      !submittedHomeworkIds.has(
        Number(homework.id),
      ),
  ).length;

  const presentCount =
    dashboard.attendance.filter((item) => {
      const status = String(
        item.status || "",
      )
        .trim()
        .toLowerCase();

      return (
        status === "p" ||
        status === "present"
      );
    }).length;

  const absentCount =
    dashboard.attendance.filter((item) => {
      const status = String(
        item.status || "",
      )
        .trim()
        .toLowerCase();

      return (
        status === "a" ||
        status === "absent"
      );
    }).length;

  const permissionCount =
    dashboard.attendance.filter((item) => {
      const status = String(
        item.status || "",
      )
        .trim()
        .toLowerCase();

      return (
        status === "l" ||
        status === "permission" ||
        status === "leave"
      );
    }).length;

  const totalScore = dashboard.scores.reduce(
    (sum, score) =>
      sum + Number(score.total_score || 0),
    0,
  );

  const totalMax = dashboard.scores.reduce(
    (sum, score) =>
      sum + Number(score.max_score || 0),
    0,
  );

  const calculatedAverage =
    totalMax > 0
      ? (
          (totalScore / totalMax) *
          100
        ).toFixed(1)
      : Number(
          dashboard.average || 0,
        ).toFixed(1);

  const today = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
    },
  );

  const todaySchedules =
    dashboard.schedules.filter(
      (schedule) =>
        String(schedule.day).toLowerCase() ===
        today.toLowerCase(),
    );

  const recentHomework = useMemo(() => {
    const oneDayAgo = new Date();

    oneDayAgo.setDate(
      oneDayAgo.getDate() - 1,
    );

    return dashboard.homework
      .filter((homework) => {
        if (!homework.created_at) {
          return true;
        }

        return (
          new Date(homework.created_at) >=
          oneDayAgo
        );
      })
      .slice(0, 5);
  }, [dashboard.homework]);

  // =====================================================
  // Empty children state
  // =====================================================

  if (!loading && students.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <UserRound size={32} />
        </div>

        <h2 className="mt-5 text-2xl font-bold text-slate-900">
          No children found
        </h2>

        <p className="mt-2 text-slate-500">
          This parent account is not linked to
          any student.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-8 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-100">
              Welcome, {parentName}
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Parent Dashboard
            </h1>

            <p className="mt-2 text-blue-100">
              Track your child's homework,
              attendance, results, and schedule.
            </p>

            <p className="mt-4 text-sm font-semibold text-blue-100">
              Showing information for{" "}
              {selectedStudent?.student_name ||
                dashboard.student?.student_name ||
                "Student"}
            </p>
          </div>

          {/* Child selector */}
          <div className="w-full lg:w-80">
            <label className="mb-2 block text-sm font-semibold text-blue-100">
              Select Child
            </label>

            <div className="relative">
              <GraduationCap
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={selectedStudentId}
                onChange={(event) =>
                  setSelectedStudentId(
                    event.target.value,
                  )
                }
                className="w-full appearance-none rounded-2xl border border-white/30 bg-white py-4 pl-12 pr-12 font-semibold text-slate-800 outline-none"
              >
                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.student_name ||
                      "Student"}{" "}
                    - {student.student_code}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={20}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <DashboardLoading />
      ) : (
        <>
          {/* Main statistics */}
          <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title={`Rank in ${rankMonthName}`}
              value={rankValue}
              icon={Award}
              color="bg-yellow-50 text-yellow-600"
            />

            <StatCard
              title="Average"
              value={`${calculatedAverage}%`}
              icon={Trophy}
              color="bg-violet-50 text-violet-600"
            />

            <StatCard
              title="Homework"
              value={dashboard.homework.length}
              icon={BookOpen}
              color="bg-blue-50 text-blue-600"
            />

            <StatCard
              title="Pending"
              value={pendingHomework}
              icon={FileText}
              color="bg-orange-50 text-orange-600"
            />
          </div>

          {/* Attendance statistics */}
          <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatCard
              title="Present"
              value={presentCount}
              icon={CheckCircle}
              color="bg-green-50 text-green-600"
            />

            <StatCard
              title="Absent"
              value={absentCount}
              icon={XCircle}
              color="bg-red-50 text-red-600"
            />

            <StatCard
              title="Permission"
              value={permissionCount}
              icon={CalendarDays}
              color="bg-cyan-50 text-cyan-600"
            />
          </div>

          {/* Schedule and homework */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <CalendarDays size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Today Schedule
                  </h2>

                  <p className="text-sm text-slate-500">
                    {today}
                  </p>
                </div>
              </div>

              {todaySchedules.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedules.map(
                    (schedule) => (
                      <div
                        key={schedule.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <p className="font-bold text-slate-800">
                          {schedule.subject_name ||
                            "Subject"}
                        </p>

                        <p className="text-sm text-slate-500">
                          Teacher:{" "}
                          {schedule.teacher_name ||
                            "-"}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-blue-600">
                          {schedule.start_time} -{" "}
                          {schedule.end_time}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <EmptyBox text="No schedule today" />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                  <BookOpen size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Recent Homework
                  </h2>

                  <p className="text-sm text-slate-500">
                    Recent assignments for this
                    child
                  </p>
                </div>
              </div>

              {recentHomework.length > 0 ? (
                <div className="space-y-3">
                  {recentHomework.map(
                    (homework) => {
                      const submitted =
                        dashboard.submissions.find(
                          (submission) =>
                            Number(
                              submission.homework_id,
                            ) ===
                            Number(homework.id),
                        );

                      return (
                        <div
                          key={homework.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-800">
                                {homework.title}
                              </p>

                              <p className="text-sm text-slate-500">
                                {homework.subject_name ||
                                  "-"}{" "}
                                •{" "}
                                {homework.teacher_name ||
                                  "-"}
                              </p>

                              <p className="mt-1 text-sm font-semibold text-red-600">
                                Due:{" "}
                                {homework.due_date ||
                                  "-"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                submitted
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {submitted
                                ? submitted.status ||
                                  "submitted"
                                : "pending"}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <EmptyBox text="No recent homework" />
              )}
            </section>
          </div>

          {/* Latest result */}
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-green-50 p-3 text-green-600">
                <Trophy size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Latest Result
                </h2>

                <p className="text-sm text-slate-500">
                  {rankMonthName} / Semester{" "}
                  {dashboard.semester || "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoBox
                label="Total Score"
                value={`${totalScore} / ${totalMax}`}
              />

              <InfoBox
                label="Average"
                value={`${calculatedAverage}%`}
              />

              <InfoBox
                label="Rank"
                value={rankValue}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// Components
// =====================================================

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </h2>
        </div>

        <div
          className={`rounded-2xl p-4 ${color}`}
        >
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function EmptyBox({ text }) {
  return (
    <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
      {text}
    </p>
  );
}

function DashboardLoading() {
  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-3xl bg-slate-200"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    </div>
  );
}