import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
export default function Login() {
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    login_id: "",
    password: "",
  });

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", {
        login_id: form.login_id,
        password: form.password,
      });

      const user = {
        id: res.data.id,
        email: res.data.email,
        role: res.data.role,
        full_name: res.data.full_name,

        student_id: res.data.student_id,
        student_code: res.data.student_code,
        teacher_id: res.data.teacher_id,
        teacher_code: res.data.teacher_code,
        class_id: res.data.class_id,
      };

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user_id", res.data.id);
      localStorage.setItem("id", res.data.id);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("full_name", res.data.full_name);
      localStorage.setItem("user", JSON.stringify(user));

      if (res.data.role === "teacher") {
        localStorage.setItem("teacher_id", res.data.teacher_id || "");
        localStorage.setItem("teacher_code", res.data.teacher_code || "");
      }

      if (res.data.role === "student") {
        localStorage.setItem("student_id", res.data.student_id || "");
        localStorage.setItem("student_code", res.data.student_code || "");
        localStorage.setItem("class_id", res.data.class_id || "");
      }

      if (user.role === "admin") {
        window.location.href = "/admin";
      } else if (user.role === "teacher") {
        window.location.href = "/teacher";
      } else if (user.role === "student") {
        window.location.href = "/student";
      } else {
        setError("Invalid role");
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        "Login failed. Check email and password."
      );
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <GraduationCap />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Sign in
            </h1>

            <p className="text-sm text-slate-500">
              School Management System
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>

        <input
          type="text"
          value={form.login_id}
          onChange={(e) =>
            setForm({
              ...form,
              login_id: e.target.value,
            })
          }
          placeholder="Email or Student ID"
          className="mb-6 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        />

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Password
        </label>

        <input
          type="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value,
            })
          }
          className="mb-6 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        />
        <div className="mb-4 text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-blue-600"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Login
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-blue-600"
          >
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}