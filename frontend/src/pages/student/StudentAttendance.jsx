import {
  CalendarCheck,
  Filter,
  RotateCcw,
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

const MONTHS = [
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


// ============================================================
// COMPONENT
// ============================================================

export default function StudentAttendance() {
  // =========================================================
  // STATE
  // =========================================================

  const [
    records,
    setRecords,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState("");

  const [
    selectedYear,
    setSelectedYear,
  ] = useState("");


  // =========================================================
  // LOAD ATTENDANCE
  // =========================================================

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true);

        const res =
          await api.get(
            "/attendance/me"
          );

        const data =
          Array.isArray(
            res.data
          )
            ? res.data
            : [];

        setRecords(data);
      } catch (error) {
        console.error(
          "LOAD ATTENDANCE ERROR:",
          error
        );

        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, []);


  // =========================================================
  // STATUS LABEL
  // =========================================================

  const getStatusLabel = (
    status
  ) => {
    const s = String(
      status || ""
    )
      .trim()
      .toLowerCase();

    if (
      s === "p" ||
      s === "present"
    ) {
      return "Present";
    }

    if (
      s === "a" ||
      s === "absent"
    ) {
      return "Absent";
    }

    if (
      s === "l" ||
      s === "permission"
    ) {
      return "Permission";
    }

    if (
      s === "e" ||
      s === "excused"
    ) {
      return "Excused";
    }

    return "-";
  };


  // =========================================================
  // STATUS COLOR
  // =========================================================

  const getStatusClass = (
    status
  ) => {
    const label =
      getStatusLabel(status);

    if (
      label === "Present"
    ) {
      return (
        "bg-green-100 " +
        "text-green-700"
      );
    }

    if (
      label === "Absent"
    ) {
      return (
        "bg-red-100 " +
        "text-red-700"
      );
    }

    if (
      label === "Permission"
    ) {
      return (
        "bg-yellow-100 " +
        "text-yellow-700"
      );
    }

    if (
      label === "Excused"
    ) {
      return (
        "bg-blue-100 " +
        "text-blue-700"
      );
    }

    return (
      "bg-slate-100 " +
      "text-slate-700"
    );
  };


  // =========================================================
  // AVAILABLE YEARS
  // =========================================================

  const availableYears =
    useMemo(() => {
      const years =
        records
          .map(
            (record) => {
              if (
                !record.date
              ) {
                return null;
              }

              const date =
                new Date(
                  record.date
                );

              if (
                Number.isNaN(
                  date.getTime()
                )
              ) {
                return null;
              }

              return date
                .getFullYear();
            }
          )
          .filter(
            (year) =>
              year !== null
          );

      return [
        ...new Set(
          years
        ),
      ].sort(
        (a, b) =>
          b - a
      );
    }, [records]);


  // =========================================================
  // AVAILABLE MONTHS
  //
  // Only show months that actually have attendance.
  // If year selected, show months from that year.
  // =========================================================

  const availableMonths =
    useMemo(() => {
      const monthNumbers =
        records
          .filter(
            (record) => {
              if (
                !record.date
              ) {
                return false;
              }

              const date =
                new Date(
                  record.date
                );

              if (
                Number.isNaN(
                  date.getTime()
                )
              ) {
                return false;
              }

              if (
                selectedYear &&
                date
                  .getFullYear()
                  .toString() !==
                  selectedYear
              ) {
                return false;
              }

              return true;
            }
          )
          .map(
            (record) => {
              const date =
                new Date(
                  record.date
                );

              return (
                date.getMonth() +
                1
              );
            }
          );

      return [
        ...new Set(
          monthNumbers
        ),
      ].sort(
        (a, b) =>
          a - b
      );
    }, [
      records,
      selectedYear,
    ]);


  // =========================================================
  // FILTERED ATTENDANCE
  // =========================================================

  const filteredRecords =
    useMemo(() => {
      return records.filter(
        (record) => {
          if (
            !record.date
          ) {
            return false;
          }

          const date =
            new Date(
              record.date
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return false;
          }

          const month =
            date.getMonth() +
            1;

          const year =
            date.getFullYear();

          const matchMonth =
            selectedMonth
              ? month.toString() ===
                selectedMonth
              : true;

          const matchYear =
            selectedYear
              ? year.toString() ===
                selectedYear
              : true;

          return (
            matchMonth &&
            matchYear
          );
        }
      );
    }, [
      records,
      selectedMonth,
      selectedYear,
    ]);


  // =========================================================
  // SORT NEWEST FIRST
  // =========================================================

  const sortedRecords =
    useMemo(() => {
      return [
        ...filteredRecords,
      ].sort(
        (a, b) =>
          new Date(
            b.date
          ).getTime() -
          new Date(
            a.date
          ).getTime()
      );
    }, [filteredRecords]);


  // =========================================================
  // SUMMARY
  // =========================================================

  const summary =
    useMemo(() => {
      let present = 0;
      let absent = 0;
      let permission = 0;

      filteredRecords.forEach(
        (record) => {
          const label =
            getStatusLabel(
              record.status
            );

          if (
            label ===
            "Present"
          ) {
            present += 1;
          }

          if (
            label ===
            "Absent"
          ) {
            absent += 1;
          }

          if (
            label ===
            "Permission"
          ) {
            permission += 1;
          }
        }
      );

      return {
        total:
          filteredRecords.length,

        present,

        absent,

        permission,
      };
    }, [filteredRecords]);


  // =========================================================
  // RESET FILTER
  // =========================================================

  const resetFilter = () => {
    setSelectedMonth("");
    setSelectedYear("");
  };


  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (
    value
  ) => {
    if (!value) {
      return "";
    }

    // 07:00:00 -> 07:00
    return String(value).slice(
      0,
      5
    );
  };


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <CalendarCheck
            size={25}
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            My Attendance
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View your attendance
            history by month
          </p>
        </div>

      </div>


      {/* =====================================================
          FILTER
      ====================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-4 flex items-center gap-2">

          <Filter
            size={20}
            className="text-blue-600"
          />

          <h2 className="font-bold text-slate-800">
            Attendance History
          </h2>

        </div>


        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Year */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Year
            </label>

            <select
              value={
                selectedYear
              }
              onChange={(
                event
              ) => {
                setSelectedYear(
                  event.target.value
                );

                setSelectedMonth(
                  ""
                );
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-600"
            >

              <option value="">
                All years
              </option>

              {availableYears.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}

            </select>
          </div>


          {/* Month */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Month
            </label>

            <select
              value={
                selectedMonth
              }
              onChange={(
                event
              ) =>
                setSelectedMonth(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-600"
            >

              <option value="">
                All months
              </option>

              {availableMonths.map(
                (month) => {
                  const item =
                    MONTHS.find(
                      (m) =>
                        Number(
                          m.value
                        ) ===
                        month
                    );

                  return (
                    <option
                      key={month}
                      value={month}
                    >
                      {item?.label ||
                        `Month ${month}`}
                    </option>
                  );
                }
              )}

            </select>
          </div>


          {/* Reset */}

          <div className="flex items-end">

            <button
              type="button"
              onClick={
                resetFilter
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <RotateCcw
                size={17}
              />

              Reset
            </button>

          </div>

        </div>

      </div>


      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Total
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {summary.total}
          </p>
        </div>


        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <p className="text-sm text-green-600">
            Present
          </p>

          <p className="mt-1 text-2xl font-bold text-green-700">
            {summary.present}
          </p>
        </div>


        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            Absent
          </p>

          <p className="mt-1 text-2xl font-bold text-red-700">
            {summary.absent}
          </p>
        </div>


        <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-600">
            Permission
          </p>

          <p className="mt-1 text-2xl font-bold text-yellow-700">
            {
              summary.permission
            }
          </p>
        </div>

      </div>


      {/* =====================================================
          TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[850px] text-sm">

            <thead className="bg-slate-100">

              <tr>

                <th className="p-4 text-left">
                  Date
                </th>

                <th className="p-4 text-left">
                  Class
                </th>

                <th className="p-4 text-left">
                  Subject
                </th>

                <th className="p-4 text-left">
                  Teacher
                </th>

                <th className="p-4 text-left">
                  Time
                </th>

                <th className="p-4 text-left">
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              {loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-slate-500"
                  >
                    Loading
                    attendance...
                  </td>
                </tr>
              )}


              {!loading &&
                sortedRecords.map(
                  (record) => (
                    <tr
                      key={
                        record.id
                      }
                      className="border-t transition hover:bg-slate-50"
                    >

                      <td className="p-4 font-medium text-slate-700">
                        {
                          record.date
                        }
                      </td>

                      <td className="p-4">
                        {record.class_name ||
                          "-"}
                      </td>

                      <td className="p-4 font-semibold text-slate-800">
                        {record.subject_name ||
                          "-"}
                      </td>

                      <td className="p-4">
                        {record.teacher_name ||
                          "-"}
                      </td>

                      <td className="p-4 whitespace-nowrap">

                        {record.start_time &&
                        record.end_time
                          ? `${formatTime(
                              record.start_time
                            )} - ${formatTime(
                              record.end_time
                            )}`
                          : "-"}

                      </td>

                      <td className="p-4">

                        <span
                          className={`inline-flex rounded-xl px-4 py-2 text-xs font-bold ${getStatusClass(
                            record.status
                          )}`}
                        >
                          {getStatusLabel(
                            record.status
                          )}
                        </span>

                      </td>

                    </tr>
                  )
                )}


              {!loading &&
                sortedRecords.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-10 text-center text-slate-500"
                    >
                      {selectedMonth ||
                      selectedYear
                        ? "No attendance record for selected period"
                        : "No attendance record"}
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