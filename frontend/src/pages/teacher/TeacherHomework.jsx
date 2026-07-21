import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/axios";

const EMPTY_FORM = {
  id: null,
  title: "",
  description: "",
  class_id: "",
  subject_id: "",
  due_date: "",
  file: null,
};

const normalizeStatus = (value) =>
  String(value || "").trim().toLowerCase();

const parseFiles = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
};

const formatDueDate = (value) => {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function TeacherHomework() {
  const [homework, setHomework] = useState([]);
  const [relations, setRelations] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);

  const [bonusInputs, setBonusInputs] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [savingHomework, setSavingHomework] = useState(false);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  const openFile = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const loadData = async () => {
    if (!teacherId) return;

    try {
      setLoading(true);

      const [homeworkRes, relationRes] = await Promise.all([
        api.get(`/homework/teacher/${teacherId}`),
        api.get("/class-teachers/"),
      ]);

      setHomework(
        Array.isArray(homeworkRes.data)
          ? homeworkRes.data
          : [],
      );

      const relationList = Array.isArray(relationRes.data)
        ? relationRes.data
        : [];

      setRelations(
        relationList.filter(
          (item) =>
            Number(item.teacher_id) === Number(teacherId),
        ),
      );
    } catch (error) {
      console.error(
        "LOAD HOMEWORK ERROR:",
        error?.response?.data || error,
      );

      setHomework([]);
      setRelations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (
    homeworkItem,
    showLoading = true,
  ) => {
    if (!homeworkItem?.id) return;

    try {
      if (showLoading) {
        setSubmissionLoading(true);
      }

      const response = await api.get(
        `/submissions/homework/${homeworkItem.id}`,
      );

      const list = Array.isArray(response.data)
        ? response.data
        : [];

      const waitingList = list.filter(
        (item) => normalizeStatus(item.status) !== "checked",
      );

      setSubmissions(waitingList);

      const bonuses = {};
      const comments = {};

      waitingList.forEach((item) => {
        bonuses[item.id] = item.bonus ?? 0;
        comments[item.id] = item.teacher_comment || "";
      });

      setBonusInputs(bonuses);
      setCommentInputs(comments);
    } catch (error) {
      console.error(
        "LOAD SUBMISSIONS ERROR:",
        error?.response?.data || error,
      );

      setSubmissions([]);
    } finally {
      if (showLoading) {
        setSubmissionLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [teacherId]);

  useEffect(() => {
    if (!selectedHomework?.id) return undefined;

    const intervalId = window.setInterval(() => {
      loadSubmissions(selectedHomework, false);
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [selectedHomework?.id]);

  const classOptions = useMemo(() => {
    const options = [];

    relations.forEach((relation) => {
      const exists = options.some(
        (item) =>
          Number(item.value) === Number(relation.class_id),
      );

      if (!exists) {
        options.push({
          value: relation.class_id,
          label: `${relation.class_name || ""} ${
            relation.class_section || ""
          }`.trim(),
        });
      }
    });

    return options;
  }, [relations]);

  const subjectOptions = useMemo(() => {
    const options = [];

    relations
      .filter(
        (relation) =>
          Number(relation.class_id) === Number(form.class_id),
      )
      .forEach((relation) => {
        const exists = options.some(
          (item) =>
            Number(item.value) === Number(relation.subject_id),
        );

        if (!exists) {
          options.push({
            value: relation.subject_id,
            label:
              relation.subject_name ||
              `Subject ${relation.subject_id}`,
          });
        }
      });

    return options;
  }, [relations, form.class_id]);

  const filteredHomework = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return homework;

    return homework.filter((item) =>
      [
        item.title,
        item.description,
        item.class_name,
        item.subject_name,
        item.due_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [homework, search]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const submitHomework = async (event) => {
    event.preventDefault();

    if (!teacherId) {
      alert("Teacher ID not found. Please logout and login again.");
      return;
    }

    const data = new FormData();

    data.append("title", form.title);
    data.append("description", form.description);
    data.append("class_id", form.class_id);
    data.append("subject_id", form.subject_id);
    data.append("teacher_id", teacherId);
    data.append("due_date", form.due_date);

    if (form.file) {
      data.append("file", form.file);
    }

    try {
      setSavingHomework(true);

      if (form.id) {
        await api.put(`/homework/${form.id}`, data, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        alert("Homework updated successfully");
      } else {
        await api.post("/homework/", data, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        alert("Homework created successfully");
      }

      resetForm();
      await loadData();
    } catch (error) {
      alert(
        error?.response?.data?.detail ||
          "Save homework failed",
      );
    } finally {
      setSavingHomework(false);
    }
  };

  const editHomework = (item) => {
    setForm({
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      class_id: item.class_id || "",
      subject_id: item.subject_id || "",
      due_date: item.due_date || "",
      file: null,
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteHomework = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.title}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(item.id);

      await api.delete(`/homework/${item.id}`);

      if (Number(selectedHomework?.id) === Number(item.id)) {
        setSelectedHomework(null);
        setSubmissions([]);
      }

      if (Number(form.id) === Number(item.id)) {
        resetForm();
      }

      await loadData();
      alert("Homework deleted successfully");
    } catch (error) {
      alert(
        error?.response?.data?.detail ||
          "Delete homework failed",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const viewSubmissions = async (item) => {
    if (Number(item.waiting_count || 0) === 0) {
      return;
    }

    setSelectedHomework(item);
    await loadSubmissions(item);
  };

  const closeSubmissionModal = () => {
    setSelectedHomework(null);
    setSubmissions([]);
    setBonusInputs({});
    setCommentInputs({});
  };

  const reviewSubmission = async (submissionId) => {
    const bonus = Number(bonusInputs[submissionId] || 0);

    if (Number.isNaN(bonus) || bonus < 0) {
      alert("Bonus must be 0 or greater");
      return;
    }

    try {
      setReviewingId(submissionId);

      await api.put(
        `/submissions/${submissionId}/review`,
        {
          score: bonus,
          bonus,
          teacher_comment:
            commentInputs[submissionId]?.trim() ||
            "Checked by teacher",
        },
      );

      setSubmissions((current) =>
        current.filter((item) => item.id !== submissionId),
      );

      setHomework((current) =>
        current.map((item) => {
          if (
            Number(item.id) !== Number(selectedHomework?.id)
          ) {
            return item;
          }

          return {
            ...item,
            waiting_count: Math.max(
              Number(item.waiting_count || 0) - 1,
              0,
            ),
            checked_count:
              Number(item.checked_count || 0) + 1,
          };
        }),
      );

      setBonusInputs((current) => {
        const next = { ...current };
        delete next[submissionId];
        return next;
      });

      setCommentInputs((current) => {
        const next = { ...current };
        delete next[submissionId];
        return next;
      });
    } catch (error) {
      alert(
        error?.response?.data?.detail ||
          "Review failed",
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-7 pb-10">
      <section className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-7 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/15 p-3">
              <BookOpen size={30} />
            </div>

            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Teacher Homework
              </h1>

              <p className="mt-1 text-blue-100">
                Only active homework is shown. A card disappears the day after its due date.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm && !form.id) {
                setShowForm(false);
              } else {
                setForm(EMPTY_FORM);
                setShowForm(true);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            {showForm && !form.id ? (
              <X size={19} />
            ) : (
              <Plus size={19} />
            )}

            {showForm && !form.id
              ? "Close Form"
              : "Create Homework"}
          </button>
        </div>
      </section>

      {showForm && (
        <form
          onSubmit={submitHomework}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {form.id ? "Update Homework" : "Create Homework"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                The homework remains visible through the full due date.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Homework title"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              required
            />

            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={form.due_date}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  due_date: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              required
            />

            <select
              value={form.class_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  class_id: event.target.value,
                  subject_id: "",
                }))
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
              required
            >
              <option value="">Select class</option>

              {classOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={form.subject_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subject_id: event.target.value,
                }))
              }
              disabled={!form.class_id}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none disabled:bg-slate-100"
              required
            >
              <option value="">
                {form.class_id
                  ? "Select subject"
                  : "Select class first"}
              </option>

              {subjectOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Homework description"
            rows={4}
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none"
          />

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-slate-600 hover:border-blue-300">
            <Upload size={21} className="text-blue-600" />

            <span className="font-semibold">
              {form.file
                ? form.file.name
                : "Upload homework attachment"}
            </span>

            <input
              type="file"
              className="hidden"
              accept=".pdf,image/*,.doc,.docx,.zip,.rar"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  file: event.target.files?.[0] || null,
                }))
              }
            />
          </label>

          <button
            type="submit"
            disabled={savingHomework}
            className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400"
          >
            {savingHomework
              ? "Saving..."
              : form.id
                ? "Update Homework"
                : "Create Homework"}
          </button>
        </form>
      )}

      <section>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Active Homework
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Expired homework is automatically removed from this list.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search homework..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border bg-white p-12 text-center text-slate-500">
            Loading homework...
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredHomework.map((homeworkItem) => {
              const waiting = Number(
                homeworkItem.waiting_count || 0,
              );

              return (
                <article
                  key={homeworkItem.id}
                  className="flex min-h-[310px] flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-bold text-slate-900">
                        {homeworkItem.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {homeworkItem.class_name || "No class"}
                        {" • "}
                        {homeworkItem.subject_name || "No subject"}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => editHomework(homeworkItem)}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-3 py-2 text-amber-600 hover:bg-amber-50"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteHomework(homeworkItem)}
                        disabled={deletingId === homeworkItem.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                        {deletingId === homeworkItem.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-slate-600">
                    {homeworkItem.description || "No description"}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                      <CalendarDays size={17} />
                      Due • {formatDueDate(homeworkItem.due_date)}
                    </span>

                    {waiting > 0 ? (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                        <Clock3 size={17} />
                        {waiting} waiting
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 size={17} />
                        No submissions waiting
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    {homeworkItem.file_path && (
                      <button
                        type="button"
                        onClick={() =>
                          openFile(homeworkItem.file_path)
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
                      >
                        <FileText size={17} />
                        Attachment
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => viewSubmissions(homeworkItem)}
                      disabled={waiting === 0}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold ${
                        waiting > 0
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "cursor-not-allowed bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Eye size={17} />
                      {waiting > 0
                        ? `View ${waiting} submission${
                            waiting > 1 ? "s" : ""
                          }`
                        : "Nothing to review"}
                    </button>
                  </div>
                </article>
              );
            })}

            {filteredHomework.length === 0 && (
              <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500 md:col-span-2">
                No active homework
              </div>
            )}
          </div>
        )}
      </section>

      {selectedHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b bg-white px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Waiting Submissions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedHomework.title}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSubmissionModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={25} />
              </button>
            </div>

            <div className="p-6">
              {submissionLoading ? (
                <div className="p-12 text-center text-slate-500">
                  Loading submissions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="rounded-3xl border border-dashed bg-slate-50 p-14 text-center">
                  <CheckCircle2
                    size={52}
                    className="mx-auto text-green-500"
                  />

                  <h3 className="mt-4 text-lg font-bold">
                    All clear
                  </h3>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-4 text-left">Student</th>
                        <th className="px-4 py-4 text-left">Answer</th>
                        <th className="px-4 py-4 text-left">Files</th>
                        <th className="px-4 py-4 text-left">Bonus</th>
                        <th className="px-4 py-4 text-left">Comment</th>
                        <th className="px-4 py-4 text-left">Submitted</th>
                        <th className="px-4 py-4 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {submissions.map((submission) => {
                        const uploadedFiles = parseFiles(
                          submission.file_paths,
                        );

                        const isReviewing =
                          reviewingId === submission.id;

                        return (
                          <tr
                            key={submission.id}
                            className="border-t align-top"
                          >
                            <td className="px-4 py-4 font-semibold">
                              {submission.student_name || "-"}
                            </td>

                            <td className="max-w-[240px] whitespace-pre-wrap px-4 py-4">
                              {submission.answer_text || "-"}
                            </td>

                            <td className="px-4 py-4">
                              {uploadedFiles.length > 0 ? (
                                uploadedFiles.map((url, index) => (
                                  <button
                                    key={`${url}-${index}`}
                                    type="button"
                                    onClick={() => openFile(url)}
                                    className="block text-blue-600 hover:underline"
                                  >
                                    View file {index + 1}
                                  </button>
                                ))
                              ) : (
                                "-"
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <input
                                type="number"
                                min="0"
                                value={
                                  bonusInputs[submission.id] ?? ""
                                }
                                onChange={(event) =>
                                  setBonusInputs((current) => ({
                                    ...current,
                                    [submission.id]: event.target.value,
                                  }))
                                }
                                disabled={isReviewing}
                                className="w-24 rounded-xl border px-3 py-2"
                              />
                            </td>

                            <td className="px-4 py-4">
                              <input
                                value={
                                  commentInputs[submission.id] ?? ""
                                }
                                onChange={(event) =>
                                  setCommentInputs((current) => ({
                                    ...current,
                                    [submission.id]: event.target.value,
                                  }))
                                }
                                disabled={isReviewing}
                                className="w-56 rounded-xl border px-3 py-2"
                                placeholder="Teacher comment"
                              />
                            </td>

                            <td className="px-4 py-4 text-xs text-slate-500">
                              {formatDateTime(
                                submission.submitted_at,
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  reviewSubmission(submission.id)
                                }
                                disabled={isReviewing}
                                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white disabled:bg-green-400"
                              >
                                <CheckCircle2 size={17} />
                                {isReviewing
                                  ? "Checking..."
                                  : "Check"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
