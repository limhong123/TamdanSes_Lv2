import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle,
  FileText,
  Trophy,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isPresentStatus = (status) =>
  status === "p" || status === "present";

const isAbsentStatus = (status) =>
  status === "a" || status === "absent";

const isPermissionStatus = (status) =>
  status === "l" || status === "leave" || status === "permission";

function calculateAttendanceSummary(attendance) {
  const attendanceByDate = attendance.reduce((groups, item) => {
    const dateKey = String(item.date || "").trim();

    if (!dateKey) {
      return groups;
    }

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
      statuses.length > 0 && statuses.every(isAbsentStatus);
    const allPermission =
      statuses.length > 0 && statuses.every(isPermissionStatus);

    if (hasPresent) {
      presentDays += 1;
    } else if (allAbsent) {
      absentDays += 1;
    } else if (allPermission) {
      permissionDays += 1;
    } else {
      const hasPermission = statuses.some(isPermissionStatus);
      const hasAbsent = statuses.some(isAbsentStatus);

      if (hasPermission && !hasAbsent) {
        permissionDays += 1;
      } else if (hasAbsent) {
        absentDays += 1;
      }
    }
  });

  const presentSubjects = attendance.filter((item) =>
    isPresentStatus(normalizeStatus(item.status)),
  ).length;

  const absentSubjects = attendance.filter((item) =>
    isAbsentStatus(normalizeStatus(item.status)),
  ).length;

  const permissionSubjects = attendance.filter((item) =>
    isPermissionStatus(normalizeStatus(item.status)),
  ).length;

  return {
    presentDays,
    absentDays,
    permissionDays,
    presentSubjects,
    absentSubjects,
    permissionSubjects,
  };
}

