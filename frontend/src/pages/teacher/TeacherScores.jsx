import { CheckCircle, FileText, History, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeacherScores() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [savedScores, setSavedScores] = useState([]);
  const [message, setMessage] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const loadScores = () => {
    api
      .get("/scores/")
      .then((res) => setSavedScores(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSavedScores([]));
  };

  useEffect(() => {
    api
      .get("/classes/teacher/my-classes")
      .then((res) => setClasses(res.data))
      .catch(() => setClasses([]));

    loadScores();
  }, []);


  const getCurrentUserId = () => {
    return Number(
      localStorage.getItem("user_id") ||
      localStorage.getItem("id") ||
      localStorage.getItem("userId")
    );
  };

  const loadClass = async (classId) => {
    setForm((prev) => ({
      ...prev,
      class_id: classId,
    }));

    setStudents([]);
    setSubjects([]);

    if (!classId) return;

    try {
      const res = await api.get(`/classes/${classId}`);

      const currentUserId = getCurrentUserId();

      const uniqueSubjects = [];
      const subjectIds = new Set();

      (res.data.teachers || [])
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

      const studentsWithBonus = await Promise.all(
        (res.data.students || []).map(async (stu) => {
          const scores = {};

          uniqueSubjects.forEach((sub) => {
            scores[sub.id] = "";
          });

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
            bonus: homeworkBonus,
          };
        })
      );

      setStudents(studentsWithBonus);

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
    const maxScore = Number(form.max_score || 100);

    const scoreTotal = subjects.reduce((sum, sub) => {
      const raw = Number(student.scores?.[sub.id] || 0);
      return sum + Math.min(raw, maxScore);
    }, 0);

    const bonus = Number(student.bonus || 0);

    return Math.min(scoreTotal + bonus, subjects.length * maxScore);
  };

  const getStudentAvg = (student) => {
    if (subjects.length === 0) return 0;

    const maxScore = Number(form.max_score || 100);
    const maxTotal = subjects.length * maxScore;

    return ((getStudentTotal(student) / maxTotal) * 100).toFixed(1);
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
      loadScores();
    } catch (err) {
      showMessage("error", err?.response?.data?.detail || "Save failed");
    }
  };

  const historyScores = savedScores.filter((s) => {
    const matchClass = form.class_id
      ? String(s.class_id) === String(form.class_id)
      : true;

    const matchSemester = String(s.semester) === String(form.semester);
    const matchMonth = String(s.month) === String(form.month);

    return matchClass && matchSemester && matchMonth;
  });

  return (
    <div>
      {message && (
        <div
          className={`fixed right-6 top-6 z-[999] flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold shadow-lg ${message.type === "success"
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

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-blue-600" />

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Manage Scores
            </h1>

            <p className="text-sm text-slate-500">
              Add scores only for subjects assigned to you
            </p>
          </div>
        </div>

        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          <History size={18} />
          History
        </button>
      </div>

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
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
            onChange={(e) =>
              setForm({
                ...form,
                semester: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
          >
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>

          <select
            value={form.month}
            onChange={(e) =>
              setForm({
                ...form,
                month: e.target.value,
              })
            }
            className="rounded-xl border px-4 py-3"
          >
            <option value="1">Month 1</option>
            <option value="2">Month 2</option>
            <option value="3">Month 3</option>
            <option value="4">Month 4</option>
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

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
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
                  {student.avg}%
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
                <td
                  colSpan="7"
                  className="p-8 text-center text-red-500"
                >
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
          className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Save Month Scores
        </button>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[85vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Score History
              </h2>

              <button onClick={() => setHistoryOpen(false)}>
                <X />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">Student</th>
                    <th className="p-4 text-left">Class</th>
                    <th className="p-4 text-left">Subject</th>
                    <th className="p-4 text-left">Semester</th>
                    <th className="p-4 text-left">Month</th>
                    <th className="p-4 text-left">Score</th>
                    <th className="p-4 text-left">Bonus</th>
                    <th className="p-4 text-left">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {historyScores.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-4">{s.student_name}</td>
                      <td className="p-4">{s.class_name}</td>
                      <td className="p-4">{s.subject_name}</td>
                      <td className="p-4">Semester {s.semester}</td>
                      <td className="p-4">Month {s.month}</td>
                      <td className="p-4">
                        {s.score}/{s.max_score}
                      </td>
                      <td className="p-4">+{s.bonus || 0}</td>
                      <td className="p-4 font-bold text-blue-600">
                        {s.total_score}/{s.max_score}
                      </td>
                    </tr>
                  ))}

                  {historyScores.length === 0 && (
                    <tr>
                      <td
                        colSpan="8"
                        className="p-8 text-center text-slate-500"
                      >
                        No history for selected class / semester / month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}