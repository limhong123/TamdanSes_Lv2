import {
  Eye,
  ImageOff,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import AdminCrudPage from "../../components/AdminCrudPage";

export default function ManageStudents() {
  const [classes, setClasses] = useState([]);
  const [detail, setDetail] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  useEffect(() => {
    api
      .get("/classes/")
      .then((res) => {
        setClasses(
          Array.isArray(res.data)
            ? res.data
            : [],
        );
      })
      .catch(() => {
        setClasses([]);
      });
  }, []);

  const viewStudent = async (id) => {
    try {
      const res = await api.get(`/students/${id}`);

      setDetail(res.data);
      setNewPassword("");
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
          "Cannot load student detail",
      );
    }
  };

  const resetPassword = async () => {
    if (!detail?.id) return;

    try {
      const res = await api.post(
        `/students/${detail.id}/reset-password`,
      );

      setNewPassword(
        res.data.temporary_password,
      );
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
          "Reset password failed",
      );
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setNewPassword("");
  };

  const filters = (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search student name, email, or ID..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <select
        value={classFilter}
        onChange={(e) =>
          setClassFilter(e.target.value)
        }
        className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">All Classes</option>

        {classes.map((cls) => {
          const className = `${cls.name} ${
            cls.section || ""
          }`.trim();

          return (
            <option
              key={cls.id}
              value={className}
            >
              {className}
            </option>
          );
        })}
      </select>

      <button
        type="button"
        onClick={() => {
          setSearch("");
          setClassFilter("");
        }}
        className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        Clear Filter
      </button>
    </div>
  );

  return (
    <>
      <AdminCrudPage
        title="Manage Students"
        endpoint="/students/"
        icon={Users}
        filters={filters}
        filterData={(students) =>
          students.filter((student) => {
            const keyword = search
              .trim()
              .toLowerCase();

            const studentName = String(
              student.student_name || "",
            ).toLowerCase();

            const email = String(
              student.email || "",
            ).toLowerCase();

            const studentCode = String(
              student.student_code || "",
            ).toLowerCase();

            const matchSearch =
              !keyword ||
              studentName.includes(keyword) ||
              email.includes(keyword) ||
              studentCode.includes(keyword);

            const matchClass =
              !classFilter ||
              String(
                student.class_name || "",
              ).trim() === classFilter.trim();

            return matchSearch && matchClass;
          })
        }
        columns={[
          {
            key: "student_code",
            label: "ID",
          },
          {
            key: "student_name",
            label: "Student",
            render: (student) => (
              <div className="flex min-w-[190px] items-center gap-3">
                <StudentAvatar
                  src={student.avatar_url}
                  name={student.student_name}
                  size="h-11 w-11"
                  textSize="text-sm"
                />

                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {student.student_name || "-"}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {student.avatar_url
                      ? "Profile photo"
                      : "No profile photo"}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: "email",
            label: "Email",
          },
          {
            key: "class_name",
            label: "Class",
          },
          {
            key: "gender",
            label: "Gender",
            render: (student) => (
              <span className="capitalize">
                {student.gender || "-"}
              </span>
            ),
          },
          {
            key: "guardian_name",
            label: "Parent Name",
          },
          {
            key: "guardian_phone",
            label: "Parent Phone",
          },
        ]}
        fields={[
          {
            name: "first_name",
            label: "First Name",
            required: true,
          },
          {
            name: "last_name",
            label: "Last Name",
            required: true,
          },
          {
            name: "phone",
            label: "Phone Number",
            required: true,
            placeholder: "066968050",
            hint: "System will save as +855 format automatically",
          },
          {
            name: "class_id",
            label: "Class",
            type: "select",
            required: true,
            options: classes.map((cls) => ({
              value: cls.id,
              label: `${cls.name} ${
                cls.section || ""
              }`.trim(),
            })),
          },
          {
            name: "gender",
            label: "Gender",
            type: "select",
            required: true,
            options: [
              {
                value: "Male",
                label: "Male",
              },
              {
                value: "Female",
                label: "Female",
              },
            ],
          },
          {
            name: "guardian_name",
            label: "Parent Name",
            required: true,
          },
          {
            name: "guardian_phone",
            label: "Parent Phone",
            required: true,
            placeholder: "066968050",
            hint: "System will save as +855 format automatically",
          },
          {
            name: "address",
            label: "Address",
            type: "textarea",
            fullWidth: true,
          },
        ]}
        extraActions={(item) => (
          <button
            type="button"
            title="View student"
            onClick={() =>
              viewStudent(item.id)
            }
            className="rounded-lg border border-blue-500 px-3 py-2 text-blue-600 transition hover:bg-blue-50"
          >
            <Eye size={16} />
          </button>
        )}
      />

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={closeDetail}
        >
          <div
            className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Student Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  View student profile and account
                  information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 sm:flex-row">
              <StudentAvatar
                src={detail.avatar_url}
                name={detail.student_name}
                size="h-24 w-24"
                textSize="text-2xl"
              />

              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold text-slate-800">
                  {detail.student_name || "-"}
                </h3>

                <p className="mt-1 font-semibold text-blue-600">
                  {detail.student_code || "-"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {detail.class_name || "No class"}
                </p>

                {!detail.avatar_url && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
                    <ImageOff size={13} />
                    Student has not uploaded a
                    profile photo
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info
                label="Student ID"
                value={detail.student_code}
              />

              <Info
                label="Name"
                value={detail.student_name}
              />

              <Info
                label="Email"
                value={detail.email}
              />

              <Info
                label="Phone"
                value={detail.phone}
              />

              <Info
                label="Class"
                value={detail.class_name}
              />

              <Info
                label="Gender"
                value={detail.gender}
              />

              <Info
                label="Parent Name"
                value={
                  detail.parent_name ||
                  detail.guardian_name
                }
              />

              <Info
                label="Parent Phone"
                value={
                  detail.parent_phone ||
                  detail.guardian_phone
                }
              />

              <Info
                label="Address"
                value={detail.address}
                fullWidth
              />
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-slate-800">
                    Password
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    The old password cannot be
                    viewed. Generate a new
                    temporary password for this
                    student.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetPassword}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Reset Password
                </button>
              </div>

              {newPassword && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    New Temporary Password
                  </p>

                  <p className="mt-1 break-all text-2xl font-bold text-blue-700">
                    {newPassword}
                  </p>

                  <p className="mt-2 text-sm font-medium text-red-500">
                    Copy this password now. It will
                    not be shown again after closing
                    this window.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StudentAvatar({
  src,
  name,
  size = "h-11 w-11",
  textSize = "text-sm",
}) {
  const [imageError, setImageError] =
    useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const initials = String(name || "Student")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase(),
    )
    .join("");

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={name || "Student"}
        onError={() =>
          setImageError(true)
        }
        className={`${size} shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200`}
      />
    );
  }

  return (
    <div
      className={`${size} ${textSize} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-sm ring-1 ring-blue-200`}
    >
      {initials || "S"}
    </div>
  );
}

function Info({
  label,
  value,
  fullWidth = false,
}) {
  return (
    <div
      className={`rounded-xl border border-slate-100 bg-slate-50 p-4 ${
        fullWidth ? "md:col-span-2" : ""
      }`}
    >
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}