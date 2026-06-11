import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Phone,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import logo from "../../../image/app_logo.png";
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
      setMessage(
        res.data.message ||
          "OTP has been sent successfully. Please check Telegram."
      );

      setTimeout(() => {
        navigate("/reset-password", {
          state: { phone },
        });
      }, 900);
    } catch (err) {
      const detail = err?.response?.data?.detail;

      setType("error");

      if (Array.isArray(detail)) {
        setMessage(detail.map((e) => e.msg).join(", "));
      } else if (typeof detail === "string") {
        setMessage(detail);
      } else {
        setMessage("Send OTP failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-blue-300/50 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 h-96 w-96 rounded-full bg-indigo-300/50 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/50 bg-white/90 shadow-2xl backdrop-blur md:grid-cols-2">
        <div className="hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 shadow-lg">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-full object-cover" />
            </div>

            <h1 className="text-4xl font-extrabold leading-tight">
              Forgot Password?
            </h1>

            <p className="mt-4 max-w-sm text-blue-100">
              Enter your registered phone number. We will send an OTP code to
              your Telegram for verification.
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-2xl bg-white/20 p-3">
                <ShieldCheck size={22} />
              </div>

              <p className="font-bold">Secure Reset</p>
            </div>

            <p className="text-sm leading-6 text-blue-100">
              Your account is protected. Use the OTP code to verify your
              identity before creating a new password.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 md:p-12">
          <Link
            to="/login"
            className="mb-8 inline-flex items-center gap-2 rounded-full px-1 text-sm font-semibold text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={18} />
            Back to login
          </Link>

          <div className="mb-8">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 md:hidden">
              <img src={logo} alt="Logo" className="h-10 w-10 rounded-full object-cover" />
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900">
              Reset password
            </h2>

            <p className="mt-2 text-slate-500">
              Enter your phone number to receive OTP
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm font-medium ${
                type === "success"
                  ? "border-green-100 bg-green-50 text-green-700"
                  : "border-red-100 bg-red-50 text-red-700"
              }`}
            >
              {type === "success" ? (
                <CheckCircle size={20} />
              ) : (
                <XCircle size={20} />
              )}

              <span>{message}</span>
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Phone Number
            </label>

            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-600 focus-within:bg-white focus-within:shadow-sm">
              <Phone size={20} className="text-slate-400" />

              <input
                type="tel"
                pattern="[0-9]{8,15}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter registered phone number"
                className="w-full bg-transparent px-3 py-4 outline-none"
                required
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Example: 012345678. Use the phone number linked to your account.
            </p>
          </div>

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending OTP...
              </>
            ) : (
              <>
                Send OTP
                <ArrowRight size={20} />
              </>
            )}
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