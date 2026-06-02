import { Bell, BookOpen, CalendarCheck, CalendarDays, FileText, GraduationCap, Home, LogOut, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link2 } from "lucide-react";
import { Award } from "lucide-react";
const links = {
  admin: [
    ["Dashboard", "/admin", Home],
    ["Students", "/admin/students", Users],
    ["Teachers", "/admin/teachers", GraduationCap],
    ["Classes", "/admin/classes", BookOpen],
    ["Subjects", "/admin/subjects", FileText],
    ["Class Teachers", "/admin/class-teachers", Link2],
    ["Schedules", "/admin/schedules", CalendarDays],
    ["Events", "/admin/events", CalendarDays],
    ["Holidays", "/admin/holidays", CalendarCheck],
    ["Notifications", "/admin/notifications", Bell],
    ["Profile", "/admin/profile", Users],
  ],
  student: [
    ["Dashboard", "/student", Home],
    ["Attendance", "/student/attendance", CalendarCheck],
    ["Result", "/student/result", Award],
    ["Homework", "/student/homework", BookOpen],
    ["Scores", "/student/scores", FileText],
    ["Schedules", "/student/schedules", CalendarDays],
    ["Profile", "/student/profile", Users],
    ["Notifications", "/student/notifications", Bell],
  ],
  teacher: [
    ["Dashboard", "/teacher", Home],
    ["My Classes", "/teacher/classes", BookOpen],
    ["Attendance", "/teacher/attendance", CalendarCheck],
    ["Homework", "/teacher/homework", BookOpen],
    ["Scores", "/teacher/scores", FileText],
    ["Schedules", "/teacher/schedules", CalendarDays],
    ["Notifications", "/teacher/notifications", Bell],
    ["Profile", "/teacher/profile", Users],
  ],
};

export default function Sidebar({ role = "admin" }) {
  const { logout } = useAuth();
  const menu = links[role] || links.admin;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <GraduationCap className="text-blue-600" />
        <span className="font-bold text-slate-800">TAM DAN SES</span>
      </div>
      <nav className="space-y-1 p-4">
        {menu.map(([label, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end={path === `/${role}`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
        <button onClick={logout} className="mt-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <LogOut size={19} />
          Logout
        </button>
      </nav>
    </aside>
  );
}
