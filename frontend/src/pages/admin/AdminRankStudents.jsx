import { Award, BarChart3, CalendarDays, GraduationCap, Search } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

const monthNames = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

export default function AdminRankStudents() {
  const [classes, setClasses] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState({
    class_id: "",
    semester: "1",
    month: "",
  });

  useEffect(() => {
    api
      .get("/classes/")
      .then((res) => setClasses(Array.isArray(res.data) ? res.data : []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    loadAvailableMonths();
  }, [filter.class_id, filter.semester]);

  const loadAvailableMonths = async () => {
    setAvailableMonths([]);
    setRanking([]);

    if (!filter.class_id) return;

    try {
      const res = await api.get("/scores/ranking-months", {
        params: {
          class_id: filter.class_id,
          semester: filter.semester,
        },
      });

      const months = Array.isArray(res.data) ? res.data : [];
      setAvailableMonths(months);

      setFilter((prev) => ({
        ...prev,
        month: months.length > 0 ? String(months[months.length - 1].month) : "",
      }));
    } catch {
      setAvailableMonths([]);
    }
  };

  const loadRanking = async () => {
    if (!filter.class_id) {
      alert("Please select class");
      return;
    }

    if (!filter.month) {
      alert("No exam month found for this class");
      return;
    }

    setLoading(true);

    try {
      const res = await api.get("/scores/ranking", {
        params: {
          class_id: filter.class_id,
          semester: filter.semester,
          month: filter.month,
        },
      });

      setRanking(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      alert(err?.response?.data?.detail || "Cannot load ranking");
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
  if (filter.class_id && filter.month) {
    loadRanking();
  } else {
    setRanking([]);
  }
}, [filter.class_id, filter.semester, filter.month]);

  const selectedClass = classes.find(
    (c) => Number(c.id) === Number(filter.class_id)
  );

  return (
    <div>
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-8 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/20 p-4">
            <Award size={34} />
          </div>

          <div>
            <h1 className="text-3xl font-bold">Student Ranking</h1>
            <p className="mt-2 text-blue-100">
              View student rank by class and completed exam month.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Search className="text-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">Filter Ranking</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Class
            </label>
            <select
              value={filter.class_id}
              onChange={(e) =>
                setFilter({
                  class_id: e.target.value,
                  semester: "1",
                  month: "",
                })
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Semester
            </label>
            <select
              value={filter.semester}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  semester: e.target.value,
                  month: "",
                })
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Exam Month
            </label>
            <select
              value={filter.month}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  month: e.target.value,
                })
              }
              disabled={!filter.class_id || availableMonths.length === 0}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 disabled:bg-slate-100"
            >
              {availableMonths.length === 0 ? (
                <option value="">No exam month</option>
              ) : (
                availableMonths.map((m) => (
                  <option key={m.month} value={m.month}>
                    {monthNames[m.month]}
                  </option>
                ))
              )}
            </select>
          </div>

          
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard
          title="Selected Class"
          value={
            selectedClass
              ? `${selectedClass.name} ${selectedClass.section || ""}`
              : "-"
          }
          icon={GraduationCap}
          color="bg-blue-50 text-blue-600"
        />

        <SummaryCard
          title="Exam Month"
          value={filter.month ? monthNames[filter.month] : "-"}
          icon={CalendarDays}
          color="bg-violet-50 text-violet-600"
        />

        <SummaryCard
          title="Students"
          value={ranking.length}
          icon={BarChart3}
          color="bg-green-50 text-green-600"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="p-4 text-left">Rank</th>
              <th className="p-4 text-left">Student ID</th>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Gender</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Average</th>
            </tr>
          </thead>

          <tbody>
            {ranking.map((r) => (
              <tr key={r.student_id} className="border-t hover:bg-slate-50">
                <td className="p-4 text-xl font-bold">
                  {r.rank === 1
                    ? "🥇"
                    : r.rank === 2
                    ? "🥈"
                    : r.rank === 3
                    ? "🥉"
                    : `${r.rank}`}
                </td>

                <td className="p-4">{r.student_code}</td>
                <td className="p-4 font-semibold text-slate-800">
                  {r.student_name}
                </td>
                <td className="p-4">{r.gender || "-"}</td>

                <td className="p-4 font-bold text-blue-600">
  {r.total_score} 
</td>

<td className="p-4 font-bold text-green-600">
  {r.average}
</td>
              </tr>
            ))}

            {ranking.length === 0 && (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-500">
                  Select class and completed exam month to view ranking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>

        <div className={`rounded-2xl p-4 ${color}`}>
          <Icon size={26} />
        </div>
      </div>
    </div>
  );
}