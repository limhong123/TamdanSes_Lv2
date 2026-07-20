import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Pencil,
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

export default function TeacherHomework() {
  const [homework, setHomework] = useState([]);
  const [relations, setRelations] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);

  const [bonusInputs, setBonusInputs] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(false);
  const [savingHomework, setSavingHomework] = useState(false);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  const normalizeStatus = (value) =>
    String(value || "").trim().toLowerCase();

  const parseFiles = (value) => {
    if (!value) {
      return [];
    }

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

  const openFile = (url) => {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  };

  const loadData = async () => {
    if (!teacherId) {
      return;
    }

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
          (relation) =>
            Number(relation.teacher_id) === Number(teacherId),
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
    if (!homeworkItem?.id) {
      return;
    }

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
        (submission) =>
          normalizeStatus(submission.status) !== "checked",
      );

      setSubmissions(waitingList);

      const bonuses = {};
      const comments = {};

      waitingList.forEach((submission) => {
        bonuses[submission.id] = submission.bonus ?? 0;
        comments[submission.id] =
          submission.teacher_comment || "";
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
    if (!selectedHomework?.id) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadSubmissions(selectedHomework, false);
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
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

  const waitingCount = submissions.length;

  const resetForm = () => {
    setForm(EMPTY_FORM);
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
      console.error(
        "HOMEWORK SAVE ERROR:",
        error?.response?.data || error,
      );

      alert(
        error?.response?.data?.detail ||
          "Save homework failed",
      );
    } finally {
      setSavingHomework(false);
    }
  };

  const editHomework = (homeworkItem) => {
    setForm({
      id: homeworkItem.id,
      title: homeworkItem.title || "",
      description: homeworkItem.description || "",
      class_id: homeworkItem.class_id || "",
      subject_id: homeworkItem.subject_id || "",
      due_date: homeworkItem.due_date || "",
      file: null,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteHomework = async (homeworkItem) => {
    const confirmed = window.confirm(
      `Delete "${homeworkItem.title}"? This also removes its submissions.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(homeworkItem.id);

      await api.delete(`/homework/${homeworkItem.id}`);

      if (
        Number(selectedHomework?.id) === Number(homeworkItem.id)
      ) {
        setSelectedHomework(null);
        setSubmissions([]);
      }

      if (Number(form.id) === Number(homeworkItem.id)) {
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

  const viewSubmissions = async (homeworkItem) => {
    setSelectedHomework(homeworkItem);
    await loadSubmissions(homeworkItem);
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
        current.filter(
          (submission) => submission.id !== submissionId,
        ),
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

      alert("Submission checked successfully");
    } catch (error) {
      console.error(
        "REVIEW ERROR:",
        error?.response?.data || error,
      );

      alert(
        error?.response?.data?.detail ||
          "Review failed",
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-7">
      <section className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-7 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <BookOpen size={30} />
          </div>

          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              Teacher Homework
            </h1>

            <p className="mt-1 text-blue-100">
              Create homework and review submitted student work.
            </p>
          </div>
        </div>
      </section>

      {!teacherId && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">
          Teacher ID not found. Please logout and login again.
        </div>
      )}

      <form
        onSubmit={submitHomework}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {form.id ? "Update Homework" : "Create Homework"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add the class, subject, deadline, instructions, and file.
            </p>
          </div>

          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Homework title
            </span>

            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Enter homework title"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Due date
            </span>

            <input
              type="date"
              value={form.due_date}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  due_date: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Class
            </span>

            <select
              value={form.class_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  class_id: event.target.value,
                  subject_id: "",
                }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              required
            >
              <option value="">Select class</option>

              {classOptions.map((classItem) => (
                <option
                  key={classItem.value}
                  value={classItem.value}
                >
                  {classItem.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">
              Subject
            </span>

            <select
              value={form.subject_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subject_id: event.target.value,
                }))
              }
              disabled={!form.class_id}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              required
            >
              <option value="">
                {form.class_id
                  ? "Select subject"
                  : "Select class first"}
              </option>

              {subjectOptions.map((subjectItem) => (
                <option
                  key={subjectItem.value}
                  value={subjectItem.value}
                >
                  {subjectItem.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Description
          </span>

          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Write homework instructions"
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
        </label>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50">
          <Upload size={21} className="text-blue-600" />

          <div>
            <p className="font-semibold">
              {form.file
                ? form.file.name
                : "Upload homework attachment"}
            </p>

            <p className="text-xs text-slate-400">
              PDF, image, Word, ZIP, or RAR
            </p>
          </div>

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
          className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-400"
        >
          {savingHomework
            ? "Saving..."
            : form.id
              ? "Update Homework"
              : "Create Homework"}
        </button>
      </form>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Homework List
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Homework stays in this list so you can edit, delete, or review submissions.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Loading homework...
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {homework.map((homeworkItem) => (
              <article
                key={homeworkItem.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-3 py-2 font-medium text-amber-600 transition hover:bg-amber-50"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteHomework(homeworkItem)}
                      disabled={deletingId === homeworkItem.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-3 py-2 font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
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

                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  Due: {homeworkItem.due_date}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {homeworkItem.file_path && (
                    <button
                      type="button"
                      onClick={() => openFile(homeworkItem.file_path)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      <FileText size={17} />
                      View attachment
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => viewSubmissions(homeworkItem)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Eye size={17} />
                    View submissions
                  </button>
                </div>
              </article>
            ))}

            {homework.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 md:col-span-2">
                No homework found
              </div>
            )}
          </div>
        )}
      </section>

      {selectedHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Student Submissions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedHomework.title}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSubmissionModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close modal"
              >
                <X size={25} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white p-3 text-amber-600 shadow-sm">
                    <Clock3 size={27} />
                  </div>

                  <div>
                    <p className="font-semibold text-slate-700">
                      Waiting for teacher
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Submitted work stays here until you check it.
                    </p>
                  </div>
                </div>

                <p className="text-4xl font-bold text-amber-700">
                  {waitingCount}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 px-5 py-4 text-sm text-blue-700">
                After you check a submission, it is removed from this waiting list immediately. The homework card stays available for editing or deleting.
              </div>

              {submissionLoading ? (
                <div className="rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  Loading submissions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-14 text-center">
                  <CheckCircle2
                    size={52}
                    className="mx-auto text-green-500"
                  />

                  <h3 className="mt-4 text-lg font-bold text-slate-800">
                    No submissions waiting
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Students have not submitted yet, or every submitted homework has already been checked.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[1050px] text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-4 text-left">Student</th>
                        <th className="px-4 py-4 text-left">Answer</th>
                        <th className="px-4 py-4 text-left">Files</th>
                        <th className="px-4 py-4 text-left">Bonus</th>
                        <th className="px-4 py-4 text-left">Comment</th>
                        <th className="px-4 py-4 text-left">Status</th>
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
                            className="border-t border-slate-100 align-top transition hover:bg-slate-50/70"
                          >
                            <td className="px-4 py-4 font-semibold text-slate-900">
                              {submission.student_name || "-"}
                            </td>

                            <td className="max-w-[240px] whitespace-pre-wrap px-4 py-4 text-slate-600">
                              {submission.answer_text || "-"}
                            </td>

                            <td className="px-4 py-4">
                              {uploadedFiles.length > 0 ? (
                                <div className="space-y-2">
                                  {uploadedFiles.map(
                                    (fileUrl, index) => (
                                      <button
                                        key={`${fileUrl}-${index}`}
                                        type="button"
                                        onClick={() => openFile(fileUrl)}
                                        className="block font-medium text-blue-600 hover:underline"
                                      >
                                        View file {index + 1}
                                      </button>
                                    ),
                                  )}
                                </div>
                              ) : submission.file_path ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openFile(submission.file_path)
                                  }
                                  className="font-medium text-blue-600 hover:underline"
                                >
                                  View file
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
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
                                className="w-24 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100"
                                placeholder="0"
                              />
                            </td>

                            <td className="px-4 py-4">
                              <input
                                type="text"
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
                                className="w-56 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100"
                                placeholder="Teacher comment"
                              />
                            </td>

                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                <Clock3 size={14} />
                                Waiting
                              </span>
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
                                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-wait disabled:bg-green-400"
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
