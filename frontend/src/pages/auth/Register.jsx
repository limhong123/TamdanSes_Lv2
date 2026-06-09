import {
  ArrowRight,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

export default function Register() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "student",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      await api.post("/auth/register", form);

      setMessage("Register success. You can login now.");

      setForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "student",
      });
    } catch (err) {
      const detail = err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).join(", "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Register failed");
      }
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-200 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-200 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <GraduationCap size={32} />
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              Join TAM DAN SES
            </h1>

            <p className="mt-4 text-blue-100">
              Create an account to access your school management dashboard.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck />
              <p className="font-semibold">Account Access</p>
            </div>

            <p className="text-sm text-blue-100">
              Admin can create teacher and student accounts. New users can sign in after registration.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 md:p-12">
          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 md:hidden">
              <UserPlus size={30} />
            </div>

            <h2 className="text-3xl font-bold text-slate-900">
              Create account
            </h2>

            <p className="mt-2 text-slate-500">
              Fill in the information below
            </p>
          </div>

          {message && (
            <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-600">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                First Name
              </label>

              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
                <User size={20} className="text-slate-400" />

                <input
                  value={form.first_name}
                  onChange={(e) => updateForm("first_name", e.target.value)}
                  placeholder="First name"
                  className="w-full bg-transparent px-3 py-4 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Last Name
              </label>

              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
                <User size={20} className="text-slate-400" />

                <input
                  value={form.last_name}
                  onChange={(e) => updateForm("last_name", e.target.value)}
                  placeholder="Last name"
                  className="w-full bg-transparent px-3 py-4 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
              <Mail size={20} className="text-slate-400" />

              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                placeholder="Email address"
                className="w-full bg-transparent px-3 py-4 outline-none"
                required
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
              <Lock size={20} className="text-slate-400" />

              <input
                type="password"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                placeholder="Create password"
                className="w-full bg-transparent px-3 py-4 outline-none"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Role
            </label>

            <select
              value={form.role}
              onChange={(e) => updateForm("role", e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
          >
            Register
            <ArrowRight size={20} />
          </button>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have account?{" "}
            <Link to="/login" className="font-bold text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}