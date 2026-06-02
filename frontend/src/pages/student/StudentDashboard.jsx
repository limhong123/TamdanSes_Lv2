import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  FileText,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentDashboard() {
  const [homework, setHomework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [scores, setScores] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const studentId =
    localStorage.getItem("student_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [homeworkRes, submissionsRes, scoresRes, schedulesRes] =
        await Promise.all([
          api.get(`/homework/student/${studentId}`),
          api.get(`/submissions/student/${studentId}`),
          api.get("/scores/student/me"),
          api.get("/schedules/student/me"),
        ]);

      setHomework(Array.isArray(homeworkRes.data) ? homeworkRes.data : []);
      setSubmissions(
        Array.isArray(submissionsRes.data) ? submissionsRes.data : []
      );
      setScores(Array.isArray(scoresRes.data) ? scoresRes.data : []);
      setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
    } catch (err) {
      console.log("STUDENT DASHBOARD ERROR:", err?.response?.data || err);
    }
  };

  const submittedCount = submissions.length;
  const pendingHomework = homework.length - submittedCount;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });

  const todaySchedules = schedules.filter((s) => s.day === today);

  const average =
    scores.length > 0
      ? (
          scores.reduce((sum, s) => sum + Number(s.total_score || 0), 0) /
          scores.length
        ).toFixed(1)
      : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Student Dashboard
        </h1>
        <p className="mt-2 text-slate-500">
          Welcome back. Track your homework, scores, and today classes.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">
        <StatCard
          title="Homework"
          value={homework.length}
          icon={BookOpen}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Submitted"
          value={submittedCount}
          icon={CheckCircle}
          color="bg-green-50 text-green-600"
        />

        <StatCard
          title="Pending"
          value={pendingHomework < 0 ? 0 : pendingHomework}
          icon={FileText}
          color="bg-yellow-50 text-yellow-600"
        />

        <StatCard
          title="Average"
          value={`${average}%`}
          icon={Trophy}
          color="bg-violet-50 text-violet-600"
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
                <div
                  key={s.id}
                  className="rounded-xl border bg-slate-50 p-4"
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
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              No schedule today
            </p>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <BookOpen className="text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">
              Recent Homework
            </h2>
          </div>

          {homework.length > 0 ? (
            <div className="space-y-3">
              {homework.slice(0, 5).map((h) => {
                const submitted = submissions.find(
                  (s) => s.homework_id === h.id
                );

                return (
                  <div
                    key={h.id}
                    className="rounded-xl border bg-slate-50 p-4"
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
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              No homework yet
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
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>
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