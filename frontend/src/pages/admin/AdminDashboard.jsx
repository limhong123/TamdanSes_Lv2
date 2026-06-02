import { BookOpen, CalendarDays, GraduationCap, Users } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    events: 0,
  });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [studentsRes, teachersRes, classesRes, eventsRes] =
          await Promise.all([
            api.get("/students/"),
            api.get("/teachers/"),
            api.get("/classes/"),
            api.get("/events/"),
          ]);

        setCounts({
          students: studentsRes.data.length,
          teachers: teachersRes.data.length,
          classes: classesRes.data.length,
          events: eventsRes.data.length,
        });
      } catch (err) {
        console.log("DASHBOARD ERROR:", err);
      }
    };

    loadCounts();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card title="Students" value={counts.students} icon={Users} />
        <Card title="Teachers" value={counts.teachers} icon={GraduationCap} />
        <Card title="Classes" value={counts.classes} icon={BookOpen} />
        <Card title="Events" value={counts.events} icon={CalendarDays} />
      </div>
    </div>
  );
}

function Card({ title, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">{value}</h2>
      </div>

      <div className="rounded-2xl bg-blue-50 p-4">
        <Icon className="text-blue-600" size={28} />
      </div>
    </div>
  );
}