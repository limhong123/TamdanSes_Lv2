import {
  BookOpen,
  CalendarDays,
  FlaskConical,
  Globe,
  Languages,
  Sigma,
  Microscope,
  Atom,
  Map,
  Landmark,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",];

const colors = {
  Khmer: "bg-violet-100 text-violet-700",
  Math: "bg-green-100 text-green-700",
  English: "bg-yellow-100 text-yellow-700",
  Biology: "bg-emerald-100 text-emerald-700",
  Physical: "bg-blue-100 text-blue-700",
  Chemical: "bg-orange-100 text-orange-700",
  Social: "bg-pink-100 text-pink-700",
  History: "bg-amber-100 text-amber-700",
  "Earth Science": "bg-cyan-100 text-cyan-700",
  Geography: "bg-teal-100 text-teal-700",
};

const icons = {
  Khmer: Languages,
  Math: Sigma,
  English: BookOpen,
  Biology: FlaskConical,
  Physical: Atom,
  Chemical: Microscope,
  Social: Map,
  History: Landmark,
  "Earth Science": Globe,
  Geography: Map,
};

export default function StudentSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState("Monday");

  useEffect(() => {
    api
      .get("/schedules/student/me")
      .then((res) => setSchedules(res.data))
      .catch(() => setSchedules([]));
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((s) => s.day === selectedDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [schedules, selectedDay]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <CalendarDays className="text-blue-600" size={30} />

        <div>
          <h1 className="text-4xl font-bold text-slate-800">
            My Schedule
          </h1>

          <p className="mt-2 text-lg text-slate-500">
            Here is your weekly class schedule. Stay organized and don’t miss your classes.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-wrap gap-3">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`min-w-[120px] rounded-2xl border px-5 py-4 text-center transition ${
                selectedDay === day
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <p className="font-bold">
                {day.slice(0, 3)}
              </p>

              <p className="mt-1 text-sm opacity-80">
                {day}
              </p>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-5 text-left">Time</th>
                <th className="p-5 text-left">Subject</th>
                <th className="p-5 text-left">Teacher</th>
              </tr>
            </thead>

            <tbody>
              {filteredSchedules.map((s) => {
                const color =
                  colors[s.subject_name] ||
                  "bg-slate-100 text-slate-700";

                const Icon =
                  icons[s.subject_name] || BookOpen;

                return (
                  <tr
                    key={s.id}
                    className="border-t"
                  >
                    <td className="p-5 font-medium text-slate-600">
                      {s.start_time} - {s.end_time}
                    </td>

                    <td className="p-5">
                      <div
                        className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 ${color}`}
                      >
                        <Icon size={18} />

                        <span className="font-bold">
                          {s.subject_name}
                        </span>
                      </div>
                    </td>

                    <td className="p-5 text-slate-700">
                      {s.teacher_name}
                    </td>

                    
                  </tr>
                );
              })}

              {filteredSchedules.length === 0 && (
                <tr>
                  <td
                    colSpan="3"
                    className="p-10 text-center text-slate-400"
                  >
                    No schedule for {selectedDay}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}