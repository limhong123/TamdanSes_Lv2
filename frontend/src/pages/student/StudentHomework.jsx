import { BookOpen, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentHomework() {
  const [homework, setHomework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [answer, setAnswer] = useState({});
  const [files, setFiles] = useState({});

  const studentId =
    localStorage.getItem("student_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");
  const loadData = async () => {
    try {
      const [hwRes, subRes] = await Promise.all([
        api.get(`/homework/student/${studentId}`),
        api.get(`/submissions/student/${studentId}`),
      ]);

      setHomework(hwRes.data);
      setSubmissions(subRes.data);
    } catch {
      setHomework([]);
      setSubmissions([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getSubmission = (homeworkId) => {
    return submissions.find((s) => s.homework_id === homeworkId);
  };

  const submitHomework = async (homeworkId) => {
    const data = new FormData();

    data.append("homework_id", homeworkId);
    data.append("student_id", studentId);
    data.append("answer_text", answer[homeworkId] || "");

    if (files[homeworkId]) {
      data.append("file", files[homeworkId]);
    }

    try {
      await api.post("/submissions/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Homework submitted");
      loadData();
    } catch (err) {
      alert(err?.response?.data?.detail || "Submit failed");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <BookOpen className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Homework</h1>
          <p className="text-sm text-slate-500">
            View homework and submit your work
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {homework.map((hw) => {
          const submitted = getSubmission(hw.id);

          return (
            <div key={hw.id} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {hw.title}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {hw.subject_name} • Teacher: {hw.teacher_name}
                  </p>

                  <p className="mt-3 text-slate-700">{hw.description}</p>

                  <p className="mt-3 text-sm font-semibold text-red-600">
                    Due: {hw.due_date}
                  </p>

                  {hw.file_path && (
                    <a
                      href={`http://127.0.0.1:8000/${hw.file_path}`}
                      target="_blank"
                      className="mt-3 block text-blue-600"
                    >
                     View homework file
                    </a>
                  )}
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${submitted
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                    }`}
                >
                  {submitted ? submitted.status : "pending"}
                </span>
              </div>

              {submitted ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-700">Your Answer:</p>
                  <p className="mt-1 text-slate-600">
                    {submitted.answer_text || "-"}
                  </p>

                  {submitted.file_path && (
                    <a
                      href={`http://127.0.0.1:8000/${submitted.file_path}`}
                      target="_blank"
                      className="mt-2 block text-blue-600"
                    >
                      View submitted file
                    </a>
                  )}

                  {submitted.teacher_comment && (
                    <p className="mt-3 text-slate-600">
                      Teacher Comment: {submitted.teacher_comment}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5">
                  <textarea
                    placeholder="Write your answer..."
                    className="w-full rounded-xl border px-4 py-3"
                    rows="4"
                    onChange={(e) =>
                      setAnswer({ ...answer, [hw.id]: e.target.value })
                    }
                  />

                  <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-slate-600">
                    <Upload size={18} />
                    <span>
                      {files[hw.id] ? files[hw.id].name : "Upload your file"}
                    </span>

                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        setFiles({ ...files, [hw.id]: e.target.files[0] })
                      }
                    />
                  </label>

                  <button
                    onClick={() => submitHomework(hw.id)}
                    className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    Submit Homework
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {homework.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
            No homework available
          </div>
        )}
      </div>
    </div>
  );
}