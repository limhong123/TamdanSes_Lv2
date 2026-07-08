import { BookOpen, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

export default function StudentHomework() {
  const [homework, setHomework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [answer, setAnswer] = useState({});
  const [files, setFiles] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [page, setPage] = useState(1);

  const studentId =
    localStorage.getItem("student_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  const perPage = 5;

  const loadData = async () => {
    try {
      const [hwRes, subRes] = await Promise.all([
        api.get(`/homework/student/${studentId}`),
        api.get(`/submissions/student/${studentId}`),
      ]);

      setHomework(Array.isArray(hwRes.data) ? hwRes.data : []);
      setSubmissions(Array.isArray(subRes.data) ? subRes.data : []);
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

  const filteredHomework = useMemo(() => {
    let list = [...homework];

    if (selectedMonth !== "all") {
      list = list.filter((hw) => {
        if (!hw.due_date) return false;
        const month = new Date(hw.due_date).getMonth() + 1;
        return month === Number(selectedMonth);
      });
    }

    return list.sort((a, b) => {
      return new Date(b.due_date || 0) - new Date(a.due_date || 0);
    });
  }, [homework, selectedMonth]);

  const totalPages = Math.ceil(filteredHomework.length / perPage) || 1;

  const paginatedHomework = filteredHomework.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setPage(1);
  };

  const handleFilesChange = (homeworkId, selectedFiles) => {
    const newFiles = Array.from(selectedFiles || []);

    setFiles((prev) => ({
      ...prev,
      [homeworkId]: newFiles,
    }));
  };

  const removeFile = (homeworkId, index) => {
    setFiles((prev) => {
      const currentFiles = prev[homeworkId] || [];
      const updatedFiles = currentFiles.filter((_, i) => i !== index);

      return {
        ...prev,
        [homeworkId]: updatedFiles,
      };
    });
  };

  const submitHomework = async (homeworkId) => {
    const answerText = String(answer[homeworkId] || "").trim();
    const selectedFiles = files[homeworkId] || [];

    if (!answerText && selectedFiles.length === 0) {
      alert("Please write an answer or upload at least one file.");
      return;
    }

    const data = new FormData();

    data.append("homework_id", homeworkId);
    data.append("student_id", studentId);
    data.append("answer_text", answerText);

    selectedFiles.forEach((file) => {
      data.append("files", file);
    });

    try {
      await api.post("/submissions/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Homework submitted");
      loadData();

      setAnswer((prev) => ({
        ...prev,
        [homeworkId]: "",
      }));

      setFiles((prev) => ({
        ...prev,
        [homeworkId]: [],
      }));
    } catch (err) {
      alert(err?.response?.data?.detail || "Submit failed");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="text-blue-600" />

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              My Homework
            </h1>

            <p className="text-sm text-slate-500">
              View homework and submit your work
            </p>
          </div>
        </div>

        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 md:w-56"
        >
          <option value="all">All Months</option>
          <option value="1">January</option>
          <option value="2">February</option>
          <option value="3">March</option>
          <option value="4">April</option>
          <option value="5">May</option>
          <option value="6">June</option>
          <option value="7">July</option>
          <option value="8">August</option>
          <option value="9">September</option>
          <option value="10">October</option>
          <option value="11">November</option>
          <option value="12">December</option>
        </select>
      </div>

      <div className="mb-4 text-sm text-slate-500">
        Showing {paginatedHomework.length} of {filteredHomework.length} homework
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {paginatedHomework.map((hw) => {
          const submitted = getSubmission(hw.id);
          const selectedFiles = files[hw.id] || [];

          return (
            <div
              key={hw.id}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
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
                      href={hw.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block text-blue-600"
                    >
                      View homework file
                    </a>
                  )}
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    submitted
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

                  {submitted.file_paths?.length > 0 ? (
                    <div className="mt-3">
                      <p className="font-semibold text-slate-700">
                        Submitted Files:
                      </p>

                      {submitted.file_paths.map((fileUrl, index) => (
                        <a
                          key={index}
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-blue-600"
                        >
                          View submitted file {index + 1}
                        </a>
                      ))}
                    </div>
                  ) : (
                    submitted.file_path && (
                      <a
                        href={submitted.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-blue-600"
                      >
                        View submitted file
                      </a>
                    )
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
                    value={answer[hw.id] || ""}
                    onChange={(e) =>
                      setAnswer({
                        ...answer,
                        [hw.id]: e.target.value,
                      })
                    }
                  />

                  <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-slate-600">
                    <Upload size={18} />

                    <span>
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} file(s) selected`
                        : "Upload your files"}
                    </span>

                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) =>
                        handleFilesChange(hw.id, e.target.files)
                      }
                    />
                  </label>

                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-600"
                        >
                          <span className="truncate">{file.name}</span>

                          <button
                            type="button"
                            onClick={() => removeFile(hw.id, index)}
                            className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

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

        {filteredHomework.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
            No homework available
          </div>
        )}
      </div>

      {filteredHomework.length > perPage && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="rounded-xl border px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm font-semibold text-slate-600">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-xl border px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}