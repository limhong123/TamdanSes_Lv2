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
  return (
    months.find((m) => Number(m.value) === Number(month))?.label || "-"
  );
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
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState({
    semester: "1",
    month: "",
  });

  // Load all scores for selected semester
  // Then find which months really have score
  useEffect(() => {
    const loadSemesterMonths = async () => {
      setLoading(true);

      try {
        const res = await api.get("/scores/student/me", {
          params: {
            semester: filter.semester,
          },
        });

        const semesterScores = Array.isArray(res.data) ? res.data : [];

        const uniqueMonths = [
          ...new Set(
            semesterScores
              .map((item) => Number(item.month))
              .filter((month) => month >= 1 && month <= 12)
          ),
        ].sort((a, b) => a - b);

        const monthOptions = uniqueMonths.map((month) => ({
          value: String(month),
          label: getMonthName(month),
        }));

        setAvailableMonths(monthOptions);

        // Automatically select first month that has score
        if (monthOptions.length > 0) {
          const currentMonthExists = monthOptions.some(
            (m) => m.value === filter.month
          );

          if (!currentMonthExists) {
            setFilter((prev) => ({
              ...prev,
              month: monthOptions[0].value,
            }));
          }
        } else {
          setFilter((prev) => ({
            ...prev,
            month: "",
          }));

          setScores([]);
        }
      } catch (err) {
        setAvailableMonths([]);
        setScores([]);

        setFilter((prev) => ({
          ...prev,
          month: "",
        }));
      } finally {
        setLoading(false);
      }
    };

    loadSemesterMonths();
  }, [filter.semester]);

  // Load selected month's score
  useEffect(() => {
    if (!filter.month) {
      setScores([]);
      return;
    }

    const loadScores = async () => {
      setLoading(true);

      try {
        const res = await api.get("/scores/student/me", {
          params: {
            semester: filter.semester,
            month: filter.month,
          },
        });

        setScores(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setScores([]);
      } finally {
        setLoading(false);
      }
    };

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

  const totalSubjects = subjects.length;

  const average =
    totalSubjects > 0
      ? (totalScore / totalSubjects).toFixed(1)
      : 0;

  const grade =
    Number(average) >= 90
      ? "A"
      : Number(average) >= 80
      ? "B"
      : Number(average) >= 70
      ? "C"
      : Number(average) >= 60
      ? "D"
      : "F";

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <FileBarChart className="text-blue-600" />

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              My Result
            </h1>

            <p className="text-slate-500">
              {filter.month
                ? `Result for Semester ${filter.semester} / ${getMonthName(
                    filter.month
                  )}`
                : `No result for Semester ${filter.semester}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={filter.semester}
            onChange={(e) =>
              setFilter({
                semester: e.target.value,
                month: "",
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
            disabled={availableMonths.length === 0}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {availableMonths.length === 0 ? (
              <option value="">No score month</option>
            ) : (
              availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-200 text-yellow-700">
          <Award size={36} />
        </div>

        <p className="mb-6 text-center text-blue-100">
          {filter.month
            ? `Semester ${filter.semester} / ${getMonthName(filter.month)}`
            : `Semester ${filter.semester}`}
        </p>

        <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3">
          <div>
            <p className="text-blue-100">Total Score</p>

            <p className="mt-2 text-3xl font-bold">
              {totalScore}
            </p>
          </div>

          <div className="border-y border-white/30 py-4 md:border-x md:border-y-0 md:py-0">
            <p className="text-blue-100">Grade</p>

            <p className="mt-2 text-5xl font-bold">
              {totalSubjects > 0 ? grade : "-"}
            </p>
          </div>

          <div>
            <p className="text-blue-100">
              Average / Subject
            </p>

            <p className="mt-2 text-3xl font-bold">
              {average}
            </p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-slate-800">
        Subjects
      </h2>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
            Loading result...
          </div>
        ) : (
          <>
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

            {!loading && subjects.length === 0 && (
              <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
                No result for Semester {filter.semester}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}