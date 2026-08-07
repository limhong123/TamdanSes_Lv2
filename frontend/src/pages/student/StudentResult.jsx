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
  const [view, setView] = useState("monthly");

  const [scores, setScores] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);

  const [semesterResult, setSemesterResult] = useState(null);
  const [yearResult, setYearResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState({
    semester: "1",
    month: "",
  });

  // =========================================================
  // LOAD MONTHS THAT HAVE MONTHLY SCORE
  // =========================================================

  useEffect(() => {
    const loadAvailableMonths = async () => {
      try {
        setLoading(true);

        const res = await api.get("/scores/student/me", {
          params: {
            semester: Number(filter.semester),
            score_type: "monthly",
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

        if (monthOptions.length === 0) {
          setFilter((prev) => ({
            ...prev,
            month: "",
          }));

          setScores([]);
          return;
        }

        const currentExists = monthOptions.some(
          (m) => m.value === filter.month
        );

        if (!currentExists) {
          setFilter((prev) => ({
            ...prev,
            month: monthOptions[0].value,
          }));
        }
      } catch {
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

    loadAvailableMonths();
  }, [filter.semester]);

  // =========================================================
  // LOAD MONTHLY SCORE
  // =========================================================

  useEffect(() => {
    if (view !== "monthly") return;

    if (!filter.month) {
      setScores([]);
      return;
    }

    const loadMonthlyScores = async () => {
      try {
        setLoading(true);

        const res = await api.get("/scores/student/me", {
          params: {
            semester: Number(filter.semester),
            month: Number(filter.month),
            score_type: "monthly",
          },
        });

        setScores(Array.isArray(res.data) ? res.data : []);
      } catch {
        setScores([]);
      } finally {
        setLoading(false);
      }
    };

    loadMonthlyScores();
  }, [view, filter.semester, filter.month]);

  // =========================================================
  // LOAD SEMESTER RESULT
  // =========================================================

  useEffect(() => {
    if (view !== "semester") return;

    const loadSemesterResult = async () => {
      try {
        setLoading(true);

        const res = await api.get(
          "/scores/student/semester-result",
          {
            params: {
              semester: Number(filter.semester),
            },
          }
        );

        setSemesterResult(res.data || null);
      } catch {
        setSemesterResult(null);
      } finally {
        setLoading(false);
      }
    };

    loadSemesterResult();
  }, [view, filter.semester]);

  // =========================================================
  // LOAD YEAR RESULT
  // =========================================================

  useEffect(() => {
    if (view !== "yearly") return;

    const loadYearResult = async () => {
      try {
        setLoading(true);

        const res = await api.get("/scores/student/year-result");

        setYearResult(res.data || null);
      } catch {
        setYearResult(null);
      } finally {
        setLoading(false);
      }
    };

    loadYearResult();
  }, [view]);

  // =========================================================
  // MONTHLY SUBJECT GROUP
  // =========================================================

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

      map[key].total += Number(
        s.total_score || s.score || 0
      );

      map[key].max += Number(
        s.max_score || 100
      );

      map[key].scores.push(s);
    });

    return Object.values(map);
  }, [scores]);

  const totalScore = subjects.reduce(
    (sum, s) => sum + Number(s.total || 0),
    0
  );

  const totalSubjects = subjects.length;

  const monthlyAverage =
    totalSubjects > 0
      ? (totalScore / totalSubjects).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FileBarChart size={25} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              My Result
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View monthly, semester and yearly results
            </p>
          </div>
        </div>

        {(view === "monthly" || view === "semester") && (
          <select
            value={filter.semester}
            onChange={(e) =>
              setFilter({
                semester: e.target.value,
                month: "",
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600"
          >
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
        )}
      </div>

      {/* =====================================================
          TABS
      ====================================================== */}

      <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setView("monthly")}
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
            view === "monthly"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-white"
          }`}
        >
          Monthly
        </button>

        <button
          type="button"
          onClick={() => setView("semester")}
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
            view === "semester"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-white"
          }`}
        >
          Semester
        </button>

        <button
          type="button"
          onClick={() => setView("yearly")}
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
            view === "yearly"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-white"
          }`}
        >
          Yearly
        </button>
      </div>

      {/* =====================================================
          MONTHLY VIEW
      ====================================================== */}

      {view === "monthly" && (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Month
            </label>

            <select
              value={filter.month}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  month: e.target.value,
                })
              }
              disabled={availableMonths.length === 0}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {availableMonths.length === 0 ? (
                <option value="">No score month</option>
              ) : (
                availableMonths.map((month) => (
                  <option
                    key={month.value}
                    value={month.value}
                  >
                    {month.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-200 text-yellow-700">
              <Award size={36} />
            </div>

            <p className="mb-6 text-center text-blue-100">
              Semester {filter.semester}
              {filter.month
                ? ` / ${getMonthName(filter.month)}`
                : ""}
            </p>

            <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3">
              <div>
                <p className="text-blue-100">
                  Total Score
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalScore}
                </p>
              </div>

              <div className="border-y border-white/30 py-4 md:border-x md:border-y-0 md:py-0">
                <p className="text-blue-100">
                  Average / Subject
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {monthlyAverage}
                </p>
              </div>

              <div>
                <p className="text-blue-100">
                  Total Subjects
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalSubjects}
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-800">
            Subjects
          </h2>

          {loading ? (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              Loading result...
            </div>
          ) : (
            <div className="space-y-4">
              {subjects.map((item) => {
                const style =
                  subjectStyles[item.subject] || {
                    icon: BookOpen,
                    color:
                      "bg-slate-100 text-slate-700",
                    bar: "bg-slate-500",
                  };

                const Icon = style.icon;

                const percent = item.max
                  ? Math.round(
                      (item.total / item.max) * 100
                    )
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
                        <div className="flex items-center justify-between gap-3">
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
                            style={{
                              width: `${percent}%`,
                            }}
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

              {!loading &&
                subjects.length === 0 && (
                  <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
                    No monthly result
                  </div>
                )}
            </div>
          )}
        </>
      )}

      {/* =====================================================
          SEMESTER VIEW
      ====================================================== */}

      {view === "semester" && (
        <>
          {loading ? (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              Loading semester result...
            </div>
          ) : semesterResult ? (
            <>
              <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white shadow-lg">
                <div className="text-center">
                  <p className="text-indigo-100">
                    Semester {semesterResult.semester}
                  </p>

                  <p className="mt-3 text-5xl font-bold">
                    {Number(
                      semesterResult.average || 0
                    ).toFixed(2)}
                  </p>

                  <p className="mt-2 text-indigo-100">
                    Semester Average
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-4 text-left">
                        Subject
                      </th>

                      <th className="p-4 text-center">
                        Monthly Average
                      </th>

                      <th className="p-4 text-center">
                        Semester Exam
                      </th>

                      <th className="p-4 text-center">
                        Semester Result
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.isArray(
                      semesterResult.subjects
                    ) &&
                      semesterResult.subjects.map(
                        (item) => (
                          <tr
                            key={item.subject_id}
                            className="border-t"
                          >
                            <td className="p-4 font-bold text-slate-800">
                              {item.subject_name}
                            </td>

                            <td className="p-4 text-center">
                              {Number(
                                item.monthly_average || 0
                              ).toFixed(2)}
                            </td>

                            <td className="p-4 text-center">
                              {Number(
                                item.exam_score || 0
                              ).toFixed(2)}
                            </td>

                            <td className="p-4 text-center font-bold text-blue-600">
                              {Number(
                                item.semester_result || 0
                              ).toFixed(2)}
                            </td>
                          </tr>
                        )
                      )}

                    {(!semesterResult.subjects ||
                      semesterResult.subjects
                        .length === 0) && (
                      <tr>
                        <td
                          colSpan="4"
                          className="p-8 text-center text-slate-500"
                        >
                          No semester result
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              No semester result
            </div>
          )}
        </>
      )}

      {/* =====================================================
          YEARLY VIEW
      ====================================================== */}

      {view === "yearly" && (
        <>
          {loading ? (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              Loading yearly result...
            </div>
          ) : yearResult ? (
            <>
              <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-500 p-8 text-white shadow-lg">
                <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-2">
                  <div>
                    <p className="text-emerald-100">
                      Final Average
                    </p>

                    <p className="mt-2 text-5xl font-bold">
                      {Number(
                        yearResult.final_average || 0
                      ).toFixed(2)}
                    </p>
                  </div>

                  <div className="border-t border-white/30 pt-5 md:border-l md:border-t-0 md:pt-0">
                    <p className="text-emerald-100">
                      Status
                    </p>

                    <p className="mt-2 text-4xl font-bold">
                      {yearResult.status || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-4 text-left">
                        Subject
                      </th>

                      <th className="p-4 text-center">
                        Semester 1
                      </th>

                      <th className="p-4 text-center">
                        Semester 2
                      </th>

                      <th className="p-4 text-center">
                        Final Result
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.isArray(yearResult.subjects) &&
                      yearResult.subjects.map(
                        (item) => (
                          <tr
                            key={item.subject_id}
                            className="border-t"
                          >
                            <td className="p-4 font-bold text-slate-800">
                              {item.subject_name}
                            </td>

                            <td className="p-4 text-center">
                              {item.semester_1 !== null &&
                              item.semester_1 !== undefined
                                ? Number(
                                    item.semester_1
                                  ).toFixed(2)
                                : "-"}
                            </td>

                            <td className="p-4 text-center">
                              {item.semester_2 !== null &&
                              item.semester_2 !== undefined
                                ? Number(
                                    item.semester_2
                                  ).toFixed(2)
                                : "-"}
                            </td>

                            <td className="p-4 text-center font-bold text-emerald-600">
                              {Number(
                                item.final_result || 0
                              ).toFixed(2)}
                            </td>
                          </tr>
                        )
                      )}

                    {(!yearResult.subjects ||
                      yearResult.subjects.length ===
                        0) && (
                      <tr>
                        <td
                          colSpan="4"
                          className="p-8 text-center text-slate-500"
                        >
                          No yearly result
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              No yearly result
            </div>
          )}
        </>
      )}
    </div>
  );
}