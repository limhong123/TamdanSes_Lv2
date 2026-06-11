import {
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

export default function TeacherDashboard() {
  const [classes, setClasses] = useState([]);
  const [homework, setHomework] = useState([]);
  const [scores, setScores] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [classRes, homeworkRes, scoreRes, scheduleRes] =
        await Promise.all([
          api.get("/classes/teacher/my-classes"),
          api.get(`/homework/teacher/${teacherId}`),
          api.get("/scores/"),
          api.get("/schedules/teacher/me"),
        ]);

      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
      setHomework(Array.isArray(homeworkRes.data) ? homeworkRes.data : []);
      setScores(Array.isArray(scoreRes.data) ? scoreRes.data : []);
      setSchedules(Array.isArray(scheduleRes.data) ? scheduleRes.data : []);
    } catch (err) {
      console.log("DASHBOARD ERROR:", err?.response?.data || err);
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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });

  const todaySchedules = schedules.filter((s) => s.day === today);

  return (
    <div>
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-8 text-white shadow-sm">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <p className="mt-2 text-blue-100">
          Welcome back. Here is your teaching summary.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">
        <StatCard
          title="My Classes"
          value={classes.length}
          icon={GraduationCap}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Homework"
          value={homework.length}
          icon={BookOpen}
          color="bg-violet-50 text-violet-600"
        />

        <StatCard
          title="Scores"
          value={scores.length}
          icon={FileText}
          color="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Schedules"
          value={schedules.length}
          icon={CalendarDays}
          color="bg-orange-50 text-orange-600"
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
                    Class: {s.class_name}
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
                Only homework created in the last 24 hours
              </p>
            </div>
          </div>

          {recentHomework.length > 0 ? (
            <div className="space-y-3">
              {recentHomework.map((h) => (
                <div
                  key={h.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="font-bold text-slate-800">
                    {h.title}
                  </p>

                  <p className="text-sm text-slate-500">
                    {h.class_name} • {h.subject_name}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-red-600">
                    Due: {h.due_date}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-slate-900">
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