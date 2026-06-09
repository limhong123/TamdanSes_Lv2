import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function RegisterAdmin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    secret_key: "",
  });

  const submit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/auth/register-admin", form);

      alert("Admin registered successfully");
      navigate("/login");
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
        "Register failed"
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="mb-6 text-center text-2xl font-bold">
          Register Admin
        </h1>

        <input
          placeholder="First Name"
          className="mb-3 w-full rounded-xl border p-3"
          value={form.first_name}
          onChange={(e) =>
            setForm({
              ...form,
              first_name: e.target.value,
            })
          }
          required
        />

        <input
          placeholder="Last Name"
          className="mb-3 w-full rounded-xl border p-3"
          value={form.last_name}
          onChange={(e) =>
            setForm({
              ...form,
              last_name: e.target.value,
            })
          }
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="mb-3 w-full rounded-xl border p-3"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-3 w-full rounded-xl border p-3"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value,
            })
          }
          required
        />

        <input
          placeholder="Admin Secret Key"
          className="mb-4 w-full rounded-xl border p-3"
          value={form.secret_key}
          onChange={(e) =>
            setForm({
              ...form,
              secret_key: e.target.value,
            })
          }
          required
        />

        <button
          className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white"
        >
          Register Admin
        </button>
      </form>
    </div>
  );
}