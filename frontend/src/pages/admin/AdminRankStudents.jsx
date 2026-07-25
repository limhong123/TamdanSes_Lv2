import {
  Award,
  BarChart3,
  CalendarDays,
  GraduationCap,
  Search,
  Trophy,
  UserRound,
} from "lucide-react";
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
      .then((res) => {
        setClasses(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setClasses([]);
      });
  }, []);

  useEffect(() => {
    loadAvailableMonths();
  }, [filter.class_id, filter.semester]);

  useEffect(() => {
    if (filter.class_id && filter.month) {
      loadRanking();
    } else {
      setRanking([]);
    }
  }, [filter.class_id, filter.semester, filter.month]);

  const loadAvailableMonths = async () => {
    setAvailableMonths([]);
    setRanking([]);

    if (!filter.class_id) {
      setFilter((prev) => ({
        ...prev,
        month: "",
      }));

      return;
    }

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
        month:
          months.length > 0
            ? String(months[months.length - 1].month)
            : "",
      }));
    } catch (error) {
      console.error(
        "LOAD RANKING MONTHS ERROR:",
        error?.response?.data || error
      );

      setAvailableMonths([]);

      setFilter((prev) => ({
        ...prev,
        month: "",
      }));
    }
  };

  const loadRanking = async () => {
    if (!filter.class_id || !filter.month) {
      setRanking([]);
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
    } catch (error) {
      console.error(
        "LOAD RANKING ERROR:",
        error?.response?.data || error
      );

      alert(error?.response?.data?.detail || "Cannot load ranking");
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find(
    (item) => Number(item.id) === Number(filter.class_id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-8 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/20 p-4">
            <Award size={34} />
          </div>

          <div>
            <h1 className="text-3xl font-bold">Student Ranking</h1>

            <p className="mt-2 text-blue-100">
              View student ranking by class, semester and exam month.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Search size={22} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Filter Ranking
            </h2>

            <p className="text-sm text-slate-500">
              Choose the class and exam information.
            </p>
          </div>
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
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Select Class</option>

              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.section}
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
                setFilter((prev) => ({
                  ...prev,
                  semester: e.target.value,
                  month: "",
                }))
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                setFilter((prev) => ({
                  ...prev,
                  month: e.target.value,
                }))
              }
              disabled={
                !filter.class_id || availableMonths.length === 0
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {availableMonths.length === 0 ? (
                <option value="">No exam month</option>
              ) : (
                availableMonths.map((item) => (
                  <option key={item.month} value={item.month}>
                    {monthNames[item.month]}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard
          title="Selected Class"
          value={
            selectedClass
              ? `${selectedClass.name} ${
                  selectedClass.section || ""
                }`
              : "-"
          }
          icon={GraduationCap}
          color="bg-blue-50 text-blue-600"
        />

        <SummaryCard
          title="Exam Month"
          value={
            filter.month ? monthNames[Number(filter.month)] : "-"
          }
          icon={CalendarDays}
          color="bg-violet-50 text-violet-600"
        />

        <SummaryCard
          title="Students"
          value={ranking.length}
          icon={BarChart3}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Ranking Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Trophy size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Ranking Results
              </h2>

              <p className="text-sm text-slate-500">
                Students are ordered by their total score.
              </p>
            </div>
          </div>

          {ranking.length > 0 && (
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              {ranking.length} students
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4 text-center">Total Score</th>
                <th className="px-6 py-4 text-center">Average</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-16 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

                      <p className="font-medium text-slate-500">
                        Loading ranking...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : ranking.length > 0 ? (
                ranking.map((item, index) => (
                  <tr
                    key={item.student_id}
                    className="transition hover:bg-blue-50/40"
                  >
                    <td className="px-6 py-5">
                      <RankBadge rank={item.rank || index + 1} />
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                        {item.student_code || "-"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <UserRound size={21} />
                        </div>

                        <div>
                          <p className="font-bold text-slate-800">
                            {item.student_name || "-"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Student
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="capitalize text-slate-600">
                        {item.gender || "-"}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex min-w-20 justify-center rounded-xl bg-blue-50 px-4 py-2 font-bold text-blue-700">
                        {formatNumber(item.total_score)}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex min-w-20 justify-center rounded-xl bg-emerald-50 px-4 py-2 font-bold text-emerald-700">
                        {formatNumber(item.average)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 rounded-full bg-slate-100 p-5 text-slate-400">
                        <BarChart3 size={34} />
                      </div>

                      <h3 className="text-lg font-bold text-slate-700">
                        No ranking data
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Select a class, semester and completed exam
                        month to view student ranking.
                      </p>
                    </div>
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

function RankBadge({ rank }) {
  const rankNumber = Number(rank);

  let style = "border-slate-200 bg-slate-50 text-slate-700";

  if (rankNumber === 1) {
    style = "border-amber-200 bg-amber-50 text-amber-700";
  } else if (rankNumber === 2) {
    style = "border-indigo-200 bg-indigo-50 text-indigo-700";
  } else if (rankNumber === 3) {
    style = "border-orange-200 bg-orange-50 text-orange-700";
  }

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-extrabold ${style}`}
    >
      {rankNumber}
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className={`rounded-2xl p-4 ${color}`}>
          <Icon size={26} />
        </div>
      </div>
    </div>
  );
}

function formatNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return 0;
  }

  return Number.isInteger(number)
    ? number
    : Number(number.toFixed(2));
}