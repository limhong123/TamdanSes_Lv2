import {
  Award,
  CheckCircle,
  FileText,
  GraduationCap,
  LoaderCircle,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const MONTHS = [
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

const initialForm = {
  class_id: "",
  semester: "1",
  month: String(new Date().getMonth() + 1),
};

function getMonthName(month) {
  return (
    MONTHS.find(
      (item) => Number(item.value) === Number(month)
    )?.label || "-"
  );
}

function getClassName(item) {
  if (!item) return "-";

  const name =
    item.name ||
    item.class_name ||
    `Class ${item.id}`;

  const section = item.section || "";

  return `${name}${section ? ` ${section}` : ""}`;
}

function getStudentName(student) {
  return (
    student?.student_name ||
    student?.name ||
    `${student?.first_name || ""} ${
      student?.last_name || ""
    }`.trim() ||
    `Student ${student?.id || ""}`
  );
}

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || "Validation error")
      .join(", ");
  }

  return fallback;
}

export default function TeacherScores() {
  const [mode, setMode] = useState("monthly");

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [savedScores, setSavedScores] = useState([]);

  const [form, setForm] = useState(initialForm);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null);

  const [loadingClasses, setLoadingClasses] =
    useState(true);

  const [loadingClass, setLoadingClass] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState(null);

  const showMessage = (type, text) => {
    setMessage({
      type,
      text,
    });

    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  const selectedClass = useMemo(() => {
    return classes.find(
      (item) =>
        String(item.id) ===
        String(form.class_id)
    );
  }, [classes, form.class_id]);

  const getCurrentUserId = () => {
    return Number(
      localStorage.getItem("user_id") ||
        localStorage.getItem("id") ||
        localStorage.getItem("userId")
    );
  };

  // =========================================================
  // LOAD TEACHER CLASSES
  // =========================================================

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);

      const res = await api.get(
        "/classes/teacher/my-classes"
      );

      setClasses(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (error) {
      setClasses([]);

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Cannot load teacher classes"
        )
      );
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // =========================================================
  // FETCH SCORES
  // =========================================================

  const fetchScores = async (params) => {
    const res = await api.get("/scores/", {
      params,
    });

    return Array.isArray(res.data)
      ? res.data
      : [];
  };

  // =========================================================
  // LOAD CLASS + STUDENTS + SUBJECTS + SCORE
  // =========================================================

  const loadSelectedClass = async ({
    classId,
    semester,
    month,
    scoreMode,
  }) => {
    if (!classId) {
      setSubjects([]);
      setStudents([]);
      setSavedScores([]);
      return;
    }

    try {
      setLoadingClass(true);

      setSubjects([]);
      setStudents([]);

      const params = {
        class_id: Number(classId),
        semester: Number(semester),
        score_type: scoreMode,
      };

      if (scoreMode === "monthly") {
        params.month = Number(month);
      }

      const [
        classRes,
        currentScores,
        historyScores,
      ] = await Promise.all([
        api.get(`/classes/${classId}`),

        fetchScores(params),

        fetchScores({
          class_id: Number(classId),
        }),
      ]);

      const classData = classRes.data || {};

      // -----------------------------------------------------
      // STUDENTS
      // -----------------------------------------------------

      const classStudents = Array.isArray(
        classData.students
      )
        ? classData.students
        : [];

      // -----------------------------------------------------
      // SUBJECTS
      // Only subjects taught by current teacher
      // -----------------------------------------------------

      const currentUserId =
        getCurrentUserId();

      const teacherRelations =
        Array.isArray(classData.teachers)
          ? classData.teachers
          : [];

      const teacherSubjects =
        teacherRelations.filter(
          (relation) =>
            Number(relation.user_id) ===
            Number(currentUserId)
        );

      const subjectMap = new Map();

      teacherSubjects.forEach(
        (relation) => {
          if (!relation.subject_id) return;

          const id =
            Number(relation.subject_id);

          if (!subjectMap.has(id)) {
            subjectMap.set(id, {
              id,
              name:
                relation.subject_name ||
                `Subject ${id}`,
            });
          }
        }
      );

      /*
       * Fallback:
       * If /classes/{id} does not contain user_id,
       * use subject information from existing score data.
       */
      if (subjectMap.size === 0) {
        [
          ...currentScores,
          ...historyScores,
        ].forEach((score) => {
          if (!score.subject_id) return;

          if (
            !subjectMap.has(
              Number(score.subject_id)
            )
          ) {
            subjectMap.set(
              Number(score.subject_id),
              {
                id: Number(
                  score.subject_id
                ),
                name:
                  score.subject_name ||
                  `Subject ${score.subject_id}`,
              }
            );
          }
        });
      }

      const teacherSubjectList =
        Array.from(
          subjectMap.values()
        );

      setSubjects(
        teacherSubjectList
      );

      // -----------------------------------------------------
      // ADD SAVED SCORES INTO EACH STUDENT INPUT
      // -----------------------------------------------------

      const studentRows =
        classStudents.map((student) => {
          const scoreValues = {};

          teacherSubjectList.forEach(
            (subject) => {
              const found =
                currentScores.find(
                  (item) =>
                    Number(
                      item.student_id
                    ) ===
                      Number(
                        student.id
                      ) &&
                    Number(
                      item.subject_id
                    ) ===
                      Number(subject.id)
                );

              scoreValues[subject.id] =
                found
                  ? String(found.score)
                  : "";
            }
          );

          return {
            ...student,
            scores: scoreValues,
          };
        });

      setStudents(studentRows);

      setSavedScores(
        historyScores
      );
    } catch (error) {
      setSubjects([]);
      setStudents([]);
      setSavedScores([]);

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Cannot load class scores"
        )
      );
    } finally {
      setLoadingClass(false);
    }
  };

  // =========================================================
  // SELECT CLASS
  // =========================================================

  const changeClass = async (
    classId
  ) => {
    const nextForm = {
      ...form,
      class_id: classId,
    };

    setForm(nextForm);

    await loadSelectedClass({
      classId,
      semester:
        nextForm.semester,
      month: nextForm.month,
      scoreMode: mode,
    });
  };

  // =========================================================
  // CHANGE FILTER
  // =========================================================

  const changeFilter = async (
    key,
    value
  ) => {
    const nextForm = {
      ...form,
      [key]: value,
    };

    setForm(nextForm);

    if (!nextForm.class_id) {
      return;
    }

    await loadSelectedClass({
      classId:
        nextForm.class_id,
      semester:
        nextForm.semester,
      month:
        nextForm.month,
      scoreMode: mode,
    });
  };

  // =========================================================
  // CHANGE MONTHLY / SEMESTER EXAM
  // =========================================================

  const changeMode = async (
    newMode
  ) => {
    setMode(newMode);

    if (!form.class_id) {
      return;
    }

    await loadSelectedClass({
      classId: form.class_id,
      semester: form.semester,
      month: form.month,
      scoreMode: newMode,
    });
  };

  // =========================================================
  // UPDATE INPUT
  // =========================================================

  const updateScore = (
    studentId,
    subjectId,
    value
  ) => {
    setStudents((previous) =>
      previous.map((student) => {
        if (
          Number(student.id) !==
          Number(studentId)
        ) {
          return student;
        }

        return {
          ...student,

          scores: {
            ...student.scores,
            [subjectId]: value,
          },
        };
      })
    );
  };

  // =========================================================
  // MONTHLY / EXAM TOTAL
  // =========================================================

  const getStudentTotal = (
    student
  ) => {
    return subjects.reduce(
      (total, subject) =>
        total +
        Number(
          student.scores?.[
            subject.id
          ] || 0
        ),
      0
    );
  };

  const getStudentAverage = (
    student
  ) => {
    if (
      subjects.length === 0
    ) {
      return 0;
    }

    return (
      getStudentTotal(student) /
      subjects.length
    );
  };

  const rankedStudents =
    useMemo(() => {
      const rows =
        students.map(
          (student) => ({
            ...student,

            total:
              getStudentTotal(
                student
              ),

            average:
              getStudentAverage(
                student
              ),
          })
        );

      rows.sort(
        (a, b) =>
          b.average -
          a.average
      );

      return rows.map(
        (student, index) => ({
          ...student,
          rank: index + 1,
        })
      );
    }, [students, subjects]);

  // =========================================================
  // SAVE
  // =========================================================

  const saveScores = async () => {
    if (!form.class_id) {
      showMessage(
        "error",
        "Please select class"
      );

      return;
    }

    if (
      subjects.length === 0
    ) {
      showMessage(
        "error",
        "No subject found for this teacher"
      );

      return;
    }

    try {
      setSaving(true);

      let savedCount = 0;

      for (
        const student of students
      ) {
        for (
          const subject of subjects
        ) {
          const raw =
            student.scores?.[
              subject.id
            ];

          if (
            raw === "" ||
            raw === null ||
            raw === undefined
          ) {
            continue;
          }

          const score =
            Number(raw);

          if (
            Number.isNaN(score) ||
            score < 0 ||
            score > 100
          ) {
            showMessage(
              "error",
              `${getStudentName(
                student
              )} - ${
                subject.name
              }: score must be 0 to 100`
            );

            return;
          }

          await api.post(
            "/scores/",
            {
              student_id:
                Number(student.id),

              class_id:
                Number(
                  form.class_id
                ),

              subject_id:
                Number(
                  subject.id
                ),

              semester:
                Number(
                  form.semester
                ),

              score_type:
                mode,

              month:
                mode === "monthly"
                  ? Number(
                      form.month
                    )
                  : null,

              score,

              // You can add bonus later
              bonus: 0,

              remark: "",
            }
          );

          savedCount++;
        }
      }

      if (savedCount === 0) {
        showMessage(
          "error",
          "Please enter at least one score"
        );

        return;
      }

      showMessage(
        "success",
        mode === "monthly"
          ? "Monthly scores saved successfully"
          : "Semester exam scores saved successfully"
      );

      await loadSelectedClass({
        classId:
          form.class_id,
        semester:
          form.semester,
        month:
          form.month,
        scoreMode: mode,
      });
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(
          error,
          "Save score failed"
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const deleteScore = async (
    scoreId
  ) => {
    const ok =
      window.confirm(
        "Delete this score?"
      );

    if (!ok) return;

    try {
      setDeletingId(scoreId);

      await api.delete(
        `/scores/${scoreId}`
      );

      showMessage(
        "success",
        "Score deleted successfully"
      );

      await loadSelectedClass({
        classId:
          form.class_id,
        semester:
          form.semester,
        month:
          form.month,
        scoreMode: mode,
      });
    } catch (error) {
      showMessage(
        "error",
        getErrorMessage(
          error,
          "Delete score failed"
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // HISTORY FILTER
  // =========================================================

  const filteredScores =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return savedScores;
      }

      return savedScores.filter(
        (item) => {
          const values = [
            item.student_name,
            item.subject_name,
            item.score_type,
            item.semester,
            item.month
              ? getMonthName(
                  item.month
                )
              : "semester exam",
          ];

          return values.some(
            (value) =>
              String(
                value || ""
              )
                .toLowerCase()
                .includes(keyword)
          );
        }
      );
    }, [savedScores, search]);

  return (
    <div className="space-y-6">
      {/* MESSAGE */}

      {message && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 font-semibold shadow-xl ${
            message.type ===
            "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type ===
          "success" ? (
            <CheckCircle
              size={20}
            />
          ) : (
            <XCircle
              size={20}
            />
          )}

          {message.text}
        </div>
      )}

      {/* HEADER */}

      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-7 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Award size={30} />
          </div>

          <div>
            <h1 className="text-3xl font-bold">
              Student Scores
            </h1>

            <p className="mt-1 text-blue-100">
              Manage monthly scores and semester exams
            </p>
          </div>
        </div>
      </div>

      {/* MODE */}

      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() =>
            changeMode(
              "monthly"
            )
          }
          className={`rounded-xl px-6 py-3 font-bold transition ${
            mode === "monthly"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-600 hover:bg-white"
          }`}
        >
          Monthly Score
        </button>

        <button
          type="button"
          onClick={() =>
            changeMode(
              "semester_exam"
            )
          }
          className={`rounded-xl px-6 py-3 font-bold transition ${
            mode ===
            "semester_exam"
              ? "bg-blue-600 text-white shadow"
              : "text-slate-600 hover:bg-white"
          }`}
        >
          Semester Exam
        </button>
      </div>

      {/* FILTER */}

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <GraduationCap className="text-blue-600" />

          <div>
            <h2 className="text-lg font-bold">
              Score Filter
            </h2>

            <p className="text-sm text-slate-500">
              Select class and semester
            </p>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-4 ${
            mode === "monthly"
              ? "md:grid-cols-3"
              : "md:grid-cols-2"
          }`}
        >
          <select
            value={
              form.class_id
            }
            onChange={(e) =>
              changeClass(
                e.target.value
              )
            }
            className="rounded-xl border px-4 py-3"
          >
            <option value="">
              {loadingClasses
                ? "Loading..."
                : "Select Class"}
            </option>

            {classes.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {getClassName(
                    item
                  )}
                </option>
              )
            )}
          </select>

          <select
            value={
              form.semester
            }
            onChange={(e) =>
              changeFilter(
                "semester",
                e.target.value
              )
            }
            className="rounded-xl border px-4 py-3"
          >
            <option value="1">
              Semester 1
            </option>

            <option value="2">
              Semester 2
            </option>
          </select>

          {mode ===
            "monthly" && (
            <select
              value={
                form.month
              }
              onChange={(e) =>
                changeFilter(
                  "month",
                  e.target
                    .value
                )
              }
              className="rounded-xl border px-4 py-3"
            >
              {MONTHS.map(
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
              )}
            </select>
          )}
        </div>
      </div>

      {/* SCORE TABLE */}

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="border-b bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <Users className="text-indigo-600" />

            <div>
              <h2 className="font-bold">
                {mode ===
                "monthly"
                  ? "Monthly Score Entry"
                  : "Semester Exam Entry"}
              </h2>

              <p className="text-sm text-slate-500">
                {selectedClass
                  ? getClassName(
                      selectedClass
                    )
                  : "Select class"}

                {" · "}
                Semester{" "}
                {
                  form.semester
                }

                {mode ===
                  "monthly" &&
                  ` · ${getMonthName(
                    form.month
                  )}`}
              </p>
            </div>
          </div>
        </div>

        {loadingClass ? (
          <div className="p-10 text-center text-slate-500">
            Loading students...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4 text-left">
                    Student
                  </th>

                  {subjects.map(
                    (subject) => (
                      <th
                        key={
                          subject.id
                        }
                        className="p-4 text-center"
                      >
                        {
                          subject.name
                        }
                      </th>
                    )
                  )}

                  <th className="p-4 text-center">
                    Total
                  </th>

                  <th className="p-4 text-center">
                    Average
                  </th>

                  {mode ===
                    "monthly" && (
                    <th className="p-4 text-center">
                      Rank
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {rankedStudents.map(
                  (student) => (
                    <tr
                      key={
                        student.id
                      }
                      className="border-t"
                    >
                      <td className="p-4 font-semibold">
                        {getStudentName(
                          student
                        )}
                      </td>

                      {subjects.map(
                        (
                          subject
                        ) => (
                          <td
                            key={
                              subject.id
                            }
                            className="p-3 text-center"
                          >
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={
                                student
                                  .scores?.[
                                  subject
                                    .id
                                ] ||
                                ""
                              }
                              onChange={(
                                e
                              ) =>
                                updateScore(
                                  student.id,
                                  subject.id,
                                  e
                                    .target
                                    .value
                                )
                              }
                              placeholder="0"
                              className="w-24 rounded-xl border px-3 py-2 text-center outline-none focus:border-blue-600"
                            />
                          </td>
                        )
                      )}

                      <td className="p-4 text-center font-bold">
                        {student.total.toFixed(
                          2
                        )}
                      </td>

                      <td className="p-4 text-center font-bold">
                        {student.average.toFixed(
                          2
                        )}
                      </td>

                      {mode ===
                        "monthly" && (
                        <td className="p-4 text-center font-bold text-blue-600">
                          #
                          {
                            student.rank
                          }
                        </td>
                      )}
                    </tr>
                  )
                )}

                {!form.class_id && (
                  <tr>
                    <td
                      colSpan={
                        subjects.length +
                        4
                      }
                      className="p-10 text-center text-slate-500"
                    >
                      Select class first
                    </td>
                  </tr>
                )}

                {form.class_id &&
                  students.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          subjects.length +
                          4
                        }
                        className="p-10 text-center text-slate-500"
                      >
                        No students
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        )}

        {students.length >
          0 &&
          subjects.length >
            0 && (
          <div className="border-t bg-slate-50 p-5">
            <button
              type="button"
              onClick={
                saveScores
              }
              disabled={
                saving
              }
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle
                  className="animate-spin"
                  size={18}
                />
              ) : (
                <CheckCircle
                  size={18}
                />
              )}

              {saving
                ? "Saving..."
                : mode ===
                  "monthly"
                ? "Save Monthly Scores"
                : "Save Semester Exam"}
            </button>
          </div>
        )}
      </div>

      {/* HISTORY */}

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b bg-slate-50 p-5 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <FileText className="text-violet-600" />

            <div>
              <h2 className="font-bold">
                Saved Scores
              </h2>

              <p className="text-sm text-slate-500">
                Monthly and semester exam history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
            <Search
              size={18}
              className="text-slate-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search..."
              className="outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left">
                  Student
                </th>

                <th className="p-4 text-left">
                  Subject
                </th>

                <th className="p-4 text-left">
                  Type
                </th>

                <th className="p-4 text-left">
                  Semester
                </th>

                <th className="p-4 text-left">
                  Month
                </th>

                <th className="p-4 text-left">
                  Score
                </th>

                <th className="p-4 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredScores.map(
                (item) => (
                  <tr
                    key={
                      item.id
                    }
                    className="border-t"
                  >
                    <td className="p-4">
                      {
                        item.student_name
                      }
                    </td>

                    <td className="p-4">
                      {
                        item.subject_name
                      }
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.score_type ===
                          "semester_exam"
                            ? "bg-violet-100 text-violet-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.score_type ===
                        "semester_exam"
                          ? "Semester Exam"
                          : "Monthly"}
                      </span>
                    </td>

                    <td className="p-4">
                      Semester{" "}
                      {
                        item.semester
                      }
                    </td>

                    <td className="p-4">
                      {item.score_type ===
                      "semester_exam"
                        ? "-"
                        : getMonthName(
                            item.month
                          )}
                    </td>

                    <td className="p-4 font-bold">
                      {
                        item.total_score
                      }
                      /
                      {
                        item.max_score
                      }
                    </td>

                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          deleteScore(
                            item.id
                          )
                        }
                        disabled={
                          deletingId ===
                          item.id
                        }
                        className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId ===
                        item.id ? (
                          <LoaderCircle
                            size={
                              18
                            }
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={
                              18
                            }
                          />
                        )}
                      </button>
                    </td>
                  </tr>
                )
              )}

              {filteredScores.length ===
                0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="p-10 text-center text-slate-500"
                  >
                    No saved scores
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