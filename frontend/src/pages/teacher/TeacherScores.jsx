import {
  Award,
  CheckCircle,
  ChevronDown,
  FileText,
  GraduationCap,
  LoaderCircle,
  Search,
  Trash2,
  Users,
  XCircle
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

const EMPTY_FORM = {
  class_id: "",
  semester: "1",
  month: String(new Date().getMonth() + 1),
  max_score: "100",
};

function getMonthName(month) {
  return (
    MONTHS.find(
      (item) => Number(item.value) === Number(month),
    )?.label || "-"
  );
}

function getClassName(item) {
  if (!item) return "Selected Class";

  const name =
    item.name ||
    item.class_name ||
    `Class ${item.id}`;

  const section = item.section || "";

  return `${name}${section ? ` ${section}` : ""}`;
}

function getStudentName(student) {
  return (
    student?.name ||
    student?.student_name ||
    `${student?.first_name || ""} ${student?.last_name || ""
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
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [savedScores, setSavedScores] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null);

  const [loadingClasses, setLoadingClasses] =
    useState(true);
  const [loadingClass, setLoadingClass] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState(null);

  const selectedClass = useMemo(() => {
    return classes.find(
      (item) =>
        String(item.id) === String(form.class_id),
    );
  }, [classes, form.class_id]);

  const showMessage = (type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  const getCurrentUserId = () => {
    return Number(
      localStorage.getItem("user_id") ||
      localStorage.getItem("id") ||
      localStorage.getItem("userId"),
    );
  };

  const fetchScores = async (params) => {
    const response = await api.get("/scores/", {
      params,
    });

    return Array.isArray(response.data)
      ? response.data
      : [];
  };

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);

      const response = await api.get(
        "/classes/teacher/my-classes",
      );

      const classList = Array.isArray(response.data)
        ? response.data
        : [];

      setClasses(classList);
    } catch (error) {
      console.error(
        "LOAD TEACHER CLASSES ERROR:",
        error?.response?.data || error,
      );

      setClasses([]);

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Cannot load your classes",
        ),
      );
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const loadSelectedClass = async ({
    classId,
    semester,
    month,
  }) => {
    if (!classId) {
      setStudents([]);
      setSubjects([]);
      setSavedScores([]);
      return;
    }

    try {
      setLoadingClass(true);
      setSearch("");
      setStudents([]);
      setSubjects([]);

      /*
       * currentScoreList:
       * Only selected class + semester + month.
       *
       * classHistoryList:
       * All saved months, but only selected class.
       */
      const [
        classResponse,
        currentScoreList,
        classHistoryList,
      ] = await Promise.all([
        api.get(`/classes/${classId}`),

        fetchScores({
          class_id: Number(classId),
          semester: Number(semester),
          month: Number(month),
        }),

        fetchScores({
          class_id: Number(classId),
        }),
      ]);

      const currentUserId = getCurrentUserId();
      const teacherRelations =
        classResponse.data?.teachers || [];

      const subjectMap = new Map();

      teacherRelations
        .filter(
          (relation) =>
            Number(relation.user_id) ===
            Number(currentUserId),
        )
        .forEach((relation) => {
          if (!relation.subject_id) return;

          const subjectId = String(
            relation.subject_id,
          );

          if (!subjectMap.has(subjectId)) {
            subjectMap.set(subjectId, {
              id: relation.subject_id,
              name:
                relation.subject_name ||
                `Subject ${relation.subject_id}`,
            });
          }
        });

      const uniqueSubjects = Array.from(
        subjectMap.values(),
      );

      setSubjects(uniqueSubjects);

      const classStudents = Array.isArray(
        classResponse.data?.students,
      )
        ? classResponse.data.students
        : [];

      const studentsWithScores =
        await Promise.all(
          classStudents.map(async (student) => {
            const scores = {};

            uniqueSubjects.forEach((subject) => {
              const existingScore =
                currentScoreList.find(
                  (scoreItem) =>
                    Number(scoreItem.student_id) ===
                    Number(student.id) &&
                    Number(scoreItem.subject_id) ===
                    Number(subject.id),
                );

              scores[subject.id] = existingScore
                ? String(existingScore.score)
                : "";
            });

            const existingStudentScore =
              currentScoreList.find(
                (scoreItem) =>
                  Number(scoreItem.student_id) ===
                  Number(student.id),
              );

            let homeworkBonus = 0;

            if (!existingStudentScore) {
              try {
                const bonusResponse = await api.get(
                  "/submissions/student-bonus",
                  {
                    params: {
                      student_id: student.id,
                      class_id: Number(classId),
                    },
                  },
                );

                homeworkBonus = Number(
                  bonusResponse.data?.bonus || 0,
                );
              } catch {
                homeworkBonus = 0;
              }
            }

            return {
              ...student,
              scores,
              bonus: String(
                existingStudentScore?.bonus ??
                homeworkBonus ??
                0,
              ),
            };
          }),
        );

      setStudents(studentsWithScores);

      /*
       * Extra frontend protection:
       * Even if backend returns all classes,
       * only keep selected class.
       */
      const selectedClassHistory =
        classHistoryList.filter(
          (scoreItem) =>
            String(scoreItem.class_id) ===
            String(classId),
        );

      setSavedScores(selectedClassHistory);

      if (uniqueSubjects.length === 0) {
        showMessage(
          "error",
          "You are not assigned to a subject in this class",
        );
      }
    } catch (error) {
      console.error(
        "LOAD SELECTED CLASS ERROR:",
        error?.response?.data || error,
      );

      setStudents([]);
      setSubjects([]);
      setSavedScores([]);

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Cannot load selected class",
        ),
      );
    } finally {
      setLoadingClass(false);
    }
  };

  const selectClass = async (classId) => {
    const nextForm = {
      ...form,
      class_id: classId,
    };

    setForm(nextForm);

    await loadSelectedClass({
      classId,
      semester: nextForm.semester,
      month: nextForm.month,
    });
  };

  const changeFilter = async (key, value) => {
    const nextForm = {
      ...form,
      [key]: value,
    };

    setForm(nextForm);

    if (nextForm.class_id) {
      await loadSelectedClass({
        classId: nextForm.class_id,
        semester: nextForm.semester,
        month: nextForm.month,
      });
    }
  };

  const updateScore = (
    studentId,
    subjectId,
    value,
  ) => {
    setStudents((previousStudents) =>
      previousStudents.map((student) =>
        Number(student.id) === Number(studentId)
          ? {
            ...student,
            scores: {
              ...student.scores,
              [subjectId]: value,
            },
          }
          : student,
      ),
    );
  };

  const updateBonus = (studentId, value) => {
    setStudents((previousStudents) =>
      previousStudents.map((student) =>
        Number(student.id) === Number(studentId)
          ? {
            ...student,
            bonus: value,
          }
          : student,
      ),
    );
  };

  const getStudentTotal = (student) => {
    const scoreTotal = subjects.reduce(
      (total, subject) => {
        return (
          total +
          Number(
            student.scores?.[subject.id] || 0,
          )
        );
      },
      0,
    );

    return (
      scoreTotal + Number(student.bonus || 0)
    );
  };

  const getStudentAverage = (student) => {
    if (subjects.length === 0) {
      return 0;
    }

    return (
      getStudentTotal(student) / subjects.length
    );
  };

  const rankedStudents = useMemo(() => {
    const sorted = [...students]
      .map((student) => ({
        ...student,
        total: getStudentTotal(student),
        average: getStudentAverage(student),
      }))
      .sort((a, b) => {
        if (b.average !== a.average) {
          return b.average - a.average;
        }

        return getStudentName(a).localeCompare(
          getStudentName(b),
        );
      });

    let previousAverage = null;
    let currentRank = 0;

    return sorted.map((student, index) => {
      if (student.average !== previousAverage) {
        currentRank = index + 1;
        previousAverage = student.average;
      }

      return {
        ...student,
        rank: currentRank,
      };
    });
  }, [students, subjects]);

  const saveScores = async () => {
    if (!form.class_id) {
      showMessage(
        "error",
        "Please select a class",
      );
      return;
    }

    if (subjects.length === 0) {
      showMessage(
        "error",
        "No assigned subject in this class",
      );
      return;
    }

    const maxScore = Number(
      form.max_score || 100,
    );

    if (
      Number.isNaN(maxScore) ||
      maxScore <= 0
    ) {
      showMessage(
        "error",
        "Maximum score must be greater than 0",
      );
      return;
    }

    try {
      setSaving(true);

      for (const student of students) {
        for (const subject of subjects) {
          const rawScore =
            student.scores?.[subject.id];

          if (
            rawScore === "" ||
            rawScore === null ||
            rawScore === undefined
          ) {
            continue;
          }

          const score = Number(rawScore);
          const bonus = Number(
            student.bonus || 0,
          );
          const studentName =
            getStudentName(student);

          if (
            Number.isNaN(score) ||
            score < 0 ||
            score > maxScore
          ) {
            showMessage(
              "error",
              `${studentName} - ${subject.name} must be between 0 and ${maxScore}`,
            );
            return;
          }

          if (
            Number.isNaN(bonus) ||
            bonus < 0
          ) {
            showMessage(
              "error",
              `${studentName} bonus cannot be negative`,
            );
            return;
          }

          await api.post("/scores/", {
            class_id: Number(form.class_id),
            subject_id: Number(subject.id),
            student_id: Number(student.id),
            semester: Number(form.semester),
            month: Number(form.month),
            score,
            bonus,
            max_score: maxScore,
            remark: "",
          });
        }
      }

      showMessage(
        "success",
        "Scores saved successfully",
      );

      await loadSelectedClass({
        classId: form.class_id,
        semester: form.semester,
        month: form.month,
      });
    } catch (error) {
      console.error(
        "SAVE SCORES ERROR:",
        error?.response?.data || error,
      );

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Failed to save scores",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteScore = async (scoreId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this score?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(scoreId);

      await api.delete(`/scores/${scoreId}`);

      showMessage(
        "success",
        "Score deleted successfully",
      );

      await loadSelectedClass({
        classId: form.class_id,
        semester: form.semester,
        month: form.month,
      });
    } catch (error) {
      console.error(
        "DELETE SCORE ERROR:",
        error?.response?.data || error,
      );

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Failed to delete score",
        ),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSavedScores = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return savedScores
      .filter(
        (scoreItem) =>
          String(scoreItem.class_id) ===
          String(form.class_id),
      )
      .filter((scoreItem) => {
        if (!keyword) return true;

        return [
          scoreItem.student_name,
          scoreItem.class_name,
          scoreItem.subject_name,
          scoreItem.teacher_name,
          getMonthName(scoreItem.month),
          `semester ${scoreItem.semester}`,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
        );
      })
      .sort((a, b) => {
        if (
          Number(b.semester) !==
          Number(a.semester)
        ) {
          return (
            Number(b.semester) -
            Number(a.semester)
          );
        }

        if (
          Number(b.month) !== Number(a.month)
        ) {
          return (
            Number(b.month) - Number(a.month)
          );
        }

        return String(
          a.student_name || "",
        ).localeCompare(
          String(b.student_name || ""),
        );
      });
  }, [savedScores, search, form.class_id]);

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`fixed right-5 top-5 z-[999] flex max-w-sm items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-bold shadow-xl ${message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
            }`}
        >
          {message.type === "success" ? (
            <CheckCircle
              size={21}
              className="shrink-0"
            />
          ) : (
            <XCircle
              size={21}
              className="shrink-0"
            />
          )}

          <span>{message.text}</span>
        </div>
      )}

      {/* Page header */}
      <header className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-7 text-white shadow-lg md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-sm ring-1 ring-white/20">
              <Award size={29} />
            </div>

            <div>
              <p className="text-sm font-semibold text-blue-100">
                Teacher Portal
              </p>

              <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">
                Student Score Management
              </h1>

              <p className="mt-2 text-sm text-blue-100">
                Add and manage scores by class,
                semester, and month.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/15 px-5 py-4 ring-1 ring-white/20">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
              Selected class
            </p>

            <p className="mt-1 text-lg font-extrabold">
              {selectedClass
                ? getClassName(selectedClass)
                : "Not selected"}
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <GraduationCap size={23} />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Score Filters
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose a class, semester, and month
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Class"
            value={form.class_id}
            onChange={(event) =>
              selectClass(event.target.value)
            }
            disabled={loadingClasses}
          >
            <option value="">
              {loadingClasses
                ? "Loading classes..."
                : "Select class"}
            </option>

            {classes.map((classItem) => (
              <option
                key={classItem.id}
                value={classItem.id}
              >
                {getClassName(classItem)}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Semester"
            value={form.semester}
            onChange={(event) =>
              changeFilter(
                "semester",
                event.target.value,
              )
            }
          >
            <option value="1">
              Semester 1
            </option>

            <option value="2">
              Semester 2
            </option>
          </FilterSelect>

          <FilterSelect
            label="Month"
            value={form.month}
            onChange={(event) =>
              changeFilter(
                "month",
                event.target.value,
              )
            }
          >
            {MONTHS.map((month) => (
              <option
                key={month.value}
                value={month.value}
              >
                {month.label}
              </option>
            ))}
          </FilterSelect>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Maximum Score
            </label>

            <input
              type="number"
              min="1"
              value={form.max_score}
              onChange={(event) =>
                setForm((previousForm) => ({
                  ...previousForm,
                  max_score:
                    event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="100"
            />
          </div>
        </div>
      </section>

      {/* Current score entry */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users size={22} />
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {selectedClass
                  ? `${getClassName(
                    selectedClass,
                  )} Score Entry`
                  : "Student Score Entry"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Semester {form.semester} ·{" "}
                {getMonthName(form.month)}
              </p>
            </div>
          </div>

          {selectedClass && (
            <div className="flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
              <Users size={17} />

              {students.length} student
              {students.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {loadingClass ? (
          <LoadingState text="Loading students and scores..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="px-5 py-4 text-left font-extrabold">
                    Student
                  </th>

                  <th className="px-5 py-4 text-left font-extrabold">
                    Gender
                  </th>

                  {subjects.map((subject) => (
                    <th
                      key={subject.id}
                      className="px-5 py-4 text-left font-extrabold"
                    >
                      {subject.name}
                    </th>
                  ))}

                  <th className="px-5 py-4 text-left font-extrabold">
                    Bonus
                  </th>

                  <th className="px-5 py-4 text-center font-extrabold">
                    Total
                  </th>

                  <th className="px-5 py-4 text-center font-extrabold">
                    Average
                  </th>

                  <th className="px-5 py-4 text-center font-extrabold">
                    Rank
                  </th>
                </tr>
              </thead>

              <tbody>
                {rankedStudents.map(
                  (student, index) => (
                    <tr
                      key={student.id}
                      className={
                        index % 2 === 0
                          ? "border-t border-slate-200 bg-white"
                          : "border-t border-slate-200 bg-slate-50/60"
                      }
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">
                          {getStudentName(student)}
                        </p>

                        {student.student_code && (
                          <p className="mt-1 text-xs text-slate-400">
                            {student.student_code}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {student.gender || "-"}
                      </td>

                      {subjects.map((subject) => (
                        <td
                          key={subject.id}
                          className="px-5 py-4"
                        >
                          <input
                            type="number"
                            min="0"
                            max={form.max_score}
                            value={
                              student.scores?.[
                              subject.id
                              ] ?? ""
                            }
                            onChange={(event) =>
                              updateScore(
                                student.id,
                                subject.id,
                                event.target.value,
                              )
                            }
                            className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            placeholder="0"
                          />
                        </td>
                      ))}

                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min="0"
                          value={
                            student.bonus ?? ""
                          }
                          onChange={(event) =>
                            updateBonus(
                              student.id,
                              event.target.value,
                            )
                          }
                          className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="0"
                        />
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-12 justify-center rounded-lg bg-blue-50 px-3 py-2 font-extrabold text-blue-700">
                          {student.total}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-12 justify-center rounded-lg bg-green-50 px-3 py-2 font-extrabold text-green-700">
                          {student.average.toFixed(1)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex min-w-12 justify-center rounded-lg bg-amber-50 px-3 py-2 font-extrabold text-amber-700">
                          #{student.rank}
                        </span>
                      </td>
                    </tr>
                  ),
                )}

                {!form.class_id && (
                  <EmptyTableRow
                    colSpan={
                      Math.max(
                        subjects.length + 6,
                        7,
                      )
                    }
                    icon={
                      <GraduationCap size={30} />
                    }
                    title="Select a class"
                    description="Choose a class above to enter and manage student scores."
                  />
                )}

                {form.class_id &&
                  students.length === 0 && (
                    <EmptyTableRow
                      colSpan={
                        Math.max(
                          subjects.length + 6,
                          7,
                        )
                      }
                      icon={<Users size={30} />}
                      title="No students found"
                      description="There are no students assigned to this class."
                    />
                  )}
              </tbody>
            </table>
          </div>
        )}

        {students.length > 0 &&
          subjects.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 md:px-6">
              <button
                type="button"
                onClick={saveScores}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle size={18} />
                )}

                {saving
                  ? "Saving Scores..."
                  : "Save / Update Scores"}
              </button>
            </div>
          )}
      </section>

      {/* Class-only saved history */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <FileText size={22} />
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {selectedClass
                  ? `Saved Scores — ${getClassName(
                    selectedClass,
                  )}`
                  : "Saved Scores"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedClass
                  ? `Showing all saved months for ${getClassName(
                    selectedClass,
                  )} only`
                  : "Select a class to view its saved scores"}
              </p>
            </div>
          </div>

          {form.class_id && (
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 md:w-80">
              <Search
                size={18}
                className="shrink-0 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student, subject, month..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="px-5 py-4 text-left font-extrabold">
                  Student
                </th>

                <th className="px-5 py-4 text-left font-extrabold">
                  Class
                </th>

                <th className="px-5 py-4 text-left font-extrabold">
                  Subject
                </th>

                <th className="px-5 py-4 text-left font-extrabold">
                  Semester
                </th>

                <th className="px-5 py-4 text-left font-extrabold">
                  Month
                </th>

                <th className="px-5 py-4 text-center font-extrabold">
                  Score
                </th>

                <th className="px-5 py-4 text-center font-extrabold">
                  Bonus
                </th>

                <th className="px-5 py-4 text-center font-extrabold">
                  Total
                </th>

                <th className="px-5 py-4 text-center font-extrabold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredSavedScores.map(
                (scoreItem, index) => (
                  <tr
                    key={scoreItem.id}
                    className={
                      index % 2 === 0
                        ? "border-t border-slate-200 bg-white"
                        : "border-t border-slate-200 bg-slate-50/60"
                    }
                  >
                    <td className="px-5 py-4 font-bold text-slate-800">
                      {scoreItem.student_name ||
                        "-"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700">
                        {scoreItem.class_name ||
                          getClassName(
                            selectedClass,
                          )}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {scoreItem.subject_name ||
                        "-"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      Semester{" "}
                      {scoreItem.semester}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {getMonthName(
                        scoreItem.month,
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="font-bold text-slate-700">
                        {scoreItem.score}/
                        {scoreItem.max_score}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center font-bold text-violet-600">
                      +{scoreItem.bonus || 0}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="rounded-lg bg-green-50 px-3 py-2 font-extrabold text-green-700">
                        {scoreItem.total_score ??
                          Number(
                            scoreItem.score || 0,
                          ) +
                          Number(
                            scoreItem.bonus || 0,
                          )}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        title="Delete score"
                        disabled={
                          deletingId ===
                          scoreItem.id
                        }
                        onClick={() =>
                          deleteScore(
                            scoreItem.id,
                          )
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId ===
                          scoreItem.id ? (
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                ),
              )}

              {!form.class_id && (
                <EmptyTableRow
                  colSpan={9}
                  icon={
                    <GraduationCap size={30} />
                  }
                  title="No class selected"
                  description="Select a class to view only that class's saved scores."
                />
              )}

              {form.class_id &&
                filteredSavedScores.length ===
                0 && (
                  <EmptyTableRow
                    colSpan={9}
                    icon={<FileText size={30} />}
                    title="No saved scores found"
                    description={`No saved scores were found for ${getClassName(
                      selectedClass,
                    )}.`}
                  />
                )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  children,
  disabled = false,
  ...props
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-600">
        {label}
      </label>

      <div className="relative">
        <select
          {...props}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {children}
        </select>

        <ChevronDown
          size={17}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function LoadingState({ text }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <LoaderCircle
          size={29}
          className="animate-spin"
        />
      </div>

      <p className="text-sm font-bold text-slate-600">
        {text}
      </p>
    </div>
  );
}

function EmptyTableRow({
  colSpan,
  icon,
  title,
  description,
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 py-14 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          {icon}
        </div>

        <h3 className="mt-4 font-extrabold text-slate-700">
          {title}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
      </td>
    </tr>
  );
}