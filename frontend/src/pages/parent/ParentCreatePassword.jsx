import {
  ArrowRight,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function ParentCreatePassword() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setupToken =
    sessionStorage.getItem("parent_setup_token");

  const saveParentLogin = (data) => {
    const students = data.students || [];
    const firstStudent = students[0] || null;
    const parent = data.parent || {};

    const user = {
      id: parent.id,
      role: "parent",
      full_name: parent.name || "Parent",
      phone: parent.phone || "",
      students,
    };

    localStorage.setItem(
      "token",
      data.access_token || "",
    );

    localStorage.setItem("role", "parent");
    localStorage.setItem(
      "parent_id",
      String(parent.id || ""),
    );

    localStorage.setItem(
      "full_name",
      parent.name || "Parent",
    );

    localStorage.setItem(
      "user",
      JSON.stringify(user),
    );

    localStorage.setItem(
      "parent_students",
      JSON.stringify(students),
    );

    if (firstStudent) {
      localStorage.setItem(
        "student_id",
        String(firstStudent.id),
      );

      localStorage.setItem(
        "selected_student_id",
        String(firstStudent.id),
      );

      localStorage.setItem(
        "student_code",
        firstStudent.student_code || "",
      );

      localStorage.setItem(
        "class_id",
        String(firstStudent.class_id || ""),
      );
    }

    sessionStorage.removeItem(
      "parent_setup_token",
    );

    setUser(user);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!setupToken) {
      setError(
        "Setup session expired. Please request OTP again.",
      );
      return;
    }

    if (form.new_password.length < 6) {
      setError(
        "Password must contain at least 6 characters.",
      );
      return;
    }

    if (
      form.new_password !== form.confirm_password
    ) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(
        "/auth/parent/create-password",
        {
          setup_token: setupToken,
          new_password: form.new_password,
          confirm_password:
            form.confirm_password,
        },
      );

      saveParentLogin(res.data);

      navigate("/parent", {
        replace: true,
      });
    } catch (err) {
      const detail =
        err?.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Failed to create password.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <ShieldCheck size={30} />
        </div>

        <h1 className="text-3xl font-bold text-slate-900">
          Create Password
        </h1>

        <p className="mt-2 text-slate-500">
          Create a password for your parent account.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="mt-7"
        >
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            New Password
          </label>

          <div className="mb-5 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
            <Lock
              size={20}
              className="text-slate-400"
            />

            <input
              type="password"
              value={form.new_password}
              onChange={(e) =>
                setForm({
                  ...form,
                  new_password: e.target.value,
                })
              }
              placeholder="Enter new password"
              className="w-full bg-transparent px-3 py-4 outline-none"
              required
            />
          </div>

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Confirm Password
          </label>

          <div className="mb-6 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
            <Lock
              size={20}
              className="text-slate-400"
            />

            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) =>
                setForm({
                  ...form,
                  confirm_password:
                    e.target.value,
                })
              }
              placeholder="Confirm password"
              className="w-full bg-transparent px-3 py-4 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : "Save Password"}

            {!loading && (
              <ArrowRight size={20} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}