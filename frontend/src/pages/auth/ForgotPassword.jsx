import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setType("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", {
        phone,
      });

      setType("success");
      setMessage(res.data.message || "OTP sent to Telegram");

      setTimeout(() => {
        navigate("/reset-password", {
          state: { phone },
        });
      }, 800);
    } catch (err) {
      setType("error");
      setMessage(err?.response?.data?.detail || "Send OTP failed");
    } finally {
      setLoading(false);
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
              <GraduationCap size={32} />
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              Forgot Password?
            </h1>

            <p className="mt-4 text-blue-100">
              Enter your registered phone number. We will send an OTP to Telegram.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck />
              <p className="font-semibold">Secure Reset</p>
            </div>

            <p className="text-sm text-blue-100">
              Use the OTP code to verify your account and create a new password.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 md:p-12">
          <Link
            to="/login"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={18} />
            Back to login
          </Link>

          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 md:hidden">
              <Send size={30} />
            </div>

            <h2 className="text-3xl font-bold text-slate-900">
              Reset password
            </h2>

            <p className="mt-2 text-slate-500">
              Enter your phone number to receive OTP
            </p>
          </div>

          {message && (
            <div
              className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
                type === "success"
                  ? "border-green-100 bg-green-50 text-green-600"
                  : "border-red-100 bg-red-50 text-red-600"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Phone Number
            </label>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
              <Phone size={20} className="text-slate-400" />

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter registered phone number"
                className="w-full bg-transparent px-3 py-4 outline-none"
                required
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send OTP"}
            {!loading && <ArrowRight size={20} />}
          </button>

          <Link
            to="/reset-password"
            className="mt-6 block text-center text-sm font-bold text-blue-600 hover:underline"
          >
            I already have OTP
          </Link>
        </form>
      </div>
    </div>
  );
}