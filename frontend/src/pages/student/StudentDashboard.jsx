import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle,
  FileText,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../api/axios";


const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


const isPresentStatus = (status) =>
  status === "p" ||
  status === "present";


const isAbsentStatus = (status) =>
  status === "a" ||
  status === "absent";


const isPermissionStatus = (status) =>
  status === "l" ||
  status === "leave" ||
  status === "permission";


function calculateAttendanceSummary(
  attendance,
) {
  const attendanceByDate =
    attendance.reduce(
      (groups, item) => {
        const dateKey = String(
          item.date || "",
        ).trim();

        if (!dateKey) {
          return groups;
        }

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }

        groups[dateKey].push(item);

        return groups;
      },
      {},
    );

  let presentDays = 0;
  let absentDays = 0;
  let permissionDays = 0;

  Object.values(
    attendanceByDate,
  ).forEach((dailyAttendance) => {
    const statuses =
      dailyAttendance.map((item) =>
        normalizeStatus(item.status),
      );

    const hasPresent =
      statuses.some(
        isPresentStatus,
      );

    const allAbsent =
      statuses.length > 0 &&
      statuses.every(
        isAbsentStatus,
      );

    const allPermission =
      statuses.length > 0 &&
      statuses.every(
        isPermissionStatus,
      );

    if (hasPresent) {
      presentDays += 1;
    } else if (allAbsent) {
      absentDays += 1;
    } else if (allPermission) {
      permissionDays += 1;
    } else {
      const hasPermission =
        statuses.some(
          isPermissionStatus,
        );

      const hasAbsent =
        statuses.some(
          isAbsentStatus,
        );

      if (
        hasPermission &&
        !hasAbsent
      ) {
        permissionDays += 1;
      } else if (hasAbsent) {
        absentDays += 1;
      }
    }
  });

  const presentSubjects =
    attendance.filter((item) =>
      isPresentStatus(
        normalizeStatus(
          item.status,
        ),
      ),
    ).length;

  const absentSubjects =
    attendance.filter((item) =>
      isAbsentStatus(
        normalizeStatus(
          item.status,
        ),
      ),
    ).length;

  const permissionSubjects =
    attendance.filter((item) =>
      isPermissionStatus(
        normalizeStatus(
          item.status,
        ),
      ),
    ).length;

  return {
    presentDays,
    absentDays,
    permissionDays,
    presentSubjects,
    absentSubjects,
    permissionSubjects,
  };
}


