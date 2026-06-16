import {
  Award,
  BookOpen,
  FileBarChart,
  FlaskConical,
  Globe,
  Languages,
  Sigma,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const getMonthName = (month) => {
  return months.find((m) => Number(m.value) === Number(month))?.label || "-";
};

const subjectStyles = {
  Khmer: {
    icon: Languages,
    color: "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
  },
  Math: {
    icon: Sigma,
    color: "bg-green-100 text-green-700",
    bar: "bg-green-500",
  },
  Mathematics: {
    icon: Sigma,
    color: "bg-green-100 text-green-700",
    bar: "bg-green-500",
  },
  English: {
    icon: BookOpen,
    color: "bg-red-100 text-red-700",
    bar: "bg-red-500",
  },
  Science: {
    icon: FlaskConical,
    color: "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
  },
  Biology: {
    icon: BookOpen,
    color: "bg-slate-100 text-slate-700",
    bar: "bg-slate-500",
  },
  Physics: {
    icon: FlaskConical,
    color: "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
  },
  Chemistry: {
    icon: FlaskConical,
    color: "bg-purple-100 text-purple-700",
    bar: "bg-purple-500",
  },
  Social: {
    icon: Globe,
    color: "bg-pink-100 text-pink-700",
    bar: "bg-pink-500",
  },
  "Social Studies": {
    icon: Globe,
    color: "bg-pink-100 text-pink-700",
    bar: "bg-pink-500",
  },
};

export default function StudentResult() {
  const [scores, setScores] = useState([]);
  const [filter, setFilter] = useState({
    semester: "1",
    month: String(new Date().getMonth() + 1),
  });

  const loadScores = async () => {
    try {
      const res = await api.get("/scores/student/me", {
        params: {
          semester: filter.semester,
          month: filter.month,
        },
      });

      setScores(Array.isArray(res.data) ? res.data : []);
    } catch {
      setScores([]);
    }
  };

  useEffect(() => {
    loadScores();
  }, [filter.semester, filter.month]);

  const subjects = useMemo(() => {
    const map = {};

    scores.forEach((s) => {
      const key = s.subject_name || "Unknown";

      if (!map[key]) {
        map[key] = {
          subject: key,
          total: 0,
          max: 0,
          scores: [],
        };
      }

      map[key].total += Number(s.total_score || s.score || 0);
      map[key].max += Number(s.max_score || 100);
      map[key].scores.push(s);
    });

    return Object.values(map);
  }, [scores]);

  const totalScore = subjects.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  );

  const totalMax = subjects.reduce(
    (sum, s) => sum + Number(s.max || 0),
    0
  );

  const average =
    totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0;

  const grade =
    average >= 90
      ? "A"
      : average >= 80
      ? "B"
      : average >= 70
      ? "C"
      : average >= 60
      ? "D"
      : "F";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <FileBarChart className="text-blue-600" size={30} />

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              My Result
            </h1>

            <p className="text-slate-500">
              Result for Semester {filter.semester} / {getMonthName(filter.month)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={filter.semester}
            onChange={(e) =>
              setFilter({
                ...filter,
                semester: e.target.value,
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
          >
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>

          <select
            value={filter.month}
            onChange={(e) =>
              setFilter({
                ...filter,
                month: e.target.value,
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-200 text-yellow-700">
          <Award size={36} />
        </div>

        <p className="mb-6 text-center text-blue-100">
          Semester {filter.semester} / {getMonthName(filter.month)}
        </p>

        <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3">
          <div>
            <p className="text-blue-100">Total Score</p>

            <p className="mt-2 text-3xl font-bold">
              {totalScore}
              <span className="text-lg text-blue-100">
                {" "}
                / {totalMax}
              </span>
            </p>
          </div>

          <div className="border-y border-white/30 py-4 md:border-x md:border-y-0 md:py-0">
            <p className="text-blue-100">Grade</p>

            <p className="mt-2 text-5xl font-bold">{grade}</p>
          </div>

          <div>
            <p className="text-blue-100">Average</p>

            <p className="mt-2 text-3xl font-bold">
              {average}%
            </p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-slate-800">
        Subjects
      </h2>

      <div className="space-y-4">
        {subjects.map((item) => {
          const style =
            subjectStyles[item.subject] || {
              icon: BookOpen,
              color: "bg-slate-100 text-slate-700",
              bar: "bg-slate-500",
            };

          const Icon = style.icon;

          const percent = item.max
            ? Math.round((item.total / item.max) * 100)
            : 0;

          return (
            <div
              key={item.subject}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${style.color}`}
                >
                  <Icon size={26} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {item.subject}
                      </h3>

                      <p className="text-sm text-slate-500">
                        {item.scores.length} score record(s)
                      </p>
                    </div>

                    <p className="text-xl font-bold text-slate-900">
                      {item.total}/{item.max}
                    </p>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${style.bar}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {percent}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {subjects.length === 0 && (
          <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
            No result for Semester {filter.semester} /{" "}
            {getMonthName(filter.month)}
          </div>
        )}
      </div>
    </div>
  );
}