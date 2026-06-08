import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    phone: location.state?.phone || "",
    otp: "",
    new_password: "",
  });

  const [message, setMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await api.post("/auth/reset-password", form);

      setMessage(res.data.message || "Password reset successfully");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Reset failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        autoComplete="off"
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-2xl font-bold">Reset Password</h1>

        {message && <p className="mb-4 text-blue-600">{message}</p>}

        <input
          name="reset_phone_number"
          autoComplete="off"
          inputMode="numeric"
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) =>
            setForm({
              ...form,
              phone: e.target.value,
            })
          }
          className="mb-3 w-full rounded-xl border px-4 py-3"
          required
        />

        <input
          name="reset_otp_code"
          autoComplete="one-time-code"
          inputMode="numeric"
          placeholder="OTP Code"
          value={form.otp}
          onChange={(e) =>
            setForm({
              ...form,
              otp: e.target.value,
            })
          }
          className="mb-3 w-full rounded-xl border px-4 py-3"
          required
        />

        <input
          name="new_reset_password"
          type="password"
          autoComplete="new-password"
          placeholder="New Password"
          value={form.new_password}
          onChange={(e) =>
            setForm({
              ...form,
              new_password: e.target.value,
            })
          }
          className="mb-4 w-full rounded-xl border px-4 py-3"
          required
        />

        <button className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white">
          Reset Password
        </button>

        <Link to="/login" className="mt-4 block text-center text-blue-600">
          Back to Login
        </Link>
      </form>
    </div>
  );
}