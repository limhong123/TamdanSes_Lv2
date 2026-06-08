import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await api.post("/auth/forgot-password", {
        phone,
      });

      setMessage(res.data.message || "OTP sent to Telegram");

      setTimeout(() => {
        navigate("/reset-password", {
          state: { phone },
        });
      }, 800);
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Send OTP failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-2xl font-bold">Forgot Password</h1>

        {message && <p className="mb-4 text-blue-600">{message}</p>}

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number"
          className="mb-4 w-full rounded-xl border px-4 py-3"
          required
        />

        <button className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white">
          Send OTP
        </button>

        <Link
          to="/reset-password"
          className="mt-4 block text-center text-blue-600"
        >
          I already have OTP
        </Link>
      </form>
    </div>
  );
}