import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../../api/axios";

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

  const [commentInputs, setCommentInputs] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  const [
    submissionLoading,
    setSubmissionLoading,
  ] = useState(false);

  const [reviewingId, setReviewingId] =
    useState(null);

  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    class_id: "",
    subject_id: "",
    due_date: "",
    file: null,
  });

  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("id");

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
    if (!url) return;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const loadData = async () => {
    if (!teacherId) return;

    try {
      setLoading(true);

      const [
        homeworkRes,
        relationRes,
      ] = await Promise.all([
        api.get(
          `/homework/teacher/${teacherId}`
        ),

        api.get("/class-teachers/"),
      ]);

      setHomework(
        Array.isArray(homeworkRes.data)
          ? homeworkRes.data
          : []
      );

      const relationList = Array.isArray(
        relationRes.data
      )
        ? relationRes.data
        : [];

      const myRelations =
        relationList.filter(
          (relation) =>
            Number(relation.teacher_id) ===
            Number(teacherId)
        );

      setRelations(myRelations);
    } catch (error) {
      console.log(
        "LOAD HOMEWORK ERROR:",
        error?.response?.data || error
      );

      setHomework([]);
      setRelations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (
    homeworkItem,
    showLoading = true
  ) => {
    if (!homeworkItem?.id) return;

    try {
      if (showLoading) {
        setSubmissionLoading(true);
      }

      const response = await api.get(
        `/submissions/homework/${homeworkItem.id}`
      );

      const list = Array.isArray(
        response.data
      )
        ? response.data
        : [];

      setSubmissions(list);

      const bonuses = {};
      const comments = {};

      list.forEach((submission) => {
        bonuses[submission.id] =
          submission.bonus || 0;

        comments[submission.id] =
          submission.teacher_comment || "";
      });

      setBonusInputs(bonuses);
      setCommentInputs(comments);
    } catch (error) {
      console.log(
        "LOAD SUBMISSIONS ERROR:",
        error?.response?.data || error
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

  /*
   * Refresh every minute.
   *
   * Backend hides checked submissions
   * after 24 hours.
   */
  useEffect(() => {
    if (!selectedHomework?.id) {
      return undefined;
    }

    const intervalId =
      window.setInterval(() => {
        loadSubmissions(
          selectedHomework,
          false
        );
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
          Number(item.value) ===
          Number(relation.class_id)
      );

      if (!exists) {
        options.push({
          value: relation.class_id,

          label: `${
            relation.class_name || ""
          } ${
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
          Number(relation.class_id) ===
          Number(form.class_id)
      )
      .forEach((relation) => {
        const exists = options.some(
          (item) =>
            Number(item.value) ===
            Number(relation.subject_id)
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

  const waitingCount = useMemo(() => {
    return submissions.filter(
      (submission) =>
        submission.status !== "checked"
    ).length;
  }, [submissions]);

  const checkedCount = useMemo(() => {
    return submissions.filter(
      (submission) =>
        submission.status === "checked"
    ).length;
  }, [submissions]);

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      description: "",
      class_id: "",
      subject_id: "",
      due_date: "",
      file: null,
    });
  };

  const submitHomework = async (event) => {
    event.preventDefault();

    if (!teacherId) {
      alert(
        "Teacher ID not found. Please logout and login again."
      );

      return;
    }

    const data = new FormData();

    data.append(
      "title",
      form.title
    );

    data.append(
      "description",
      form.description
    );

    data.append(
      "class_id",
      form.class_id
    );

    data.append(
      "subject_id",
      form.subject_id
    );

    data.append(
      "teacher_id",
      teacherId
    );

    data.append(
      "due_date",
      form.due_date
    );

    if (form.file) {
      data.append(
        "file",
        form.file
      );
    }

    try {
      if (form.id) {
        await api.put(
          `/homework/${form.id}`,
          data,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

        alert(
          "Homework updated successfully"
        );
      } else {
        await api.post(
          "/homework/",
          data,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

        alert(
          "Homework created successfully"
        );
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.log(
        "HOMEWORK SAVE ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Save homework failed"
      );
    }
  };

  const editHomework = (
    homeworkItem
  ) => {
    setForm({
      id: homeworkItem.id,

      title:
        homeworkItem.title || "",

      description:
        homeworkItem.description || "",

      class_id:
        homeworkItem.class_id || "",

      subject_id:
        homeworkItem.subject_id || "",

      due_date:
        homeworkItem.due_date || "",

      file: null,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteHomework = async (id) => {
    const confirmed =
      window.confirm(
        "Delete this homework?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/homework/${id}`
      );

      if (
        Number(selectedHomework?.id) ===
        Number(id)
      ) {
        setSelectedHomework(null);
        setSubmissions([]);
      }

      await loadData();

      alert(
        "Homework deleted successfully"
      );
    } catch (error) {
      alert(
        error?.response?.data?.detail ||
          "Delete homework failed"
      );
    }
  };

  const viewSubmissions = async (
    homeworkItem
  ) => {
    setSelectedHomework(
      homeworkItem
    );

    await loadSubmissions(
      homeworkItem
    );
  };

  const closeSubmissionModal = () => {
    setSelectedHomework(null);
    setSubmissions([]);
    setBonusInputs({});
    setCommentInputs({});
  };

  const reviewSubmission = async (
    submissionId
  ) => {
    const bonus = Number(
      bonusInputs[submissionId] || 0
    );

    if (
      Number.isNaN(bonus) ||
      bonus < 0
    ) {
      alert(
        "Bonus must be 0 or greater"
      );

      return;
    }

    try {
      setReviewingId(
        submissionId
      );

      await api.put(
        `/submissions/${submissionId}/review`,
        {
          status: "checked",

          score: bonus,

          bonus,

          teacher_comment:
            commentInputs[
              submissionId
            ]?.trim() ||
            "Checked by teacher",
        }
      );

      /*
       * Checked submission remains visible
       * for 24 hours.
       */
      await loadSubmissions(
        selectedHomework,
        false
      );

      alert(
        "Submission checked successfully"
      );
    } catch (error) {
      console.log(
        "REVIEW ERROR:",
        error?.response?.data || error
      );

      alert(
        error?.response?.data?.detail ||
          "Review failed"
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <BookOpen className="text-blue-600" />

        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Teacher Homework
          </h1>

          <p className="text-sm text-slate-500">
            Create homework and review
            student submissions
          </p>
        </div>
      </div>

      {!teacherId && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-600">
          Teacher ID not found. Please
          logout and login again.
        </div>
      )}

      <form
        onSubmit={submitHomework}
        className="mb-8 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {form.id
              ? "Update Homework"
              : "Create Homework"}
          </h2>

          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border px-4 py-2 text-slate-600 hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            placeholder="Homework Title"
            value={form.title}
            onChange={(event) =>
              setForm({
                ...form,

                title:
                  event.target.value,
              })
            }
            className="rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            required
          />

          <input
            type="date"
            value={form.due_date}
            onChange={(event) =>
              setForm({
                ...form,

                due_date:
                  event.target.value,
              })
            }
            className="rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            required
          />

          <select
            value={form.class_id}
            onChange={(event) =>
              setForm({
                ...form,

                class_id:
                  event.target.value,

                subject_id: "",
              })
            }
            className="rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            required
          >
            <option value="">
              Select Class
            </option>

            {classOptions.map(
              (classItem) => (
                <option
                  key={
                    classItem.value
                  }
                  value={
                    classItem.value
                  }
                >
                  {classItem.label}
                </option>
              )
            )}
          </select>

          <select
            value={form.subject_id}
            onChange={(event) =>
              setForm({
                ...form,

                subject_id:
                  event.target.value,
              })
            }
            className="rounded-xl border px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
            required
            disabled={
              !form.class_id
            }
          >
            <option value="">
              {form.class_id
                ? "Select Subject"
                : "Select Subject (select class first)"}
            </option>

            {subjectOptions.map(
              (subjectItem) => (
                <option
                  key={
                    subjectItem.value
                  }
                  value={
                    subjectItem.value
                  }
                >
                  {subjectItem.label}
                </option>
              )
            )}
          </select>
        </div>

        <textarea
          placeholder="Homework description"
          value={form.description}
          onChange={(event) =>
            setForm({
              ...form,

              description:
                event.target.value,
            })
          }
          className="mt-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
          rows={4}
        />

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 text-slate-600 hover:bg-slate-50">
          <Upload size={18} />

          <span>
            {form.file
              ? form.file.name
              : "Upload homework file"}
          </span>

          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*,.doc,.docx,.zip,.rar"
            onChange={(event) =>
              setForm({
                ...form,

                file:
                  event.target
                    .files?.[0] ||
                  null,
              })
            }
          />
        </label>

        <button
          type="submit"
          className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {form.id
            ? "Update Homework"
            : "Create Homework"}
        </button>
      </form>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">
          Homework List
        </h2>

        <p className="text-sm text-slate-500">
          Unchecked submissions remain
          visible. Checked submissions
          disappear after 24 hours.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
          Loading homework...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {homework.map(
            (homeworkItem) => (
              <div
                key={
                  homeworkItem.id
                }
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {
                        homeworkItem.title
                      }
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {homeworkItem.class_name ||
                        "No class"}{" "}
                      •{" "}
                      {homeworkItem.subject_name ||
                        "No subject"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        editHomework(
                          homeworkItem
                        )
                      }
                      className="flex items-center gap-2 rounded-xl border border-yellow-400 px-3 py-2 text-yellow-600 hover:bg-yellow-50"
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
                          homeworkItem.id
                        )
                      }
                      className="flex items-center gap-2 rounded-xl border border-red-400 px-3 py-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2
                        size={16}
                      />

                      Delete
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-slate-700">
                  {homeworkItem.description ||
                    "No description"}
                </p>

                <p className="mt-3 text-sm font-semibold text-red-600">
                  Due:{" "}
                  {
                    homeworkItem.due_date
                  }
                </p>

                {homeworkItem.file_path && (
                  <button
                    type="button"
                    onClick={() =>
                      openFile(
                        homeworkItem.file_path
                      )
                    }
                    className="mt-3 block text-blue-600 hover:underline"
                  >
                    View homework
                    attachment
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    viewSubmissions(
                      homeworkItem
                    )
                  }
                  className="mt-4 flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-blue-600 hover:bg-blue-50"
                >
                  <Eye size={16} />

                  View Student
                  Submissions
                </button>
              </div>
            )
          )}

          {homework.length === 0 && (
            <div className="rounded-2xl border bg-white p-10 text-center text-slate-500 md:col-span-2">
              No homework found
            </div>
          )}
        </div>
      )}

      {selectedHomework && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Student Submissions
                </h2>

                <p className="text-sm text-slate-500">
                  {
                    selectedHomework.title
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeSubmissionModal
                }
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <X />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <Clock3 className="text-yellow-600" />

                <div>
                  <p className="text-sm text-slate-500">
                    Waiting for teacher
                  </p>

                  <p className="text-2xl font-bold text-yellow-700">
                    {waitingCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="text-green-600" />

                <div>
                  <p className="text-sm text-slate-500">
                    Checked in last 24
                    hours
                  </p>

                  <p className="text-2xl font-bold text-green-700">
                    {checkedCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
              Waiting for teacher means
              the student already submitted
              homework, but the teacher has
              not checked it. Checked
              submissions disappear from
              this list after 24 hours.
            </div>

            {submissionLoading ? (
              <div className="rounded-xl border p-10 text-center text-slate-500">
                Loading submissions...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 text-left">
                        Student
                      </th>

                      <th className="p-3 text-left">
                        Answer
                      </th>

                      <th className="p-3 text-left">
                        Files
                      </th>

                      <th className="p-3 text-left">
                        Bonus
                      </th>

                      <th className="p-3 text-left">
                        Comment
                      </th>

                      <th className="p-3 text-left">
                        Status
                      </th>

                      <th className="p-3 text-left">
                        Submitted
                      </th>

                      <th className="p-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {submissions.map(
                      (submission) => {
                        const uploadedFiles =
                          parseFiles(
                            submission.file_paths
                          );

                        const isChecked =
                          submission.status ===
                          "checked";

                        const isReviewing =
                          reviewingId ===
                          submission.id;

                        return (
                          <tr
                            key={
                              submission.id
                            }
                            className="border-t align-top"
                          >
                            <td className="p-3 font-medium text-slate-800">
                              {submission.student_name ||
                                "-"}
                            </td>

                            <td className="max-w-[220px] whitespace-pre-wrap p-3 text-slate-700">
                              {submission.answer_text ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {uploadedFiles.length >
                              0 ? (
                                <div className="space-y-1">
                                  {uploadedFiles.map(
                                    (
                                      fileUrl,
                                      index
                                    ) => (
                                      <button
                                        key={`${fileUrl}-${index}`}
                                        type="button"
                                        onClick={() =>
                                          openFile(
                                            fileUrl
                                          )
                                        }
                                        className="block text-blue-600 hover:underline"
                                      >
                                        View file{" "}
                                        {index + 1}
                                      </button>
                                    )
                                  )}
                                </div>
                              ) : submission.file_path ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openFile(
                                      submission.file_path
                                    )
                                  }
                                  className="text-blue-600 hover:underline"
                                >
                                  View file
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>

                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                value={
                                  bonusInputs[
                                    submission.id
                                  ] ?? ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  setBonusInputs(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [submission.id]:
                                        event.target
                                          .value,
                                    })
                                  )
                                }
                                disabled={
                                  isChecked ||
                                  isReviewing
                                }
                                className="w-24 rounded-xl border px-3 py-2 disabled:bg-slate-100"
                                placeholder="0"
                              />
                            </td>

                            <td className="p-3">
                              <input
                                type="text"
                                value={
                                  commentInputs[
                                    submission.id
                                  ] ?? ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  setCommentInputs(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [submission.id]:
                                        event.target
                                          .value,
                                    })
                                  )
                                }
                                disabled={
                                  isChecked ||
                                  isReviewing
                                }
                                className="w-48 rounded-xl border px-3 py-2 disabled:bg-slate-100"
                                placeholder="Teacher comment"
                              />
                            </td>

                            <td className="p-3">
                              {isChecked ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                    <CheckCircle2
                                      size={
                                        14
                                      }
                                    />

                                    Checked
                                  </span>

                                  <p className="mt-1 text-xs text-slate-400">
                                    Hides after
                                    24 hours
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                                  <Clock3
                                    size={14}
                                  />

                                  Waiting for
                                  teacher
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-xs text-slate-500">
                              {formatDateTime(
                                submission.submitted_at
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  reviewSubmission(
                                    submission.id
                                  )
                                }
                                disabled={
                                  isChecked ||
                                  isReviewing
                                }
                                className={`rounded-lg px-4 py-2 font-medium text-white ${
                                  isChecked
                                    ? "cursor-not-allowed bg-slate-400"
                                    : isReviewing
                                    ? "cursor-wait bg-green-400"
                                    : "bg-green-600 hover:bg-green-700"
                                }`}
                              >
                                {isChecked
                                  ? "Checked"
                                  : isReviewing
                                  ? "Checking..."
                                  : "Check"}
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}

                    {submissions.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-8 text-center text-slate-500"
                        >
                          No unchecked or
                          recently checked
                          submissions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}