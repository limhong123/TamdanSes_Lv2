import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherSchedules() {
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    api
      .get("/schedules/teacher/me")
      .then((res) => setSchedules(res.data))
      .catch(() => setSchedules([]));
  }, []);

  const times = useMemo(() => {
    const list = schedules.map((s) => `${s.start_time} - ${s.end_time}`);
    return [...new Set(list)].sort();
  }, [schedules]);

  const getItem = (day, time) => {
    return schedules.find(
      (s) => s.day === day && `${s.start_time} - ${s.end_time}` === time
    );
  };

  return (
    <Timetable
      title="My Teaching Schedule"
      subtitle="View your assigned classes and subjects"
      schedules={schedules}
      times={times}
      getItem={getItem}
      showTeacher={false}
    />
  );
}

function Timetable({ title, subtitle, schedules, times, getItem, showTeacher }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <CalendarDays className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-blue-600 px-6 py-5 text-center">
          <h2 className="text-2xl font-bold text-white">Weekly Timetable</h2>
          <p className="mt-1 text-sm text-blue-100">
            {schedules.length} assigned schedule(s)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="bg-cyan-100 text-slate-800">
                <th className="w-44 p-4 text-left">Time</th>
                {days.map((day) => (
                  <th key={day} className="p-4 text-center">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {times.map((time) => (
                <tr key={time} className="border-t">
                  <td className="bg-cyan-50 p-4 font-bold text-slate-700">
                    {time}
                  </td>

                  {days.map((day) => {
                    const item = getItem(day, time);

                    return (
                      <td key={day} className="border-l p-3 align-top">
                        {item ? (
                          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center shadow-sm">
                            <p className="font-bold text-blue-700">
                              {item.subject_name}
                            </p>

                            <p className="mt-1 text-slate-700">
                              {item.class_name}
                            </p>

                            {showTeacher && (
                              <p className="mt-1 text-xs text-slate-500">
                                Teacher: {item.teacher_name}
                              </p>
                            )}

                            
                          </div>
                        ) : (
                          <div className="flex min-h-24 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {times.length === 0 && (
                <tr>
                  <td colSpan={days.length + 1} className="p-8 text-center text-slate-500">
                    No schedule assigned yet
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