export default function StudentDashboard() {
  const [homework, setHomework] =
    useState([]);

  const [submissions, setSubmissions] =
    useState([]);

  const [scores, setScores] =
    useState([]);

  const [schedules, setSchedules] =
    useState([]);

  const [attendance, setAttendance] =
    useState([]);

  const [rank, setRank] =
    useState("-");

  const [rankAverage, setRankAverage] =
    useState(0);

  const [rankMonth, setRankMonth] =
    useState(null);

  const [rankSemester, setRankSemester] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const studentId =
    localStorage.getItem(
      "student_id",
    ) ||
    localStorage.getItem(
      "user_id",
    ) ||
    localStorage.getItem("id");


  const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];


  const rankMonthName =
    rankMonth
      ? monthNames[
          Number(rankMonth)
        ]
      : "-";


  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const rankRes =
        await api.get(
          "/scores/student/rank",
        );

      const latestMonth =
        rankRes.data?.month ||
        null;

      const latestSemester =
        rankRes.data?.semester ||
        null;

      setRankMonth(
        latestMonth,
      );

      setRankSemester(
        latestSemester,
      );

      setRankAverage(
        Number(
          rankRes.data
            ?.average || 0,
        ),
      );

      if (
        rankRes.data?.rank &&
        rankRes.data.rank !== "-"
      ) {
        setRank(
          `${rankRes.data.rank} / ${
            rankRes.data
              .total_students || 0
          }`,
        );
      } else {
        setRank("-");
      }

      const results =
        await Promise.allSettled([
          studentId
            ? api.get(
                `/homework/student/${studentId}`,
              )
            : Promise.resolve({
                data: [],
              }),

          studentId
            ? api.get(
                `/submissions/student/${studentId}`,
              )
            : Promise.resolve({
                data: [],
              }),

          api.get(
            "/scores/student/me",
            {
              params:
                latestMonth &&
                latestSemester
                  ? {
                      semester:
                        latestSemester,
                      month:
                        latestMonth,
                    }
                  : {},
            },
          ),

          api.get(
            "/schedules/student/me",
          ),

          api.get(
            "/attendance/me",
          ),
        ]);

      const [
        homeworkResult,
        submissionsResult,
        scoresResult,
        schedulesResult,
        attendanceResult,
      ] = results;

      setHomework(
        homeworkResult.status ===
          "fulfilled" &&
          Array.isArray(
            homeworkResult.value
              .data,
          )
          ? homeworkResult.value
              .data
          : [],
      );

      setSubmissions(
        submissionsResult.status ===
          "fulfilled" &&
          Array.isArray(
            submissionsResult
              .value.data,
          )
          ? submissionsResult
              .value.data
          : [],
      );

      setScores(
        scoresResult.status ===
          "fulfilled" &&
          Array.isArray(
            scoresResult.value
              .data,
          )
          ? scoresResult.value
              .data
          : [],
      );

      setSchedules(
        schedulesResult.status ===
          "fulfilled" &&
          Array.isArray(
            schedulesResult.value
              .data,
          )
          ? schedulesResult.value
              .data
          : [],
      );

      setAttendance(
        attendanceResult.status ===
          "fulfilled" &&
          Array.isArray(
            attendanceResult.value
              .data,
          )
          ? attendanceResult.value
              .data
          : [],
      );

      const failedNames = [];

      if (
        homeworkResult.status ===
        "rejected"
      ) {
        failedNames.push(
          "Homework",
        );
      }

      if (
        submissionsResult.status ===
        "rejected"
      ) {
        failedNames.push(
          "Submissions",
        );
      }

      if (
        scoresResult.status ===
        "rejected"
      ) {
        failedNames.push(
          "Scores",
        );
      }

      if (
        schedulesResult.status ===
        "rejected"
      ) {
        failedNames.push(
          "Schedules",
        );
      }

      if (
        attendanceResult.status ===
        "rejected"
      ) {
        failedNames.push(
          "Attendance",
        );
      }

      if (
        failedNames.length > 0
      ) {
        setError(
          `Some information could not load: ${failedNames.join(
            ", ",
          )}.`,
        );
      }
    } catch (err) {
      console.error(
        "STUDENT DASHBOARD ERROR:",
        err?.response?.data ||
          err,
      );

      const detail =
        err?.response?.data
          ?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Cannot load student dashboard.",
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadDashboard();
  }, []);


  const recentHomework =
    useMemo(() => {
      const oneDayAgo =
        new Date();

      oneDayAgo.setHours(
        oneDayAgo.getHours() -
          24,
      );

      return homework
        .filter((item) => {
          if (
            !item.created_at
          ) {
            return false;
          }

          const createdDate =
            new Date(
              item.created_at,
            );

          if (
            Number.isNaN(
              createdDate.getTime(),
            )
          ) {
            return false;
          }

          return (
            createdDate >=
            oneDayAgo
          );
        })
        .sort((a, b) => {
          return (
            new Date(
              b.created_at || 0,
            ).getTime() -
            new Date(
              a.created_at || 0,
            ).getTime()
          );
        })
        .slice(0, 5);
    }, [homework]);


  const submittedHomeworkIds =
    useMemo(
      () =>
        new Set(
          submissions.map(
            (item) =>
              String(
                item.homework_id,
              ),
          ),
        ),
      [submissions],
    );


  const pendingHomework =
    homework.filter(
      (item) =>
        !submittedHomeworkIds.has(
          String(item.id),
        ),
    ).length;


  const attendanceSummary =
    useMemo(
      () =>
        calculateAttendanceSummary(
          attendance,
        ),
      [attendance],
    );


  /*
   * Total score includes score + bonus
   * because backend saves that value
   * inside total_score.
   */
  const totalScore =
    useMemo(() => {
      return scores.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_score ||
              0,
          ),
        0,
      );
    }, [scores]);


  /*
   * Count each saved subject once.
   *
   * Example:
   * Math + Biology = 2 subjects.
   */
  const totalSubjects =
    useMemo(() => {
      const subjectIds =
        new Set(
          scores
            .filter(
              (item) =>
                item.subject_id !==
                  null &&
                item.subject_id !==
                  undefined,
            )
            .map((item) =>
              String(
                item.subject_id,
              ),
            ),
        );

      return subjectIds.size;
    }, [scores]);


  /*
   * Required formula:
   *
   * Average =
   * Total Score / Total Subjects
   *
   * Example:
   * Math total = 98
   * Biology total = 43
   *
   * Total score = 141
   * Total subjects = 2
   * Average = 70.5
   */
  const calculatedAverage =
    totalSubjects > 0
      ? totalScore /
        totalSubjects
      : 0;


  /*
   * rankAverage comes from:
   * GET /scores/student/rank
   *
   * Backend uses the same formula.
   * Use API average first and use
   * local calculation as fallback.
   */
  const average =
    Number.isFinite(
      Number(rankAverage),
    ) &&
    Number(rankAverage) > 0
      ? Number(rankAverage)
      : calculatedAverage;


  const formattedAverage =
    Number(average || 0)
      .toFixed(1);


  const today =
    new Date()
      .toLocaleDateString(
        "en-US",
        {
          weekday: "long",
        },
      )
      .toLowerCase();


  const todaySchedules =
    schedules
      .filter(
        (item) =>
          String(
            item.day || "",
          )
            .trim()
            .toLowerCase() ===
          today,
      )
      .sort((a, b) =>
        String(
          a.start_time || "",
        ).localeCompare(
          String(
            b.start_time || "",
          ),
        ),
      );


  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <p className="mt-4 font-bold text-slate-700">
            Loading dashboard
          </p>
        </div>
      </div>
    );
  }


  return (
    <div>
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-8 text-white shadow-sm">
        <h1 className="text-3xl font-bold">
          Student Dashboard
        </h1>

        <p className="mt-2 text-blue-100">
          Track your homework,
          rank, attendance, and
          scores.
        </p>

        <p className="mt-4 text-sm font-semibold text-blue-100">
          Showing rank for{" "}
          {rankMonthName} /
          Semester{" "}
          {rankSemester || "-"}
        </p>
      </div>


      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          <XCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>
        </div>
      )}


      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">
        <StatCard
          title={`Rank in ${rankMonthName}`}
          value={rank}
          icon={Award}
          color="bg-yellow-50 text-yellow-600"
        />

        <StatCard
          title="Average"
          value={formattedAverage}
          subtitle={`${totalScore} total ÷ ${totalSubjects} subject${
            totalSubjects !== 1
              ? "s"
              : ""
          }`}
          icon={Trophy}
          color="bg-violet-50 text-violet-600"
        />

        <StatCard
          title="Homework"
          value={homework.length}
          icon={BookOpen}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Pending"
          value={pendingHomework}
          icon={FileText}
          color="bg-orange-50 text-orange-600"
        />
      </div>


      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          title="Present Days"
          value={
            attendanceSummary
              .presentDays
          }
          subtitle={`${attendanceSummary.presentSubjects} present subjects`}
          icon={CheckCircle}
          color="bg-green-50 text-green-600"
        />

        <StatCard
          title="Absent Days"
          value={
            attendanceSummary
              .absentDays
          }
          subtitle={`${attendanceSummary.absentSubjects} absent subjects`}
          icon={XCircle}
          color="bg-red-50 text-red-600"
        />

        <StatCard
          title="Permission Days"
          value={
            attendanceSummary
              .permissionDays
          }
          subtitle={`${attendanceSummary.permissionSubjects} permission subjects`}
          icon={CalendarDays}
          color="bg-cyan-50 text-cyan-600"
        />
      </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <CalendarDays
                size={24}
              />
            </div>

            <h2 className="text-xl font-bold text-slate-800">
              Today Schedule
            </h2>
          </div>

          {todaySchedules.length >
          0 ? (
            <div className="space-y-3">
              {todaySchedules.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="font-bold text-slate-800">
                      {item.subject_name ||
                        `Subject ${
                          item.subject_id ||
                          ""
                        }`}
                    </p>

                    <p className="text-sm text-slate-500">
                      Teacher:{" "}
                      {item.teacher_name ||
                        "-"}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-blue-600">
                      {formatTime(
                        item.start_time,
                      )}{" "}
                      -{" "}
                      {formatTime(
                        item.end_time,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
              No schedule today
            </p>
          )}
        </section>


        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
              <BookOpen size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Recent Homework
              </h2>

              <p className="text-sm text-slate-500">
                Homework created in
                the last 24 hours
              </p>
            </div>
          </div>

          {recentHomework.length >
          0 ? (
            <div className="space-y-3">
              {recentHomework.map(
                (item) => {
                  const submitted =
                    submissions.find(
                      (
                        submission,
                      ) =>
                        Number(
                          submission.homework_id,
                        ) ===
                        Number(
                          item.id,
                        ),
                    );

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            {
                              item.title
                            }
                          </p>

                          <p className="text-sm text-slate-500">
                            {item.subject_name ||
                              "-"}{" "}
                            •{" "}
                            {item.teacher_name ||
                              "-"}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-red-600">
                            Due:{" "}
                            {item.due_date ||
                              "-"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            submitted
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {submitted
                            ? submitted.status
                            : "pending"}
                        </span>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">
              No recent homework
            </p>
          )}
        </section>
      </div>


      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-green-50 p-3 text-green-600">
            <Trophy size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Latest Result
            </h2>

            <p className="text-sm text-slate-500">
              {rankMonthName} /
              Semester{" "}
              {rankSemester || "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoBox
            label="Total Score"
            value={formatNumber(
              totalScore,
            )}
          />

          <InfoBox
            label="Total Subjects"
            value={totalSubjects}
          />

          <InfoBox
            label="Average"
            value={
              formattedAverage
            }
          />

          <InfoBox
            label="Rank"
            value={rank}
          />
        </div>
      </div>
    </div>
  );
}


function StatCard({
  title,
  value,
  subtitle = "",
  icon: Icon,
  color,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-xs font-medium text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`rounded-2xl p-4 ${color}`}
        >
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}


function InfoBox({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}


function formatTime(value) {
  if (!value) {
    return "-";
  }

  const parts =
    String(value).split(":");

  return parts.length >= 2
    ? `${parts[0]}:${parts[1]}`
    : String(value);
}


function formatNumber(value) {
  const number =
    Number(value || 0);

  if (
    Number.isInteger(number)
  ) {
    return number;
  }

  return number.toFixed(2);
}