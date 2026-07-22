import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
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

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parseFiles(value) {
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
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function formatDueDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(
  error,
  fallbackMessage = "Something went wrong",
) {
  const responseData = error?.response?.data;
  const detail = responseData?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        const location = Array.isArray(item?.loc)
          ? item.loc
              .filter(
                (part) =>
                  part !== "body" &&
                  part !== "query" &&
                  part !== "path",
              )
              .join(".")
          : "";

        const message =
          item?.msg ||
          item?.message ||
          "Validation error";

        return location
          ? `${location}: ${message}`
          : message;
      })
      .join("\n");
  }

  if (
    detail &&
    typeof detail === "object"
  ) {
    if (typeof detail.message === "string") {
      return detail.message;
    }

    if (typeof detail.error === "string") {
      return detail.error;
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return fallbackMessage;
    }
  }

  if (
    typeof responseData?.message === "string"
  ) {
    return responseData.message;
  }

  if (
    typeof responseData?.error === "string"
  ) {
    return responseData.error;
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return fallbackMessage;
}

export default function TeacherHomework() {
  const [homework, setHomework] = useState([]);
  const [relations, setRelations] = useState([]);
  const [submissions, setSubmissions] =
    useState([]);

  const [
    selectedHomework,
    setSelectedHomework,
  ] = useState(null);

  const [bonusInputs, setBonusInputs] =
    useState({});

  const [applyBonusInputs, setApplyBonusInputs] =
    useState({});

  const [commentInputs, setCommentInputs] =
    useState({});

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    savingHomework,
    setSavingHomework,
  ] = useState(false);

  const [
    submissionLoading,
    setSubmissionLoading,
  ] = useState(false);

  const [reviewingId, setReviewingId] =
    useState(null);

  const [deletingId, setDeletingId] =
    useState(null);

  const [message, setMessage] =
    useState(null);

  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

  const showMessage = (
    type,
    text,
    duration = 3000,
  ) => {
    setMessage({
      type,
      text,
    });

    window.setTimeout(() => {
      setMessage(null);
    }, duration);
  };

  const openFile = (url) => {
    if (!url) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const loadData = async () => {
    if (!teacherId) {
      return;
    }

    try {
      setLoading(true);

      const [
        homeworkResponse,
        relationResponse,
      ] = await Promise.all([
        api.get(
          `/homework/teacher/${teacherId}`,
        ),
        api.get("/class-teachers/"),
      ]);

      const homeworkList = Array.isArray(
        homeworkResponse.data,
      )
        ? homeworkResponse.data
        : [];

      const relationList = Array.isArray(
        relationResponse.data,
      )
        ? relationResponse.data
        : [];

      setHomework(homeworkList);

      setRelations(
        relationList.filter(
          (item) =>
            Number(item.teacher_id) ===
            Number(teacherId),
        ),
      );
    } catch (error) {
      console.error(
        "LOAD HOMEWORK ERROR:",
        error?.response?.data || error,
      );

      setHomework([]);
      setRelations([]);

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Cannot load homework",
        ),
      );
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
      (item) =>
        normalizeStatus(item.status) !==
        "checked",
    );

    setSubmissions(waitingList);

    const bonuses = {};
    const comments = {};
    const applyBonuses = {};

    waitingList.forEach((item) => {
      bonuses[item.id] =
        item.bonus ?? 0;

      comments[item.id] =
        item.teacher_comment || "";

      applyBonuses[item.id] = false;
    });

    setBonusInputs(bonuses);
    setCommentInputs(comments);
    setApplyBonusInputs(applyBonuses);
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

    const intervalId =
      window.setInterval(() => {
        loadSubmissions(
          selectedHomework,
          false,
        );
      }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedHomework?.id]);

  const classOptions = useMemo(() => {
    const classMap = new Map();

    relations.forEach((relation) => {
      const classId = String(
        relation.class_id,
      );

      if (!classMap.has(classId)) {
        classMap.set(classId, {
          value: relation.class_id,
          label: `${
            relation.class_name || ""
          } ${
            relation.class_section || ""
          }`.trim(),
        });
      }
    });

    return Array.from(
      classMap.values(),
    ).sort((a, b) =>
      String(a.label).localeCompare(
        String(b.label),
      ),
    );
  }, [relations]);

  const subjectOptions = useMemo(() => {
    if (!form.class_id) {
      return [];
    }

    const subjectMap = new Map();

    relations
      .filter(
        (relation) =>
          Number(relation.class_id) ===
          Number(form.class_id),
      )
      .forEach((relation) => {
        const subjectId = String(
          relation.subject_id,
        );

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            value: relation.subject_id,
            label:
              relation.subject_name ||
              `Subject ${relation.subject_id}`,
          });
        }
      });

    return Array.from(
      subjectMap.values(),
    ).sort((a, b) =>
      String(a.label).localeCompare(
        String(b.label),
      ),
    );
  }, [relations, form.class_id]);

  const filteredHomework = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return homework;
    }

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

  const submitHomework = async (
    event,
  ) => {
    event.preventDefault();

    if (!teacherId) {
      showMessage(
        "error",
        "Teacher ID not found. Please logout and login again.",
      );
      return;
    }

    if (
      !form.title.trim() ||
      !form.class_id ||
      !form.subject_id ||
      !form.due_date
    ) {
      showMessage(
        "error",
        "Please complete all required fields",
      );
      return;
    }

    const formData = new FormData();

    formData.append(
      "title",
      form.title.trim(),
    );

    formData.append(
      "description",
      form.description.trim(),
    );

    formData.append(
      "class_id",
      form.class_id,
    );

    formData.append(
      "subject_id",
      form.subject_id,
    );

    formData.append(
      "teacher_id",
      teacherId,
    );

    formData.append(
      "due_date",
      form.due_date,
    );

    if (form.file) {
      formData.append(
        "file",
        form.file,
      );
    }

    try {
      setSavingHomework(true);

      if (form.id) {
        await api.put(
          `/homework/${form.id}`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          },
        );

        showMessage(
          "success",
          "Homework updated successfully",
        );
      } else {
        await api.post(
          "/homework/",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          },
        );

        showMessage(
          "success",
          "Homework created successfully",
        );
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error(
        "SAVE HOMEWORK ERROR:",
        error?.response?.data || error,
      );

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Save homework failed",
        ),
        5000,
      );
    } finally {
      setSavingHomework(false);
    }
  };

  const editHomework = (item) => {
    setForm({
      id: item.id,
      title: item.title || "",
      description:
        item.description || "",
      class_id: item.class_id || "",
      subject_id:
        item.subject_id || "",
      due_date: item.due_date || "",
      file: null,
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteHomework = async (
    item,
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${item.title}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);

      await api.delete(
        `/homework/${item.id}`,
      );

      if (
        Number(selectedHomework?.id) ===
        Number(item.id)
      ) {
        setSelectedHomework(null);
        setSubmissions([]);
        setBonusInputs({});
        setApplyBonusInputs({});
        setCommentInputs({});
      }

      if (
        Number(form.id) ===
        Number(item.id)
      ) {
        resetForm();
      }

      await loadData();

      showMessage(
        "success",
        "Homework deleted successfully",
      );
    } catch (error) {
      console.error(
        "DELETE HOMEWORK ERROR:",
        error?.response?.data || error,
      );

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Delete homework failed",
        ),
        5000,
      );
    } finally {
      setDeletingId(null);
    }
  };

  const viewSubmissions = async (
    item,
  ) => {
    const waitingCount = Number(
      item.waiting_count || 0,
    );

    if (waitingCount === 0) {
      return;
    }

    setSelectedHomework(item);
    await loadSubmissions(item);
  };

  const closeSubmissionModal = () => {
    if (reviewingId) {
      return;
    }

    setSelectedHomework(null);
    setSubmissions([]);
    setBonusInputs({});
    setApplyBonusInputs({});
    setCommentInputs({});
  };

  const reviewSubmission = async (
    submissionId,
  ) => {
    const applyBonus = Boolean(
      applyBonusInputs[submissionId],
    );

    const rawBonus =
      bonusInputs[submissionId];

    const bonus = applyBonus
      ? Number(rawBonus || 0)
      : 0;

    if (
      Number.isNaN(bonus) ||
      bonus < 0
    ) {
      showMessage(
        "error",
        "Bonus must be 0 or greater",
      );
      return;
    }

    const teacherComment =
      String(
        commentInputs[submissionId] ||
          "",
      ).trim() ||
      "Checked by teacher";

    try {
      setReviewingId(submissionId);

      const payload = {
        apply_bonus: applyBonus,
        bonus,
        teacher_comment:
          teacherComment,
      };

      await api.put(
        `/submissions/${submissionId}/review`,
        payload,
      );

      setSubmissions(
        (currentSubmissions) =>
          currentSubmissions.filter(
            (item) =>
              Number(item.id) !==
              Number(submissionId),
          ),
      );

      setHomework(
        (currentHomework) =>
          currentHomework.map(
            (homeworkItem) => {
              if (
                Number(
                  homeworkItem.id,
                ) !==
                Number(
                  selectedHomework?.id,
                )
              ) {
                return homeworkItem;
              }

              return {
                ...homeworkItem,
                waiting_count: Math.max(
                  Number(
                    homeworkItem.waiting_count ||
                      0,
                  ) - 1,
                  0,
                ),
                checked_count:
                  Number(
                    homeworkItem.checked_count ||
                      0,
                  ) + 1,
              };
            },
          ),
      );

      setSelectedHomework(
        (currentHomework) => {
          if (!currentHomework) {
            return null;
          }

          return {
            ...currentHomework,
            waiting_count: Math.max(
              Number(
                currentHomework.waiting_count ||
                  0,
              ) - 1,
              0,
            ),
            checked_count:
              Number(
                currentHomework.checked_count ||
                  0,
              ) + 1,
          };
        },
      );

      setBonusInputs((current) => {
        const next = { ...current };
        delete next[submissionId];
        return next;
      });

      setApplyBonusInputs((current) => {
        const next = { ...current };
        delete next[submissionId];
        return next;
      });

      setCommentInputs((current) => {
        const next = { ...current };
        delete next[submissionId];
        return next;
      });

      showMessage(
        "success",
        applyBonus
          ? "Submission checked and bonus added to score"
          : "Submission checked successfully",
      );
    } catch (error) {
      console.error(
        "REVIEW SUBMISSION ERROR:",
        error?.response?.data || error,
      );

      showMessage(
        "error",
        getErrorMessage(
          error,
          "Review submission failed",
        ),
        6000,
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-7 pb-10">
      {message && (
        <div
          className={`fixed right-5 top-5 z-[200] flex max-w-md items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-bold shadow-xl ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type ===
          "success" ? (
            <CheckCircle2
              size={21}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <XCircle
              size={21}
              className="mt-0.5 shrink-0"
            />
          )}

          <span className="whitespace-pre-line leading-6">
            {message.text}
          </span>

          <button
            type="button"
            onClick={() =>
              setMessage(null)
            }
            className="ml-2 shrink-0 opacity-70 hover:opacity-100"
          >
            <X size={18} />
          </button>
        </div>
      )}

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
                Review each student submission individually. You do not need to wait for every student.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                showForm &&
                !form.id
              ) {
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
                {form.id
                  ? "Update Homework"
                  : "Create Homework"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Complete the homework information below.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              disabled={
                savingHomework
              }
              className="rounded-xl border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) =>
                setForm(
                  (currentForm) => ({
                    ...currentForm,
                    title:
                      event.target
                        .value,
                  }),
                )
              }
              placeholder="Homework title"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            />

            <input
              type="date"
              min={
                new Date()
                  .toISOString()
                  .split("T")[0]
              }
              value={form.due_date}
              onChange={(event) =>
                setForm(
                  (currentForm) => ({
                    ...currentForm,
                    due_date:
                      event.target
                        .value,
                  }),
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            />

            <select
              value={form.class_id}
              onChange={(event) =>
                setForm(
                  (currentForm) => ({
                    ...currentForm,
                    class_id:
                      event.target
                        .value,
                    subject_id: "",
                  }),
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              required
            >
              <option value="">
                Select class
              </option>

              {classOptions.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                form.subject_id
              }
              onChange={(event) =>
                setForm(
                  (currentForm) => ({
                    ...currentForm,
                    subject_id:
                      event.target
                        .value,
                  }),
                )
              }
              disabled={
                !form.class_id
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              required
            >
              <option value="">
                {form.class_id
                  ? "Select subject"
                  : "Select class first"}
              </option>

              {subjectOptions.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <textarea
            value={
              form.description
            }
            onChange={(event) =>
              setForm(
                (currentForm) => ({
                  ...currentForm,
                  description:
                    event.target
                      .value,
                }),
              )
            }
            placeholder="Homework description"
            rows={4}
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50/40">
            <Upload
              size={21}
              className="text-blue-600"
            />

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
                setForm(
                  (currentForm) => ({
                    ...currentForm,
                    file:
                      event.target
                        .files?.[0] ||
                      null,
                  }),
                )
              }
            />
          </label>

          <button
            type="submit"
            disabled={
              savingHomework
            }
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {savingHomework && (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            )}

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
              Check each submission separately when it arrives.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search homework..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center gap-4 rounded-3xl border bg-white p-12 text-center text-slate-500">
            <LoaderCircle
              size={30}
              className="animate-spin text-blue-600"
            />

            <p className="font-semibold">
              Loading homework...
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredHomework.map(
              (homeworkItem) => {
                const waiting =
                  Number(
                    homeworkItem.waiting_count ||
                      0,
                  );

                return (
                  <article
                    key={
                      homeworkItem.id
                    }
                    className="flex min-h-[310px] flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-bold text-slate-900">
                          {
                            homeworkItem.title
                          }
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {homeworkItem.class_name ||
                            "No class"}
                          {" • "}
                          {homeworkItem.subject_name ||
                            "No subject"}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            editHomework(
                              homeworkItem,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-3 py-2 text-amber-600 hover:bg-amber-50"
                        >
                          <Pencil
                            size={16}
                          />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteHomework(
                              homeworkItem,
                            )
                          }
                          disabled={
                            deletingId ===
                            homeworkItem.id
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId ===
                          homeworkItem.id ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={16}
                            />
                          )}

                          {deletingId ===
                          homeworkItem.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-3 text-slate-600">
                      {homeworkItem.description ||
                        "No description"}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                        <CalendarDays
                          size={17}
                        />

                        Due •{" "}
                        {formatDueDate(
                          homeworkItem.due_date,
                        )}
                      </span>

                      {waiting > 0 ? (
                        <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                          <Clock3
                            size={17}
                          />

                          {waiting} waiting
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                          <CheckCircle2
                            size={17}
                          />

                          No submissions waiting
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex flex-wrap gap-3 pt-6">
                      {homeworkItem.file_path && (
                        <button
                          type="button"
                          onClick={() =>
                            openFile(
                              homeworkItem.file_path,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
                        >
                          <FileText
                            size={17}
                          />

                          Attachment
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          viewSubmissions(
                            homeworkItem,
                          )
                        }
                        disabled={
                          waiting === 0
                        }
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold ${
                          waiting > 0
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "cursor-not-allowed bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Eye
                          size={17}
                        />

                        {waiting > 0
                          ? `View ${waiting} submission${
                              waiting >
                              1
                                ? "s"
                                : ""
                            }`
                          : "Nothing to review"}
                      </button>
                    </div>
                  </article>
                );
              },
            )}

            {filteredHomework.length ===
              0 && (
              <div className="rounded-3xl border border-dashed bg-white p-12 text-center text-slate-500 md:col-span-2">
                No active homework
              </div>
            )}
          </div>
        )}
      </section>

      {selectedHomework && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Waiting Submissions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    selectedHomework.title
                  }
                </p>

                <p className="mt-1 text-xs font-semibold text-blue-600">
                  You can check each student separately.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeSubmissionModal
                }
                disabled={
                  Boolean(reviewingId)
                }
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={25} />
              </button>
            </div>

            <div className="p-6">
              {submissionLoading ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 p-12 text-center text-slate-500">
                  <LoaderCircle
                    size={30}
                    className="animate-spin text-blue-600"
                  />

                  <p className="font-semibold">
                    Loading submissions...
                  </p>
                </div>
              ) : submissions.length ===
                0 ? (
                <div className="rounded-3xl border border-dashed bg-slate-50 p-14 text-center">
                  <CheckCircle2
                    size={52}
                    className="mx-auto text-green-500"
                  />

                  <h3 className="mt-4 text-lg font-bold">
                    All clear
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    All current submissions have been checked.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-4 text-left">
                          Student
                        </th>

                        <th className="px-4 py-4 text-left">
                          Answer
                        </th>

                        <th className="px-4 py-4 text-left">
                          Files
                        </th>

                        <th className="px-4 py-4 text-left">
                          Score Option
                        </th>

                        <th className="px-4 py-4 text-left">
                          Comment
                        </th>

                        <th className="px-4 py-4 text-left">
                          Submitted
                        </th>

                        <th className="px-4 py-4 text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {submissions.map(
                        (
                          submission,
                        ) => {
                          const uploadedFiles =
                            parseFiles(
                              submission.file_paths,
                            );

                          const isReviewing =
                            Number(
                              reviewingId,
                            ) ===
                            Number(
                              submission.id,
                            );

                          return (
                            <tr
                              key={
                                submission.id
                              }
                              className="border-t align-top"
                            >
                              <td className="px-4 py-4 font-semibold">
                                {submission.student_name ||
                                  "-"}
                              </td>

                              <td className="max-w-[240px] whitespace-pre-wrap px-4 py-4">
                                {submission.answer_text ||
                                  "-"}
                              </td>

                              <td className="px-4 py-4">
                                {uploadedFiles.length >
                                0 ? (
                                  uploadedFiles.map(
                                    (
                                      url,
                                      index,
                                    ) => (
                                      <button
                                        key={`${url}-${index}`}
                                        type="button"
                                        onClick={() =>
                                          openFile(
                                            url,
                                          )
                                        }
                                        className="block text-blue-600 hover:underline"
                                      >
                                        View file{" "}
                                        {index +
                                          1}
                                      </button>
                                    ),
                                  )
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                  <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(
                                        applyBonusInputs[submission.id],
                                      )}
                                      onChange={(event) => {
                                        const checked =
                                          event.target.checked;

                                        setApplyBonusInputs(
                                          (current) => ({
                                            ...current,
                                            [submission.id]: checked,
                                          }),
                                        );

                                        if (!checked) {
                                          setBonusInputs(
                                            (current) => ({
                                              ...current,
                                              [submission.id]: 0,
                                            }),
                                          );
                                        }
                                      }}
                                      disabled={isReviewing}
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                                    />

                                    <div>
                                      <p className="font-bold text-slate-700">
                                        Add bonus to score
                                      </p>

                                      <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Leave unchecked for normal homework.
                                      </p>
                                    </div>
                                  </label>

                                  {applyBonusInputs[submission.id] && (
                                    <div className="mt-3 border-t border-slate-200 pt-3">
                                      <label className="mb-2 block text-xs font-bold text-slate-600">
                                        Bonus points
                                      </label>

                                      <input
                                        type="number"
                                        min="0"
                                        value={
                                          bonusInputs[submission.id] ?? ""
                                        }
                                        onChange={(event) =>
                                          setBonusInputs(
                                            (current) => ({
                                              ...current,
                                              [submission.id]:
                                                event.target.value,
                                            }),
                                          )
                                        }
                                        disabled={isReviewing}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        placeholder="Example: 5"
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <input
                                  value={
                                    commentInputs[
                                      submission
                                        .id
                                    ] ?? ""
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setCommentInputs(
                                      (
                                        current,
                                      ) => ({
                                        ...current,
                                        [submission.id]:
                                          event
                                            .target
                                            .value,
                                      }),
                                    )
                                  }
                                  disabled={
                                    isReviewing
                                  }
                                  className="w-56 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                                    reviewSubmission(
                                      submission.id,
                                    )
                                  }
                                  disabled={
                                    isReviewing ||
                                    reviewingId !==
                                      null
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                                >
                                  {isReviewing ? (
                                    <LoaderCircle
                                      size={17}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <CheckCircle2
                                      size={17}
                                    />
                                  )}

                                  {isReviewing
                                    ? "Checking..."
                                    : "Check"}
                                </button>
                              </td>
                            </tr>
                          );
                        },
                      )}
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