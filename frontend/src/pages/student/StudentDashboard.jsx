import {
  Award,
  BookOpen,
  CalendarDays,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

export default function StudentDashboard() {
  const [homework, setHomework] = useState([]);
  const [scores, setScores] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [rank, setRank] = useState("-");

  const studentId =
    localStorage.getItem("student_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [
        homeworkRes,
        scoresRes,
        schedulesRes,
        attendanceRes,
        rankRes,
      ] = await Promise.all([
        api.get(`/homework/student/${studentId}`),
        api.get("/scores/student/me"),
        api.get("/schedules/student/me"),
        api.get("/attendance/me"),
        api.get("/scores/student/rank"),
      ]);

      setHomework(Array.isArray(homeworkRes.data) ? homeworkRes.data : []);
      setScores(Array.isArray(scoresRes.data) ? scoresRes.data : []);
      setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
      setAttendance(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
      setRank(rankRes.data?.rank || "-");
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

const absentCount = attendance.filter((a) => {
  const status = String(a.status || "").trim().toLowerCase();

  return status === "a" || status === "absent";
}).length;
  const average =
    scores.length > 0
      ? (
        scores.reduce((sum, s) => sum + Number(s.total_score || 0), 0) /
        scores.length
      ).toFixed(1)
      : 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });
const presentCount = attendance.filter((a) => {
  const status = String(a.status || "").trim().toLowerCase();

  return status === "p" || status === "present";
}).length;

const permissionCount = attendance.filter((a) => {
  const status = String(a.status || "").trim().toLowerCase();

  return status === "l" || status === "permission";
}).length;
  const todaySchedules = schedules.filter((s) => s.day === today);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Student Dashboard
        </h1>

        <p className="mt-2 text-slate-500">
          Welcome back. Track your homework, rank, attendance, and scores.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">
        <StatCard
  title="Rank"
  value={rank}
  icon={Award}
  color="bg-green-50 text-green-600"
/>

<StatCard
  title="Absent"
  value={absentCount}
  icon={CalendarDays}
  color="bg-red-50 text-red-600"
/>

<StatCard
  title="Present"
  value={presentCount}
  icon={CalendarDays}
  color="bg-blue-50 text-blue-600"
/>

<StatCard
  title="Permission"
  value={permissionCount}
  icon={BookOpen}
  color="bg-yellow-50 text-yellow-600"
/>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">
              Today Schedule
            </h2>
          </div>

          {todaySchedules.length > 0 ? (
            <div className="space-y-3">
              {todaySchedules.map((s) => (
                <div key={s.id} className="rounded-xl border bg-slate-50 p-4">
                  <p className="font-bold text-slate-800">{s.subject_name}</p>
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
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              No schedule today
            </p>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <BookOpen className="text-blue-600" />

            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Recent Homework
              </h2>
              <p className="text-sm text-slate-500">
                Only homework created in the last 24 hours
              </p>
            </div>
          </div>

          {recentHomework.length > 0 ? (
            <div className="space-y-3">
              {recentHomework.map((h) => (
                <div key={h.id} className="rounded-xl border bg-slate-50 p-4">
                  <p className="font-bold text-slate-800">{h.title}</p>

                  <p className="text-sm text-slate-500">
                    {h.subject_name} • {h.teacher_name}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-red-600">
                    Due: {h.due_date}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              No recent homework in the last 24 hours
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h2 className="mt-3 text-4xl font-bold text-slate-800">
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