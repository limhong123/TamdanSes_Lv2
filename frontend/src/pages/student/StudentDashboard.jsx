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

export default function StudentDashboard() {
  const [homework, setHomework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [scores, setScores] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [rank, setRank] = useState("-");
  const [rankAverage, setRankAverage] = useState(0);

  const studentId =
    localStorage.getItem("student_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.getMonth() + 1;
  const lastSemester = lastMonth <= 6 ? 1 : 2;

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

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [
        homeworkRes,
        submissionsRes,
        scoresRes,
        schedulesRes,
        attendanceRes,
        rankRes,
      ] = await Promise.all([
        api.get(`/homework/student/${studentId}`),
        api.get(`/submissions/student/${studentId}`),
        api.get("/scores/student/me", {
          params: {
            semester: lastSemester,
            month: lastMonth,
          },
        }),
        api.get("/schedules/student/me"),
        api.get("/attendance/me"),
        api.get("/scores/student/rank", {
          params: {
            semester: lastSemester,
            month: lastMonth,
          },
        }),
      ]);

      setHomework(Array.isArray(homeworkRes.data) ? homeworkRes.data : []);
      setSubmissions(
        Array.isArray(submissionsRes.data) ? submissionsRes.data : []
      );
      setScores(Array.isArray(scoresRes.data) ? scoresRes.data : []);
      setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
      setAttendance(
        Array.isArray(attendanceRes.data) ? attendanceRes.data : []
      );

      setRank(
        rankRes.data?.rank
          ? `${rankRes.data.rank} / ${rankRes.data.total_students}`
          : "-"
      );

      setRankAverage(rankRes.data?.average || 0);
    } catch (err) {
      console.log("STUDENT DASHBOARD ERROR:", err?.response?.data || err);
    }
  };

  const recentHomework = useMemo(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return homework
      .filter((h) => {
        if (!h.created_at) return false;
        return new Date(h.created_at) >= oneDayAgo;
      })
      .slice(0, 5);
  }, [homework]);

  const submittedCount = submissions.length;
  const pendingHomework = Math.max(homework.length - submittedCount, 0);

  const presentCount = attendance.filter((a) => {
    const status = String(a.status || "").trim().toLowerCase();
    return status === "p" || status === "present";
  }).length;

  const absentCount = attendance.filter((a) => {
    const status = String(a.status || "").trim().toLowerCase();
    return status === "a" || status === "absent";
  }).length;

  const permissionCount = attendance.filter((a) => {
    const status = String(a.status || "").trim().toLowerCase();
    return status === "l" || status === "permission";
  }).length;

  const totalScore = scores.reduce(
    (sum, s) => sum + Number(s.total_score || 0),
    0
  );

  const totalMax = scores.reduce(
    (sum, s) => sum + Number(s.max_score || 0),
    0
  );

  const average =
    totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });

  const todaySchedules = schedules.filter((s) => s.day === today);

  return (
    <div>
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-8 text-white shadow-sm">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>

        <p className="mt-2 text-blue-100">
          Track your homework, rank, attendance, and scores.
        </p>

        <p className="mt-4 text-sm font-semibold text-blue-100">
          Showing rank for {monthNames[lastMonth]} / Semester {lastSemester}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">
        <StatCard
          title="Last Month Rank"
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
              {todaySchedules.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="font-bold text-slate-800">
                    {s.subject_name}
                  </p>

                  <p className="text-sm text-slate-500">
                    Teacher: {s.teacher_name}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-blue-600">
                    {s.start_time} - {s.end_time}
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
              {recentHomework.map((h) => {
                const submitted = submissions.find(
                  (s) => Number(s.homework_id) === Number(h.id)
                );

                return (
                  <div
                    key={h.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800">
                          {h.title}
                        </p>

                        <p className="text-sm text-slate-500">
                          {h.subject_name} • {h.teacher_name}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-red-600">
                          Due: {h.due_date}
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
              Last Month Result
            </h2>

            <p className="text-sm text-slate-500">
              {monthNames[lastMonth]} / Semester {lastSemester}
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

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </h2>
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