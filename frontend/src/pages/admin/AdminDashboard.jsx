import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  GraduationCap,
  UserPlus,
  Users,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [studentsRes, teachersRes, classesRes, eventsRes] =
        await Promise.all([
          api.get("/students/"),
          api.get("/teachers/"),
          api.get("/classes/"),
          api.get("/events/"),
        ]);

      setStudents(
        Array.isArray(studentsRes.data) ? studentsRes.data : []
      );

      setTeachers(
        Array.isArray(teachersRes.data) ? teachersRes.data : []
      );

      setClasses(
        Array.isArray(classesRes.data) ? classesRes.data : []
      );

      setEvents(
        Array.isArray(eventsRes.data) ? eventsRes.data : []
      );
    } catch (err) {
      console.log(
        "ADMIN DASHBOARD ERROR:",
        err?.response?.data || err
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // TOTAL COUNTS
  // =========================================

  const counts = {
    students: students.length,
    teachers: teachers.length,
    classes: classes.length,
    events: events.length,
  };

  // =========================================
  // STUDENTS BY CLASS
  // =========================================

  const classChartData = useMemo(() => {
    return classes.map((classItem) => {
      const studentCount = students.filter((student) => {
        const studentClassId =
          student.class_id ??
          student.classroom_id ??
          student.class?.id ??
          student.classroom?.id;

        return Number(studentClassId) === Number(classItem.id);
      }).length;

      let className =
        classItem.class_name ||
        classItem.name ||
        classItem.title ||
        classItem.grade_name;

      if (classItem.grade && classItem.section) {
        className = `${classItem.grade}${classItem.section}`;
      } else if (classItem.grade) {
        className = `${classItem.grade}`;
      }

      return {
        name: className || `Class ${classItem.id}`,
        students: studentCount,
      };
    });
  }, [classes, students]);

  // =========================================
  // STUDENT GENDER DISTRIBUTION
  // =========================================

  const genderData = useMemo(() => {
    const boys = students.filter((student) => {
      const gender = String(
        student.gender || student.sex || ""
      ).toLowerCase();

      return (
        gender === "male" ||
        gender === "m" ||
        gender === "boy"
      );
    }).length;

    const girls = students.filter((student) => {
      const gender = String(
        student.gender || student.sex || ""
      ).toLowerCase();

      return (
        gender === "female" ||
        gender === "f" ||
        gender === "girl"
      );
    }).length;

    return [
      {
        name: "Boys",
        value: boys,
      },
      {
        name: "Girls",
        value: girls,
      },
    ];
  }, [students]);

  // =========================================
  // UPCOMING EVENTS
  // =========================================

  const upcomingEvents = useMemo(() => {
    const today = new Date();

    return [...events]
      .filter((event) => {
        const eventDate =
          event.date ||
          event.event_date ||
          event.start_date ||
          event.start;

        if (!eventDate) return false;

        return new Date(eventDate) >= today;
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.date ||
            a.event_date ||
            a.start_date ||
            a.start
        );

        const dateB = new Date(
          b.date ||
            b.event_date ||
            b.start_date ||
            b.start
        );

        return dateA - dateB;
      })
      .slice(0, 3);
  }, [events]);

  // =========================================
  // SUMMARY CARDS
  // =========================================

  const cards = [
    {
      title: "Students",
      value: counts.students,
      icon: Users,
      to: "/admin/students",
      color: "from-blue-600 to-blue-400",
      bg: "bg-blue-50",
      text: "text-blue-600",
      subtitle: "Registered students",
    },
    {
      title: "Teachers",
      value: counts.teachers,
      icon: GraduationCap,
      to: "/admin/teachers",
      color: "from-violet-600 to-violet-400",
      bg: "bg-violet-50",
      text: "text-violet-600",
      subtitle: "School teachers",
    },
    {
      title: "Classes",
      value: counts.classes,
      icon: BookOpen,
      to: "/admin/classes",
      color: "from-emerald-600 to-emerald-400",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      subtitle: "Active classes",
    },
    {
      title: "Events",
      value: counts.events,
      icon: CalendarDays,
      to: "/admin/events",
      color: "from-orange-600 to-orange-400",
      bg: "bg-orange-50",
      text: "text-orange-600",
      subtitle: `${upcomingEvents.length} upcoming`,
    },
  ];

  return (
    <div className="pb-10">
      {/* =========================================
          HEADER
      ========================================== */}

      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 p-7 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-blue-50 md:text-base">
              Manage students, teachers, classes, schedules,
              and school events.
            </p>
          </div>

          <div className="flex w-fit items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <CalendarDays size={21} />

            <span className="text-sm font-semibold">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================
          SUMMARY CARDS
      ========================================== */}

      <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              to={card.to}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`h-1.5 bg-gradient-to-r ${card.color}`}
              />

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Total {card.title}
                    </p>

                    <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                      {loading ? "..." : card.value}
                    </h2>
                  </div>

                  <div
                    className={`rounded-2xl ${card.bg} p-4 ${card.text}`}
                  >
                    <Icon size={28} />
                  </div>
                </div>

                <p className="mt-3 text-xs font-medium text-slate-400">
                  {card.subtitle}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm font-semibold text-slate-500 transition group-hover:text-blue-600">
                    View {card.title}
                  </span>

                  <ArrowRight
                    size={18}
                    className="text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-blue-600"
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* =========================================
          CHARTS
      ========================================== */}

      <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* =========================================
            STUDENTS BY CLASS
        ========================================== */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2 md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Students by Class
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Number of students in each class
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                Total Students
              </p>

              <p className="mt-1 text-right text-xl font-bold text-blue-700">
                {counts.students}
              </p>
            </div>
          </div>

          <div className="mt-7 h-[340px] w-full">
            {classChartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={classChartData}
                  margin={{
                    top: 25,
                    right: 10,
                    left: -20,
                    bottom: 5,
                  }}
                  barCategoryGap="30%"
                >
                  <defs>
                    <linearGradient
                      id="studentGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4f46e5"
                      />

                      <stop
                        offset="100%"
                        stopColor="#3b82f6"
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                    tick={{
                      fill: "#64748b",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    content={<ClassTooltip />}
                    cursor={{
                      fill: "#f8fafc",
                    }}
                  />

                  <Bar
                    dataKey="students"
                    fill="url(#studentGradient)"
                    radius={[10, 10, 3, 3]}
                    maxBarSize={58}
                    animationDuration={1000}
                  >
                    <LabelList
                      dataKey="students"
                      position="top"
                      fill="#334155"
                      fontSize={12}
                      fontWeight={700}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        {/* =========================================
            STUDENT DISTRIBUTION
        ========================================== */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Student Distribution
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              By Gender
            </p>
          </div>

          <div className="relative mt-3 h-[265px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ec4899" />
                </Pie>

                <Tooltip
                  content={<GenderTooltip />}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-slate-900">
                {counts.students}
              </span>

              <span className="mt-1 text-sm font-medium text-slate-500">
                Students
              </span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-4">
            <GenderStat
              label="Boys"
              value={genderData[0]?.value || 0}
              total={counts.students}
              dotClass="bg-blue-500"
            />

            <GenderStat
              label="Girls"
              value={genderData[1]?.value || 0}
              total={counts.students}
              dotClass="bg-pink-500"
            />
          </div>
        </div>
      </div>

      {/* =========================================
          QUICK ACTIONS + UPCOMING EVENTS
      ========================================== */}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Quick Actions */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Frequently used actions
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <QuickAction
              to="/admin/students"
              label="Add Student"
              icon={UserPlus}
              iconColor="text-blue-600"
              bg="bg-blue-50"
            />

            <QuickAction
              to="/admin/teachers"
              label="Add Teacher"
              icon={GraduationCap}
              iconColor="text-violet-600"
              bg="bg-violet-50"
            />

            <QuickAction
              to="/admin/classes"
              label="Create Class"
              icon={BookOpen}
              iconColor="text-emerald-600"
              bg="bg-emerald-50"
            />

            <QuickAction
              to="/admin/events"
              label="Create Event"
              icon={CalendarPlus}
              iconColor="text-orange-600"
              bg="bg-orange-50"
            />

            <QuickAction
              to="/admin/schedules"
              label="Add Schedule"
              icon={CalendarDays}
              iconColor="text-cyan-600"
              bg="bg-cyan-50"
            />

            <QuickAction
              to="/admin/rank-students"
              label="View Reports"
              icon={BarChart3}
              iconColor="text-pink-600"
              bg="bg-pink-50"
            />
          </div>
        </div>

        {/* Upcoming Events */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Upcoming Events
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Next school activities
              </p>
            </div>

            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
              <CalendarDays size={22} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                />
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-5 text-center">
                <CalendarDays
                  size={30}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-2 text-sm font-medium text-slate-500">
                  No upcoming events
                </p>
              </div>
            )}
          </div>

          <Link
            to="/admin/events"
            className="group mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-blue-600"
          >
            View All Events

            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

// =========================================
// QUICK ACTION
// =========================================

function QuickAction({
  to,
  label,
  icon: Icon,
  iconColor,
  bg,
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[125px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-md"
    >
      <div
        className={`rounded-2xl ${bg} p-3 ${iconColor}`}
      >
        <Icon size={25} />
      </div>

      <span className="mt-3 text-sm font-semibold text-slate-700 transition group-hover:text-blue-600">
        {label}
      </span>
    </Link>
  );
}

// =========================================
// EVENT ITEM
// =========================================

function EventItem({ event }) {
  const title =
    event.title ||
    event.name ||
    event.event_name ||
    "School Event";

  const dateValue =
    event.date ||
    event.event_date ||
    event.start_date ||
    event.start;

  let formattedDate = "No date";

  if (dateValue) {
    formattedDate = new Date(
      dateValue
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-slate-100">
      <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
        <CalendarDays size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {formattedDate}
        </p>
      </div>
    </div>
  );
}

// =========================================
// GENDER STAT
// =========================================

function GenderStat({
  label,
  value,
  total,
  dotClass,
}) {
  const percentage =
    total > 0
      ? ((value / total) * 100).toFixed(1)
      : 0;

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${dotClass}`}
        />

        <span className="text-sm font-semibold text-slate-600">
          {label}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-xl font-bold text-slate-900">
          {value}
        </span>

        <span className="mb-0.5 text-xs text-slate-400">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// =========================================
// CLASS TOOLTIP
// =========================================

function ClassTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="font-semibold text-slate-800">
        Class {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />

        <span className="text-sm text-slate-500">
          Students
        </span>

        <span className="ml-2 font-bold text-slate-900">
          {payload[0].value}
        </span>
      </div>
    </div>
  );
}

// =========================================
// GENDER TOOLTIP
// =========================================

function GenderTooltip({
  active,
  payload,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-slate-700">
        {data.name}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {data.value}
      </p>
    </div>
  );
}

// =========================================
// EMPTY CHART
// =========================================

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="rounded-full bg-slate-100 p-4 text-slate-400">
        <BarChart3 size={30} />
      </div>

      <p className="mt-3 font-medium text-slate-500">
        No class data available
      </p>

      <p className="mt-1 text-sm text-slate-400">
        Student statistics will appear here.
      </p>
    </div>
  );
}