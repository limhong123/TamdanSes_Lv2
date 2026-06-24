import {
  CheckCircle,
  FileText,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
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

export default function TeacherScores() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [savedScores, setSavedScores] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    class_id: "",
    semester: "1",
    month: "1",
    max_score: "100",
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const getCurrentUserId = () => {
    return Number(
      localStorage.getItem("user_id") ||
        localStorage.getItem("id") ||
        localStorage.getItem("userId")
    );
  };

  const loadScores = async (params = {}) => {
    try {
      const res = await api.get("/scores/", { params });
      const data = Array.isArray(res.data) ? res.data : [];
      setSavedScores(data);
      return data;
    } catch {
      setSavedScores([]);
      return [];
    }
  };

  useEffect(() => {
    api
      .get("/classes/teacher/my-classes")
      .then((res) => setClasses(Array.isArray(res.data) ? res.data : []))
      .catch(() => setClasses([]));

    loadScores();
  }, []);

  const loadClass = async (
    classId,
    semester = form.semester,
    month = form.month
  ) => {
    setForm((prev) => ({
      ...prev,
      class_id: classId,
      semester,
      month,
    }));

    setStudents([]);
    setSubjects([]);

    if (!classId) return;

    try {
      const [classRes, scoreList] = await Promise.all([
        api.get(`/classes/${classId}`),
        loadScores({
          class_id: classId,
          semester,
          month,
        }),
      ]);

      const currentUserId = getCurrentUserId();

      const uniqueSubjects = [];
      const subjectIds = new Set();

      (classRes.data.teachers || [])
        .filter((t) => Number(t.user_id) === currentUserId)
        .forEach((t) => {
          if (t.subject_id && !subjectIds.has(t.subject_id)) {
            subjectIds.add(t.subject_id);

            uniqueSubjects.push({
              id: t.subject_id,
              name: t.subject_name,
            });
          }
        });

      setSubjects(uniqueSubjects);

      const studentsWithScores = await Promise.all(
        (classRes.data.students || []).map(async (stu) => {
          const scores = {};

          uniqueSubjects.forEach((sub) => {
            const oldScore = scoreList.find(
              (s) =>
                Number(s.student_id) === Number(stu.id) &&
                Number(s.subject_id) === Number(sub.id)
            );

            scores[sub.id] = oldScore ? String(oldScore.score) : "";
          });

          const oldBonus = scoreList.find(
            (s) => Number(s.student_id) === Number(stu.id)
          );

          let homeworkBonus = 0;

          try {
            const bonusRes = await api.get("/submissions/student-bonus", {
              params: {
                student_id: stu.id,
                class_id: classId,
              },
            });

            homeworkBonus = bonusRes.data.bonus || 0;
          } catch {
            homeworkBonus = 0;
          }

          return {
            ...stu,
            scores,
            bonus: oldBonus
              ? String(oldBonus.bonus || 0)
              : String(homeworkBonus || 0),
          };
        })
      );

      setStudents(studentsWithScores);

      if (uniqueSubjects.length === 0) {
        showMessage(
          "error",
          "You are not assigned to any subject in this class"
        );
      }
    } catch {
      showMessage("error", "Cannot load class");
    }
  };

  const handleFilterChange = (key, value) => {
    const nextForm = {
      ...form,
      [key]: value,
    };

    setForm(nextForm);

    if (nextForm.class_id) {
      loadClass(nextForm.class_id, nextForm.semester, nextForm.month);
    }
  };

  const updateScore = (studentId, subjectId, value) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              scores: {
                ...s.scores,
                [subjectId]: value,
              },
            }
          : s
      )
    );
  };

  const updateBonus = (studentId, value) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, bonus: value } : s))
    );
  };

  const getStudentTotal = (student) => {
    const scoreTotal = subjects.reduce((sum, sub) => {
      return sum + Number(student.scores?.[sub.id] || 0);
    }, 0);

    const bonus = Number(student.bonus || 0);

    return scoreTotal + bonus;
  };

  const getStudentAvg = (student) => {
    if (subjects.length === 0) return 0;
    return (getStudentTotal(student) / subjects.length).toFixed(1);
  };

  const rankedStudents = [...students]
    .map((s) => ({
      ...s,
      total: getStudentTotal(s),
      avg: Number(getStudentAvg(s)),
    }))
    .sort((a, b) => b.avg - a.avg)
    .map((s, index) => ({
      ...s,
      rank: index + 1,
    }));

  const saveScores = async () => {
    if (!form.class_id) {
      showMessage("error", "Please select class");
      return;
    }

    if (subjects.length === 0) {
      showMessage("error", "No assigned subject in this class");
      return;
    }

    const maxScore = Number(form.max_score || 100);

    try {
      for (const student of students) {
        for (const subject of subjects) {
          const value = student.scores?.[subject.id];

          if (value === "" || value === null || value === undefined) continue;

          const score = Number(value);
          const bonus = Number(student.bonus || 0);

          if (score < 0 || score > maxScore) {
            showMessage(
              "error",
              `${student.name} ${subject.name} score must be 0-${maxScore}`
            );
            return;
          }

          if (bonus < 0) {
            showMessage("error", `${student.name} bonus cannot be negative`);
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

      showMessage("success", "Scores saved successfully");

      await loadClass(form.class_id, form.semester, form.month);
      await loadScores();
    } catch (err) {
      showMessage("error", err?.response?.data?.detail || "Save failed");
    }
  };

  const deleteScore = async (scoreId) => {
    const ok = window.confirm("Are you sure you want to delete this score?");
    if (!ok) return;

    try {
      await api.delete(`/scores/${scoreId}`);

      showMessage("success", "Score deleted successfully");

      await loadScores();

      if (form.class_id) {
        await loadClass(form.class_id, form.semester, form.month);
      }
    } catch (err) {
      showMessage("error", err?.response?.data?.detail || "Delete failed");
    }
  };

  const filteredSavedScores = savedScores.filter((s) => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return true;

    return (
      String(s.student_name || "").toLowerCase().includes(keyword) ||
      String(s.class_name || "").toLowerCase().includes(keyword) ||
      String(s.subject_name || "").toLowerCase().includes(keyword) ||
      String(s.teacher_name || "").toLowerCase().includes(keyword) ||
      String(getMonthName(s.month) || "").toLowerCase().includes(keyword) ||
      String(s.semester || "").toLowerCase().includes(keyword)
    );
  });

  return (
    <div>
      {message && (
        <div
          className={`fixed right-6 top-6 z-[999] flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold shadow-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}

          {message.text}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <FileText className="text-blue-600" />

        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Manage Scores
          </h1>

          <p className="text-sm text-slate-500">
            Add, update, delete, and view all saved scores
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-800">
          Add / Update Score
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <select
            value={form.class_id}
            onChange={(e) => loadClass(e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="">Select Class</option>

            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>

          <select
            value={form.semester}
            onChange={(e) => handleFilterChange("semester", e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>

          <select
            value={form.month}
            onChange={(e) => handleFilterChange("month", e.target.value)}
            className="rounded-xl border px-4 py-3"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={form.max_score}
            onChange={(e) =>
              setForm({
                ...form,
                max_score: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
            placeholder="Max Score"
          />
        </div>
      </div>

      <div className="mb-8 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Gender</th>

              {subjects.map((subject) => (
                <th key={subject.id} className="p-4 text-left">
                  {subject.name}
                </th>
              ))}

              <th className="p-4 text-left">Bonus</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Avg</th>
              <th className="p-4 text-left">Rank</th>
            </tr>
          </thead>

          <tbody>
            {rankedStudents.map((student) => (
              <tr key={student.id} className="border-t">
                <td className="p-4 font-semibold">{student.name}</td>

                <td className="p-4">{student.gender || "-"}</td>

                {subjects.map((subject) => (
                  <td key={subject.id} className="p-4">
                    <input
                      type="number"
                      min="0"
                      max={form.max_score}
                      value={student.scores?.[subject.id] || ""}
                      onChange={(e) =>
                        updateScore(student.id, subject.id, e.target.value)
                      }
                      className="w-24 rounded-xl border px-3 py-2"
                      placeholder="0"
                    />
                  </td>
                ))}

                <td className="p-4">
                  <input
                    type="number"
                    min="0"
                    value={student.bonus || ""}
                    onChange={(e) => updateBonus(student.id, e.target.value)}
                    className="w-24 rounded-xl border px-3 py-2"
                    placeholder="0"
                  />
                </td>

                <td className="p-4 font-bold text-blue-600">
                  {student.total}
                </td>

                <td className="p-4 font-bold text-green-600">
                  {student.avg}
                </td>

                <td className="p-4 font-bold text-slate-800">
                  #{student.rank}
                </td>
              </tr>
            ))}

            {students.length === 0 && (
              <tr>
                <td
                  colSpan={subjects.length + 6}
                  className="p-8 text-center text-slate-500"
                >
                  Select class to show student score table
                </td>
              </tr>
            )}

            {students.length > 0 && subjects.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-red-500">
                  You are not assigned to any subject in this class
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {students.length > 0 && subjects.length > 0 && (
        <button
          onClick={saveScores}
          className="mb-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Save / Update Scores
        </button>
      )}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              All Saved Scores
            </h2>

            <p className="text-sm text-slate-500">
              Show all months, all classes, and all saved scores
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-4 py-3">
            <Search size={18} className="text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, class, subject, month..."
              className="w-72 bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left">Student</th>
                <th className="p-4 text-left">Class</th>
                <th className="p-4 text-left">Subject</th>
                <th className="p-4 text-left">Teacher</th>
                <th className="p-4 text-left">Semester</th>
                <th className="p-4 text-left">Month</th>
                <th className="p-4 text-left">Score</th>
                <th className="p-4 text-left">Bonus</th>
                <th className="p-4 text-left">Total</th>
                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredSavedScores.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-4 font-semibold">{s.student_name}</td>
                  <td className="p-4">{s.class_name}</td>
                  <td className="p-4">{s.subject_name}</td>
                  <td className="p-4">{s.teacher_name}</td>
                  <td className="p-4">Semester {s.semester}</td>
                  <td className="p-4">{getMonthName(s.month)}</td>
                  <td className="p-4">
                    {s.score}/{s.max_score}
                  </td>
                  <td className="p-4">+{s.bonus || 0}</td>
                  <td className="p-4 font-bold text-blue-600">
                    {s.total_score}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => deleteScore(s.id)}
                      className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSavedScores.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-500">
                    No saved scores found
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