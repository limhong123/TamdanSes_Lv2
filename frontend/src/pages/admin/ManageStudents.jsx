import {
  BadgeInfo,
  BookOpen,
  Eye,
  GraduationCap,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
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
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await api.get("/classes/");

      setClasses(
        Array.isArray(res.data)
          ? res.data
          : [],
      );
    } catch (error) {
      console.error(
        "LOAD CLASSES ERROR:",
        error?.response?.data || error,
      );

      setClasses([]);
    }
  };

  const viewStudent = async (id) => {
    try {
      const res = await api.get(
        `/students/${id}`,
      );

      setDetail(res.data);
      setNewPassword("");
    } catch (error) {
      alert(
        error?.response?.data?.detail ||
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
    } catch (error) {
      alert(
        error?.response?.data?.detail ||
          "Reset password failed",
      );
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setNewPassword("");
  };

  const filters = (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.8fr_auto]">
      <div className="relative">
        <Search
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search name, student ID or email..."
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <select
        value={classFilter}
        onChange={(event) =>
          setClassFilter(event.target.value)
        }
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">All Classes</option>

        {classes.map((classItem) => {
          const className = `${
            classItem.name
          } ${
            classItem.section || ""
          }`.trim();

          return (
            <option
              key={classItem.id}
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
        disabled={!search && !classFilter}
        className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
        filterData={(students) => {
          const keyword = search
            .trim()
            .toLowerCase();

          return students.filter(
            (student) => {
              const studentName = String(
                student.student_name || "",
              ).toLowerCase();

              const studentEmail = String(
                student.email || "",
              ).toLowerCase();

              const studentCode = String(
                student.student_code || "",
              ).toLowerCase();

              const currentClass = String(
                student.class_name || "",
              ).trim();

              const matchSearch =
                !keyword ||
                studentName.includes(keyword) ||
                studentEmail.includes(keyword) ||
                studentCode.includes(keyword);

              const matchClass =
                !classFilter ||
                currentClass ===
                  classFilter.trim();

              return (
                matchSearch && matchClass
              );
            },
          );
        }}
        columns={[
          {
            key: "student",
            label: "Student",
            render: (student) => (
              <StudentCell student={student} />
            ),
          },
          {
            key: "email",
            label: "Contact",
            render: (student) => (
              <div className="min-w-[190px]">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Mail
                    size={15}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="max-w-[210px] truncate">
                    {student.email || "-"}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                  <Phone
                    size={14}
                    className="shrink-0 text-slate-400"
                  />

                  <span>
                    {student.phone ||
                      "No phone"}
                  </span>
                </div>
              </div>
            ),
          },
          {
            key: "class_name",
            label: "Class",
            render: (student) => (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-100">
                <BookOpen size={13} />
                {student.class_name || "-"}
              </span>
            ),
          },
          {
            key: "gender",
            label: "Gender",
            render: (student) => (
              <GenderBadge
                gender={student.gender}
              />
            ),
          },
          {
            key: "parent",
            label: "Parent / Guardian",
            render: (student) => (
              <div className="min-w-[170px]">
                <p className="font-semibold text-slate-800">
                  {student.parent_name ||
                    student.guardian_name ||
                    "-"}
                </p>

                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone size={13} />

                  <span>
                    {student.parent_phone ||
                      student.guardian_phone ||
                      "No phone"}
                  </span>
                </div>
              </div>
            ),
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
            label: "Student Phone",
            required: true,
            placeholder: "066968050",
            hint: "System saves the phone number in +855 format automatically.",
          },
          {
            name: "class_id",
            label: "Class",
            type: "select",
            required: true,
            options: classes.map(
              (classItem) => ({
                value: classItem.id,
                label: `${
                  classItem.name
                } ${
                  classItem.section || ""
                }`.trim(),
              }),
            ),
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
            hint: "System saves the phone number in +855 format automatically.",
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
            title="View student information"
            onClick={() =>
              viewStudent(item.id)
            }
            className="group flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
          >
            <Eye size={16} />
          </button>
        )}
      />

      {detail && (
        <StudentDetailModal
          detail={detail}
          newPassword={newPassword}
          onClose={closeDetail}
          onResetPassword={resetPassword}
        />
      )}
    </>
  );
}

function StudentCell({ student }) {
  return (
    <div className="flex min-w-[210px] items-center gap-3">
      <StudentAvatar
        src={student.avatar_url}
        name={student.student_name}
        size="h-12 w-12"
        textSize="text-sm"
      />

      <div className="min-w-0">
        <p className="truncate font-bold text-slate-800">
          {student.student_name || "-"}
        </p>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
            {student.student_code || "-"}
          </span>

          {student.avatar_url && (
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          )}
        </div>
      </div>
    </div>
  );
}

function GenderBadge({ gender }) {
  const normalizedGender = String(
    gender || "",
  ).toLowerCase();

  const style =
    normalizedGender === "female"
      ? "bg-pink-50 text-pink-700 ring-pink-100"
      : normalizedGender === "male"
        ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
        : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ring-1 ring-inset ${style}`}
    >
      {gender || "-"}
    </span>
  );
}

function StudentDetailModal({
  detail,
  newPassword,
  onClose,
  onResetPassword,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="relative overflow-hidden rounded-t-[28px] bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 px-6 pb-7 pt-6 text-white">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <StudentAvatar
                src={detail.avatar_url}
                name={detail.student_name}
                size="h-24 w-24"
                textSize="text-2xl"
                whiteBorder
              />

              <div>
                <p className="mb-1 text-sm font-medium text-blue-100">
                  Student profile
                </p>

                <h2 className="text-2xl font-bold">
                  {detail.student_name ||
                    "-"}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {detail.student_code ||
                      "-"}
                  </span>

                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {detail.class_name ||
                      "No class"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="relative rounded-xl bg-white/15 p-2.5 text-white transition hover:bg-white/25"
            >
              <X size={21} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InformationCard
              icon={BadgeInfo}
              label="Student ID"
              value={detail.student_code}
            />

            <InformationCard
              icon={Mail}
              label="Email"
              value={detail.email}
            />

            <InformationCard
              icon={Phone}
              label="Student Phone"
              value={detail.phone}
            />

            <InformationCard
              icon={GraduationCap}
              label="Class"
              value={detail.class_name}
            />

            <InformationCard
              icon={UserRound}
              label="Gender"
              value={detail.gender}
            />

            <InformationCard
              icon={ShieldCheck}
              label="Parent Name"
              value={
                detail.parent_name ||
                detail.guardian_name
              }
            />

            <InformationCard
              icon={Phone}
              label="Parent Phone"
              value={
                detail.parent_phone ||
                detail.guardian_phone
              }
            />

            <InformationCard
              icon={MapPin}
              label="Address"
              value={detail.address}
              fullWidth
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                  <KeyRound size={21} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-800">
                    Reset student password
                  </h3>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                    Create a new temporary password
                    when the student cannot access
                    their account.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onResetPassword}
                className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Generate Password
              </button>
            </div>

            {newPassword && (
              <div className="border-t border-amber-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Temporary password
                </p>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all font-mono text-2xl font-black tracking-wider text-blue-700">
                    {newPassword}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        newPassword,
                      );

                      alert(
                        "Password copied",
                      );
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Copy Password
                  </button>
                </div>

                <p className="mt-3 text-sm font-medium text-red-500">
                  Save this password now. It will
                  disappear after closing the modal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InformationCard({
  icon: Icon,
  label,
  value,
  fullWidth = false,
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50/70 p-4 ${
        fullWidth
          ? "sm:col-span-2 lg:col-span-3"
          : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2.5 text-blue-600 shadow-sm ring-1 ring-slate-100">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words font-bold text-slate-800">
            {value || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentAvatar({
  src,
  name,
  size = "h-12 w-12",
  textSize = "text-sm",
  whiteBorder = false,
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

  const borderStyle = whiteBorder
    ? "border-4 border-white/90 ring-4 ring-white/20"
    : "border-2 border-white ring-1 ring-slate-200";

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={name || "Student"}
        onError={() =>
          setImageError(true)
        }
        className={`${size} ${borderStyle} shrink-0 rounded-full object-cover shadow-md`}
      />
    );
  }

  return (
    <div
      className={`${size} ${textSize} ${borderStyle} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-black text-white shadow-md`}
    >
      {initials || "S"}
    </div>
  );
}