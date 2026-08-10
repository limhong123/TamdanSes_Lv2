import {
  Award,
  BookOpen,
  FileBarChart,
  FlaskConical,
  Globe,
  Languages,
  Sigma,
  Trophy,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../api/axios";


// ============================================================
// MONTHS
// ============================================================

const months = [
  {
    value: "1",
    label: "January",
  },
  {
    value: "2",
    label: "February",
  },
  {
    value: "3",
    label: "March",
  },
  {
    value: "4",
    label: "April",
  },
  {
    value: "5",
    label: "May",
  },
  {
    value: "6",
    label: "June",
  },
  {
    value: "7",
    label: "July",
  },
  {
    value: "8",
    label: "August",
  },
  {
    value: "9",
    label: "September",
  },
  {
    value: "10",
    label: "October",
  },
  {
    value: "11",
    label: "November",
  },
  {
    value: "12",
    label: "December",
  },
];


const getMonthName = (month) => {
  return (
    months.find(
      (item) =>
        Number(item.value) ===
        Number(month)
    )?.label || "-"
  );
};


// ============================================================
// SUBJECT STYLE
// ============================================================

const subjectStyles = {
  Khmer: {
    icon: Languages,
    color:
      "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
  },

  Math: {
    icon: Sigma,
    color:
      "bg-green-100 text-green-700",
    bar: "bg-green-500",
  },

  Mathematics: {
    icon: Sigma,
    color:
      "bg-green-100 text-green-700",
    bar: "bg-green-500",
  },

  English: {
    icon: BookOpen,
    color:
      "bg-red-100 text-red-700",
    bar: "bg-red-500",
  },

  Science: {
    icon: FlaskConical,
    color:
      "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
  },

  Biology: {
    icon: FlaskConical,
    color:
      "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  },

  Physics: {
    icon: FlaskConical,
    color:
      "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
  },

  Chemistry: {
    icon: FlaskConical,
    color:
      "bg-purple-100 text-purple-700",
    bar: "bg-purple-500",
  },

  Social: {
    icon: Globe,
    color:
      "bg-pink-100 text-pink-700",
    bar: "bg-pink-500",
  },

  "Social Studies": {
    icon: Globe,
    color:
      "bg-pink-100 text-pink-700",
    bar: "bg-pink-500",
  },
};


// ============================================================
// STUDENT RESULT
// ============================================================

export default function StudentResult() {
  // =========================================================
  // VIEW
  // =========================================================

  const [
    view,
    setView,
  ] = useState(
    "monthly"
  );


  // =========================================================
  // DATA
  // =========================================================

  const [
    scores,
    setScores,
  ] = useState([]);

  const [
    availableMonths,
    setAvailableMonths,
  ] = useState([]);

  const [
    semesterResult,
    setSemesterResult,
  ] = useState(null);

  const [
    monthlyRank,
    setMonthlyRank,
  ] = useState(null);

  const [
    semesterRank,
    setSemesterRank,
  ] = useState(null);

  const [
    semesterMonthRanks,
    setSemesterMonthRanks,
  ] = useState({});

  const [
    yearResult,
    setYearResult,
  ] = useState(null);

  const [
    yearRank,
    setYearRank,
  ] = useState(null);


  // =========================================================
  // LOADING
  // =========================================================

  const [
    loading,
    setLoading,
  ] = useState(false);


  // =========================================================
  // FILTER
  // =========================================================

  const [
    filter,
    setFilter,
  ] = useState({
    semester: "1",
    month: "",
  });


  // =========================================================
  // LOAD AVAILABLE MONTHS
  // =========================================================

  useEffect(() => {
    const loadAvailableMonths =
      async () => {
        try {
          setLoading(true);

          const res =
            await api.get(
              "/scores/student/me",
              {
                params: {
                  semester:
                    Number(
                      filter.semester
                    ),

                  score_type:
                    "monthly",
                },
              }
            );

          const semesterScores =
            Array.isArray(
              res.data
            )
              ? res.data
              : [];

          // Only valid months 1 - 12
          const uniqueMonths = [
            ...new Set(
              semesterScores
                .map(
                  (item) =>
                    Number(
                      item.month
                    )
                )
                .filter(
                  (month) =>
                    month >= 1 &&
                    month <= 12
                )
            ),
          ].sort(
            (a, b) =>
              a - b
          );

          const monthOptions =
            uniqueMonths.map(
              (month) => ({
                value:
                  String(
                    month
                  ),

                label:
                  getMonthName(
                    month
                  ),
              })
            );

          setAvailableMonths(
            monthOptions
          );

          if (
            monthOptions.length ===
            0
          ) {
            setFilter(
              (prev) => ({
                ...prev,
                month: "",
              })
            );

            setScores([]);

            return;
          }

          const currentExists =
            monthOptions.some(
              (item) =>
                item.value ===
                filter.month
            );

          if (!currentExists) {
            setFilter(
              (prev) => ({
                ...prev,

                month:
                  monthOptions[
                    monthOptions.length -
                      1
                  ].value,
              })
            );
          }
        } catch (error) {
          console.error(
            "LOAD MONTHS ERROR:",
            error
          );

          setAvailableMonths(
            []
          );

          setScores([]);

          setFilter(
            (prev) => ({
              ...prev,
              month: "",
            })
          );
        } finally {
          setLoading(false);
        }
      };

    loadAvailableMonths();
  }, [filter.semester]);


  // =========================================================
  // LOAD MONTHLY SCORES + MONTHLY RANK
  // =========================================================

  useEffect(() => {
    if (
      view !== "monthly"
    ) {
      return;
    }

    if (!filter.month) {
      setScores([]);
      setMonthlyRank(null);
      return;
    }

    const loadMonthlyResult =
      async () => {
        try {
          setLoading(true);

          const [
            scoreResponse,
            rankResponse,
          ] = await Promise.all([
            api.get(
              "/scores/student/me",
              {
                params: {
                  semester:
                    Number(
                      filter.semester
                    ),

                  month:
                    Number(
                      filter.month
                    ),

                  score_type:
                    "monthly",
                },
              }
            ),

            api.get(
              "/scores/student/rank",
              {
                params: {
                  semester:
                    Number(
                      filter.semester
                    ),

                  month:
                    Number(
                      filter.month
                    ),
                },
              }
            ),
          ]);

          setScores(
            Array.isArray(
              scoreResponse.data
            )
              ? scoreResponse.data
              : []
          );

          setMonthlyRank(
            rankResponse.data ||
              null
          );
        } catch (error) {
          console.error(
            "LOAD MONTHLY RESULT ERROR:",
            error
          );

          setScores([]);
          setMonthlyRank(null);
        } finally {
          setLoading(false);
        }
      };

    loadMonthlyResult();
  }, [
    view,
    filter.semester,
    filter.month,
  ]);


  // =========================================================
  // LOAD SEMESTER RESULT + SEMESTER RANK + MONTH RANKS
  // =========================================================

  useEffect(() => {
    if (
      view !==
      "semester"
    ) {
      return;
    }

    const loadSemesterResult =
      async () => {
        try {
          setLoading(true);

          const [
            resultResponse,
            rankResponse,
          ] = await Promise.all([
            api.get(
              "/scores/student/semester-result",
              {
                params: {
                  semester:
                    Number(
                      filter.semester
                    ),
                },
              }
            ),

            api.get(
              "/scores/student/semester-rank",
              {
                params: {
                  semester:
                    Number(
                      filter.semester
                    ),
                },
              }
            ),
          ]);

          const result =
            resultResponse.data ||
            null;

          setSemesterResult(
            result
          );

          setSemesterRank(
            rankResponse.data ||
              null
          );

          const resultMonths =
            Array.isArray(
              result?.months
            )
              ? result.months
              : [];

          if (
            resultMonths.length ===
            0
          ) {
            setSemesterMonthRanks(
              {}
            );
            return;
          }

          const rankResponses =
            await Promise.all(
              resultMonths.map(
                (item) =>
                  api.get(
                    "/scores/student/rank",
                    {
                      params: {
                        semester:
                          Number(
                            filter.semester
                          ),

                        month:
                          Number(
                            item.month
                          ),
                      },
                    }
                  )
              )
            );

          const rankMap = {};

          resultMonths.forEach(
            (item, index) => {
              rankMap[item.month] =
                rankResponses[
                  index
                ]?.data ||
                null;
            }
          );

          setSemesterMonthRanks(
            rankMap
          );
        } catch (error) {
          console.error(
            "LOAD SEMESTER RESULT ERROR:",
            error
          );

          setSemesterResult(
            null
          );

          setSemesterRank(
            null
          );

          setSemesterMonthRanks(
            {}
          );
        } finally {
          setLoading(false);
        }
      };

    loadSemesterResult();
  }, [
    view,
    filter.semester,
  ]);


  // =========================================================
  // LOAD YEAR RESULT + YEAR RANK
  // =========================================================

  useEffect(() => {
    if (
      view !== "yearly"
    ) {
      return;
    }

    const loadYearResult =
      async () => {
        try {
          setLoading(true);

          const [
            yearResponse,
            rankResponse,
          ] =
            await Promise.all(
              [
                api.get(
                  "/scores/student/year-result"
                ),

                api.get(
                  "/scores/student/year-rank"
                ),
              ]
            );

          setYearResult(
            yearResponse.data ||
              null
          );

          setYearRank(
            rankResponse.data ||
              null
          );
        } catch (error) {
          console.error(
            "LOAD YEAR RESULT ERROR:",
            error
          );

          setYearResult(
            null
          );

          setYearRank(
            null
          );
        } finally {
          setLoading(false);
        }
      };

    loadYearResult();
  }, [view]);


  // =========================================================
  // GROUP MONTHLY SCORES BY SUBJECT
  // =========================================================

  const subjects =
    useMemo(() => {
      const map = {};

      scores.forEach(
        (score) => {
          const key =
            score.subject_name ||
            "Unknown";

          if (!map[key]) {
            map[key] = {
              subject: key,

              total: 0,

              max: 0,

              scores: [],
            };
          }

          map[key].total +=
            Number(
              score.total_score ??
                score.score ??
                0
            );

          map[key].max +=
            Number(
              score.max_score ??
                100
            );

          map[key].scores.push(
            score
          );
        }
      );

      return Object.values(
        map
      );
    }, [scores]);


  // =========================================================
  // MONTHLY SUMMARY
  // =========================================================

  const totalScore =
    subjects.reduce(
      (sum, subject) =>
        sum +
        Number(
          subject.total ||
            0
        ),
      0
    );

  const totalSubjects =
    subjects.length;

  const monthlyAverage =
    totalSubjects > 0
      ? (
          totalScore /
          totalSubjects
        ).toFixed(2)
      : "0.00";


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FileBarChart
              size={25}
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              My Result
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View monthly,
              semester and yearly
              results
            </p>
          </div>

        </div>


        {/* Semester select only monthly/semester */}

        {(
          view ===
            "monthly" ||
          view ===
            "semester"
        ) && (
          <select
            value={
              filter.semester
            }
            onChange={(
              event
            ) =>
              setFilter({
                semester:
                  event.target
                    .value,

                month: "",
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-600"
          >
            <option value="1">
              Semester 1
            </option>

            <option value="2">
              Semester 2
            </option>
          </select>
        )}

      </div>


      {/* =====================================================
          TABS
      ====================================================== */}

      <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">

        <button
          type="button"
          onClick={() =>
            setView(
              "monthly"
            )
          }
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
            view ===
            "monthly"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-white"
          }`}
        >
          Monthly
        </button>


        <button
          type="button"
          onClick={() =>
            setView(
              "semester"
            )
          }
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
            view ===
            "semester"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-white"
          }`}
        >
          Semester
        </button>


        <button
          type="button"
          onClick={() =>
            setView(
              "yearly"
            )
          }
          className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
            view ===
            "yearly"
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

      {view ===
        "monthly" && (
        <>

          {/* Month */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <label className="mb-2 block text-sm font-bold text-slate-600">
              Month
            </label>

            <select
              value={
                filter.month
              }
              onChange={(
                event
              ) =>
                setFilter({
                  ...filter,

                  month:
                    event.target
                      .value,
                })
              }
              disabled={
                availableMonths
                  .length === 0
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100"
            >

              {availableMonths
                .length ===
              0 ? (
                <option value="">
                  No score month
                </option>
              ) : (
                availableMonths.map(
                  (month) => (
                    <option
                      key={
                        month.value
                      }
                      value={
                        month.value
                      }
                    >
                      {
                        month.label
                      }
                    </option>
                  )
                )
              )}

            </select>

          </div>


          {/* Monthly Summary */}

          <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-200 text-yellow-700">
              <Award
                size={36}
              />
            </div>

            <p className="mb-6 text-center text-blue-100">
              Semester{" "}
              {
                filter.semester
              }

              {filter.month
                ? ` / ${getMonthName(
                    filter.month
                  )}`
                : ""}
            </p>


            <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-4">

              <div>
                <p className="text-blue-100">
                  Total Score
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {
                    totalScore
                  }
                </p>
              </div>


              <div className="border-y border-white/30 py-4 md:border-x md:border-y-0 md:py-0">

                <p className="text-blue-100">
                  Average /
                  Subject
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {
                    monthlyAverage
                  }
                </p>

              </div>


              <div>
                <p className="text-blue-100">
                  Total Subjects
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {
                    totalSubjects
                  }
                </p>
              </div>


              <div className="border-t border-white/30 pt-5 md:border-l md:border-t-0 md:pt-0">

                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <Trophy
                    size={21}
                  />
                </div>

                <p className="text-blue-100">
                  Monthly Rank
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {monthlyRank?.rank ??
                    "-"}
                </p>

                {Number(
                  monthlyRank?.total_students ||
                    0
                ) > 0 && (
                  <p className="mt-1 text-sm font-semibold text-blue-100">
                    {monthlyRank?.rank ??
                      "-"}{" "}
                    /{" "}
                    {
                      monthlyRank.total_students
                    }
                  </p>
                )}

              </div>

            </div>
          </div>


          <h2 className="text-xl font-bold text-slate-800">
            Subjects
          </h2>


          {/* Subjects */}

          {loading ? (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              Loading
              result...
            </div>
          ) : (
            <div className="space-y-4">

              {subjects.map(
                (item) => {
                  const style =
                    subjectStyles[
                      item.subject
                    ] || {
                      icon:
                        BookOpen,

                      color:
                        "bg-slate-100 text-slate-700",

                      bar:
                        "bg-slate-500",
                    };

                  const Icon =
                    style.icon;

                  const percent =
                    item.max
                      ? Math.round(
                          (
                            item.total /
                            item.max
                          ) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={
                        item.subject
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >

                      <div className="flex items-center gap-4">

                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${style.color}`}
                        >
                          <Icon
                            size={26}
                          />
                        </div>


                        <div className="min-w-0 flex-1">

                          <div className="flex items-center justify-between gap-3">

                            <div className="min-w-0">

                              <h3 className="truncate text-lg font-bold text-slate-800">
                                {
                                  item.subject
                                }
                              </h3>

                              <p className="text-sm text-slate-500">
                                {
                                  item
                                    .scores
                                    .length
                                }{" "}
                                score
                                record(s)
                              </p>

                            </div>


                            <p className="shrink-0 text-lg font-bold text-slate-900">
                              {Number(
                                item.total
                              ).toFixed(
                                0
                              )}
                              /
                              {Number(
                                item.max
                              ).toFixed(
                                0
                              )}
                            </p>

                          </div>


                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">

                            <div
                              className={`h-full rounded-full ${style.bar}`}
                              style={{
                                width: `${Math.min(
                                  percent,
                                  100
                                )}%`,
                              }}
                            />

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}


              {!loading &&
                subjects.length ===
                  0 && (
                  <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
                    No monthly
                    result
                  </div>
                )}

            </div>
          )}

        </>
      )}


      {/* =====================================================
          SEMESTER VIEW
      ====================================================== */}

      {view ===
        "semester" && (
        <>

          {loading ? (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              Loading semester
              result...
            </div>
          ) : semesterResult ? (
            <>

              {/* Semester summary */}

              <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white shadow-lg">

                <p className="mb-6 text-center text-indigo-100">
                  Semester{" "}
                  {
                    semesterResult.semester
                  }
                </p>


                <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-4">

                  <div>

                    <p className="text-indigo-100">
                      Monthly
                      Average
                    </p>

                    <p className="mt-2 text-4xl font-bold">
                      {Number(
                        semesterResult.monthly_average ||
                          0
                      ).toFixed(
                        2
                      )}
                    </p>

                  </div>


                  <div className="border-y border-white/30 py-4 md:border-x md:border-y-0 md:py-0">

                    <p className="text-indigo-100">
                      Semester Exam
                      Average
                    </p>

                    <p className="mt-2 text-4xl font-bold">

                      {semesterResult.exam_average !==
                        null &&
                      semesterResult.exam_average !==
                        undefined
                        ? Number(
                            semesterResult.exam_average
                          ).toFixed(
                            2
                          )
                        : "-"}

                    </p>

                  </div>


                  <div>

                    <p className="text-indigo-100">
                      Semester
                      Result
                    </p>

                    <p className="mt-2 text-4xl font-bold">

                      {semesterResult.semester_result !==
                        null &&
                      semesterResult.semester_result !==
                        undefined
                        ? Number(
                            semesterResult.semester_result
                          ).toFixed(
                            2
                          )
                        : "-"}

                    </p>

                  </div>




                  <div className="border-t border-white/30 pt-5 md:border-l md:border-t-0 md:pt-0">

                    <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                      <Trophy
                        size={23}
                      />
                    </div>

                    <p className="text-indigo-100">
                      Semester Rank
                    </p>

                    <p className="mt-2 text-4xl font-bold">
                      {semesterRank?.rank ??
                        "-"}
                    </p>

                    {Number(
                      semesterRank?.total_students ||
                        0
                    ) > 0 && (
                      <p className="mt-1 text-sm font-semibold text-indigo-100">
                        {semesterRank?.rank ??
                          "-"}{" "}
                        /{" "}
                        {
                          semesterRank.total_students
                        }
                      </p>
                    )}

                  </div>
                </div>

              </div>


              {/* Monthly results */}

              <div>

                <h2 className="mb-4 text-xl font-bold text-slate-800">
                  Monthly Results
                </h2>


                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                  <table className="w-full text-sm">

                    <thead className="bg-slate-100">
                      <tr>

                        <th className="p-4 text-left">
                          Month
                        </th>

                        <th className="p-4 text-center">
                          Total Score
                        </th>

                        <th className="p-4 text-center">
                          Subjects
                        </th>

                        <th className="p-4 text-center">
                          Average
                        </th>

                        <th className="p-4 text-center">
                          Rank
                        </th>

                      </tr>
                    </thead>


                    <tbody>

                      {Array.isArray(
                        semesterResult.months
                      ) &&
                        semesterResult.months.map(
                          (
                            item
                          ) => (
                            <tr
                              key={
                                item.month
                              }
                              className="border-t"
                            >

                              <td className="p-4 font-bold text-slate-800">
                                {getMonthName(
                                  item.month
                                )}
                              </td>

                              <td className="p-4 text-center">
                                {Number(
                                  item.total_score ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </td>

                              <td className="p-4 text-center">
                                {item.total_subjects ||
                                  0}
                              </td>

                              <td className="p-4 text-center font-bold text-blue-600">
                                {Number(
                                  item.average ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </td>

                              <td className="p-4 text-center">
                                <div className="inline-flex items-center gap-2 font-bold text-amber-600">
                                  <Trophy
                                    size={17}
                                  />

                                  <span>
                                    {semesterMonthRanks[
                                      item.month
                                    ]?.rank ??
                                      "-"}
                                  </span>

                                  {Number(
                                    semesterMonthRanks[
                                      item.month
                                    ]?.total_students ||
                                      0
                                  ) > 0 && (
                                    <span className="font-medium text-slate-400">
                                      /{" "}
                                      {
                                        semesterMonthRanks[
                                          item.month
                                        ]
                                          .total_students
                                      }
                                    </span>
                                  )}
                                </div>
                              </td>

                            </tr>
                          )
                        )}


                      {(
                        !semesterResult.months ||
                        semesterResult
                          .months
                          .length ===
                          0
                      ) && (
                        <tr>
                          <td
                            colSpan="5"
                            className="p-8 text-center text-slate-500"
                          >
                            No monthly
                            score for
                            Semester{" "}
                            {
                              filter.semester
                            }
                          </td>
                        </tr>
                      )}

                    </tbody>

                  </table>

                </div>

              </div>


              {!semesterResult.has_exam &&
                semesterResult
                  .months
                  ?.length >
                  0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                    Semester exam
                    score has not
                    been entered
                    yet. Semester
                    Result will be
                    available after
                    the exam score
                    is saved.
                  </div>
                )}

            </>
          ) : (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              No semester
              result
            </div>
          )}

        </>
      )}


      {/* =====================================================
          YEARLY VIEW
      ====================================================== */}

      {view ===
        "yearly" && (
        <>

          {loading ? (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              Loading yearly
              result...
            </div>
          ) : yearResult ? (
            <>

              {/* =============================================
                  FINAL AVERAGE + RANKING
              ============================================== */}

              <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-500 p-8 text-white shadow-lg">

                <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-2">

                  {/* Final Average */}

                  <div>

                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                      <Award
                        size={26}
                      />
                    </div>

                    <p className="text-emerald-100">
                      Final Average
                    </p>

                    <p className="mt-2 text-5xl font-bold">

                      {yearResult.final_average !==
                        null &&
                      yearResult.final_average !==
                        undefined
                        ? Number(
                            yearResult.final_average
                          ).toFixed(
                            2
                          )
                        : "-"}

                    </p>

                  </div>


                  {/* Ranking */}

                  <div className="border-t border-white/30 pt-5 md:border-l md:border-t-0 md:pt-0">

                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                      <Trophy
                        size={26}
                      />
                    </div>

                    <p className="text-emerald-100">
                      Ranking
                    </p>

                    <p className="mt-2 text-5xl font-bold">
                      {yearRank?.rank ??
                        "-"}
                    </p>


                    {Number(
                      yearRank?.total_students ||
                        0
                    ) > 0 && (
                      <p className="mt-2 text-sm font-semibold text-emerald-100">
                        {yearRank?.rank ??
                          "-"}{" "}
                        /{" "}
                        {
                          yearRank.total_students
                        }
                      </p>
                    )}

                  </div>

                </div>

              </div>


              {/* =============================================
                  SEMESTER RESULTS TABLE
              ============================================== */}

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                <table className="w-full text-sm">

                  <thead className="bg-slate-100">

                    <tr>

                      <th className="p-4 text-left">
                        Semester
                      </th>

                      <th className="p-4 text-center">
                        Monthly Average
                      </th>

                      <th className="p-4 text-center">
                        Exam Average
                      </th>

                      <th className="p-4 text-center">
                        Semester Result
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {Array.isArray(
                      yearResult.semesters
                    ) &&
                      yearResult.semesters.map(
                        (
                          item
                        ) => (
                          <tr
                            key={
                              item.semester
                            }
                            className="border-t"
                          >

                            <td className="p-4 font-bold text-slate-800">
                              Semester{" "}
                              {
                                item.semester
                              }
                            </td>


                            <td className="p-4 text-center">

                              {item.months
                                ?.length
                                ? Number(
                                    item.monthly_average ||
                                      0
                                  ).toFixed(
                                    2
                                  )
                                : "-"}

                            </td>


                            <td className="p-4 text-center">

                              {item.exam_average !==
                                null &&
                              item.exam_average !==
                                undefined
                                ? Number(
                                    item.exam_average
                                  ).toFixed(
                                    2
                                  )
                                : "-"}

                            </td>


                            <td className="p-4 text-center font-bold text-emerald-600">

                              {item.semester_result !==
                                null &&
                              item.semester_result !==
                                undefined
                                ? Number(
                                    item.semester_result
                                  ).toFixed(
                                    2
                                  )
                                : "-"}

                            </td>

                          </tr>
                        )
                      )}

                  </tbody>

                </table>

              </div>


              {/* =============================================
                  INCOMPLETE YEAR
              ============================================== */}

              {!yearResult.complete && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                  Final Year
                  Result and
                  Ranking will be
                  available after
                  Semester 1 and
                  Semester 2 are
                  both completed.
                </div>
              )}

            </>
          ) : (
            <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
              No yearly
              result
            </div>
          )}

        </>
      )}

    </div>
  );
}