export default function StudentDashboard() {
  const [homework, setHomework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [scores, setScores] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [rank, setRank] = useState("-");
  const [rankAverage, setRankAverage] = useState(0);
  const [rankMonth, setRankMonth] = useState(null);
  const [rankSemester, setRankSemester] = useState(null);

  const studentId =
    localStorage.getItem("student_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

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

  const rankMonthName = rankMonth ? monthNames[Number(rankMonth)] : "-";

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const rankRes = await api.get("/scores/student/rank");

      const latestMonth = rankRes.data?.month || null;
      const latestSemester = rankRes.data?.semester || null;

      setRankMonth(latestMonth);
      setRankSemester(latestSemester);

      setRank(
        rankRes.data?.rank && rankRes.data?.rank !== "-"
          ? `${rankRes.data.rank} / ${rankRes.data.total_students}`
          : "-",
      );

      setRankAverage(Number(rankRes.data?.average || 0));

      const [
        homeworkRes,
        submissionsRes,
        scoresRes,
        schedulesRes,
        attendanceRes,
      ] = await Promise.all([
        api.get(`/homework/student/${studentId}`),
        api.get(`/submissions/student/${studentId}`),
        api.get("/scores/student/me", {
          params:
            latestMonth && latestSemester
              ? {
                  semester: latestSemester,
                  month: latestMonth,
                }
              : {},
        }),
        api.get("/schedules/student/me"),
        api.get("/attendance/me"),
      ]);

      setHomework(Array.isArray(homeworkRes.data) ? homeworkRes.data : []);
      setSubmissions(
        Array.isArray(submissionsRes.data) ? submissionsRes.data : [],
      );
      setScores(Array.isArray(scoresRes.data) ? scoresRes.data : []);
      setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
      setAttendance(
        Array.isArray(attendanceRes.data) ? attendanceRes.data : [],
      );
    } catch (err) {
      console.log("STUDENT DASHBOARD ERROR:", err?.response?.data || err);
    }
  };

  const recentHomework = useMemo(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return homework
      .filter((item) => {
        if (!item.created_at) return false;
        return new Date(item.created_at) >= oneDayAgo;
      })
      .slice(0, 5);
  }, [homework]);

  const submittedHomeworkIds = useMemo(
    () =>
      new Set(
        submissions.map((item) => String(item.homework_id)),
      ),
    [submissions],
  );

  const pendingHomework = homework.filter(
    (item) => !submittedHomeworkIds.has(String(item.id)),
  ).length;

  const attendanceSummary = useMemo(
    () => calculateAttendanceSummary(attendance),
    [attendance],
  );

  const totalScore = scores.reduce(
    (sum, item) => sum + Number(item.total_score || 0),
    0,
  );

  const totalMax = scores.reduce(
    (sum, item) => sum + Number(item.max_score || 0),
    0,
  );

  const average =
    totalMax > 0
      ? ((totalScore / totalMax) * 100).toFixed(1)
      : Number(rankAverage || 0).toFixed(1);

  const today = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
    })
    .toLowerCase();

  const todaySchedules = schedules.filter(
    (item) => String(item.day || "").trim().toLowerCase() === today,
  );

  return (
    <div>
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-8 text-white shadow-sm">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>

        <p className="mt-2 text-blue-100">
          Track your homework, rank, attendance, and scores.
        </p>

        <p className="mt-4 text-sm font-semibold text-blue-100">
          Showing rank for {rankMonthName} / Semester {rankSemester || "-"}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">
        <StatCard
          title={`Rank in ${rankMonthName}`}
          value={rank}
          icon={Award}
          color="bg-yellow-50 text-yellow-600"
        />

        <StatCard
          title="Average"
          value={`${average}%`}
          icon={Trophy}
          color="bg-violet-50 text-violet-600"
        />

        <StatCard
          title="Homework"
          value={homework.length}
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

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          title="Present Days"
          value={attendanceSummary.presentDays}
          subtitle={`${attendanceSummary.presentSubjects} present subjects`}
          icon={CheckCircle}
          color="bg-green-50 text-green-600"
        />

        <StatCard
          title="Absent Days"
          value={attendanceSummary.absentDays}
          subtitle={`${attendanceSummary.absentSubjects} absent subjects`}
          icon={XCircle}
          color="bg-red-50 text-red-600"
        />

        <StatCard
          title="Permission Days"
          value={attendanceSummary.permissionDays}
          subtitle={`${attendanceSummary.permissionSubjects} permission subjects`}
          icon={CalendarDays}
          color="bg-cyan-50 text-cyan-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <CalendarDays size={24} />
            </div>

            <h2 className="text-xl font-bold text-slate-800">
              Today Schedule
            </h2>
          </div>

          {todaySchedules.length > 0 ? (
            <div className="space-y-3">
              {todaySchedules.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="font-bold text-slate-800">
                    {item.subject_name || `Subject ${item.subject_id || ""}`}
                  </p>

                  <p className="text-sm text-slate-500">
                    Teacher: {item.teacher_name || "-"}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-blue-600">
                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
              No schedule today
            </p>
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
                Homework created in the last 24 hours
              </p>
            </div>
          </div>

          {recentHomework.length > 0 ? (
            <div className="space-y-3">
              {recentHomework.map((item) => {
                const submitted = submissions.find(
                  (submission) =>
                    Number(submission.homework_id) === Number(item.id),
                );

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800">
                          {item.title}
                        </p>

                        <p className="text-sm text-slate-500">
                          {item.subject_name || "-"} • {item.teacher_name || "-"}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-red-600">
                          Due: {item.due_date || "-"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          submitted
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {submitted ? submitted.status : "pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
              No recent homework
            </p>
          )}
        </section>
      </div>

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
              {rankMonthName} / Semester {rankSemester || "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoBox label="Total Score" value={`${totalScore} / ${totalMax}`} />
          <InfoBox label="Average" value={`${average}%`} />
          <InfoBox label="Rank" value={rank} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle = "",
  icon: Icon,
  color,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-xs font-medium text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`rounded-2xl p-4 ${color}`}>
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "-";

  const parts = String(value).split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : String(value);
}
