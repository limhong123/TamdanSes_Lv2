import {
  ArrowRight,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../../image/app_logo.png";
import api from "../../api/axios";

export default function Login() {
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    login_id: "",
    password: "",
  });

  const clearOldLoginData = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("profile_image");
    localStorage.removeItem("user_id");
    localStorage.removeItem("id");
    localStorage.removeItem("role");
    localStorage.removeItem("full_name");
    localStorage.removeItem("student_id");
    localStorage.removeItem("student_code");
    localStorage.removeItem("teacher_id");
    localStorage.removeItem("teacher_code");
    localStorage.removeItem("class_id");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      clearOldLoginData();

      const res = await api.post("/auth/login", {
        login_id: form.login_id,
        password: form.password,
      });

      localStorage.setItem("token", res.data.access_token);

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

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("user_id", user.id);
      localStorage.setItem("role", user.role);
      localStorage.setItem("full_name", user.full_name || "");

      if (user.role === "teacher") {
        localStorage.setItem("teacher_id", user.teacher_id || "");
        window.location.href = "/teacher";
      } else if (user.role === "student") {
        localStorage.setItem("student_id", user.student_id || "");
        localStorage.setItem("class_id", user.class_id || "");
        window.location.href = "/student";
      } else if (user.role === "admin") {
        window.location.href = "/admin";
      }
    } catch (err) {
      console.log("LOGIN ERROR:", err.response?.data || err.message);
      setError(err.response?.data?.detail || "Login failed");


      const detail = err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).join(", "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Login failed. Check login ID and password.");
      }
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-200 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-200 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <img
                src={logo}
                alt="Logo"
                className="h-10 w-10 rounded-full object-cover"
              />
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              TAM DAN SERS
            </h1>

            <p className="mt-4 text-blue-100">
              School management system for students, teachers, and admins.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck />
              <p className="font-semibold">Secure Portal</p>
            </div>

            <p className="text-sm text-blue-100">
              Login with email, teacher code, or student code to access your
              dashboard.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 md:p-12">
          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 md:hidden">
              <GraduationCap size={30} />
            </div>

            <h2 className="text-3xl font-bold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-2 text-slate-500">
              Please sign in to continue
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Login ID
            </label>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
              <Mail size={20} className="text-slate-400" />

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
                className="w-full bg-transparent px-3 py-4 outline-none"
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
              <Lock size={20} className="text-slate-400" />

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
                className="w-full bg-transparent px-3 py-4 outline-none"
                required
              />
            </div>
          </div>

          <div className="mb-6 text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
          >
            Login
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}