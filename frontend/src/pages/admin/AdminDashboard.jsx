import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Users,
  ArrowRight,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    events: 0,
  });

  const [classChartData, setClassChartData] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, eventsRes] =
        await Promise.all([
          api.get("/students/"),
          api.get("/teachers/"),
          api.get("/classes/"),
          api.get("/events/"),
        ]);

      const students = Array.isArray(studentsRes.data)
        ? studentsRes.data
        : [];

      const teachers = Array.isArray(teachersRes.data)
        ? teachersRes.data
        : [];

      const classes = Array.isArray(classesRes.data)
        ? classesRes.data
        : [];

      const events = Array.isArray(eventsRes.data)
        ? eventsRes.data
        : [];

      setCounts({
        students: students.length,
        teachers: teachers.length,
        classes: classes.length,
        events: events.length,
      });

      // =========================
      // Students By Class Chart
      // =========================
      const chartData = classes.map((classItem) => {
        const studentCount = students.filter(
          (student) =>
            student.class_id === classItem.id ||
            student.class === classItem.id ||
            student.class?.id === classItem.id
        ).length;

        return {
          name:
            classItem.name ||
            classItem.class_name ||
            `Class ${classItem.id}`,
          students: studentCount,
        };
      });

      setClassChartData(chartData);
    } catch (err) {
      console.log(
        "ADMIN DASHBOARD ERROR:",
        err?.response?.data || err
      );
    }
  };

  const cards = [
    {
      title: "Students",
      value: counts.students,
      icon: Users,
      to: "/admin/students",
      color: "from-blue-600 to-blue-400",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      title: "Teachers",
      value: counts.teachers,
      icon: GraduationCap,
      to: "/admin/teachers",
      color: "from-violet-600 to-violet-400",
      bg: "bg-violet-50",
      text: "text-violet-600",
    },
    {
      title: "Classes",
      value: counts.classes,
      icon: BookOpen,
      to: "/admin/classes",
      color: "from-emerald-600 to-emerald-400",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      title: "Events",
      value: counts.events,
      icon: CalendarDays,
      to: "/admin/events",
      color: "from-orange-600 to-orange-400",
      bg: "bg-orange-50",
      text: "text-orange-600",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold md:text-4xl">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-blue-50">
          Manage students, teachers, classes, schedules,
          and school events.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              to={card.to}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`h-2 bg-gradient-to-r ${card.color}`}
              />

              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Total {card.title}
                    </p>

                    <h2 className="mt-3 text-5xl font-bold text-slate-900">
                      {card.value}
                    </h2>
                  </div>

                  <div
                    className={`rounded-2xl ${card.bg} p-4 ${card.text}`}
                  >
                    <Icon size={30} />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm font-semibold text-slate-500">
                    View {card.title}
                  </span>

                  <ArrowRight
                    size={18}
                    className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600"
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions + Chart */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="text-xl font-bold text-slate-800">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Frequently used actions
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <QuickLink
              to="/admin/students"
              label="Manage Students"
            />

            <QuickLink
              to="/admin/teachers"
              label="Manage Teachers"
            />

            <QuickLink
              to="/admin/classes"
              label="Manage Classes"
            />

            <QuickLink
              to="/admin/events"
              label="Manage Events"
            />
          </div>
        </div>

        {/* Students By Class Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Students by Class
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Number of students in each class
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Users size={24} />
            </div>
          </div>

          <div className="mt-6 h-[320px] w-full">
            {classChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classChartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    cursor={{
                      fill: "#f1f5f9",
                    }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      boxShadow:
                        "0 10px 25px rgba(0,0,0,0.08)",
                    }}
                  />

                  <Bar
                    dataKey="students"
                    fill="#2563eb"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={55}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                No class data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
    >
      <span>{label}</span>

      <ArrowRight
        size={18}
        className="transition group-hover:translate-x-1"
      />
    </Link>
  );
}