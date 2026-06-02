import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import api from "../../api/axios";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");
  const [role, setRole] = useState("student");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      await api.post("/auth/register", {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role,
      });

      setMessage("Register success. You can login now.");

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("123456");
      setRole("student");

    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        "Register failed"
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
              Register
            </h1>

            <p className="text-sm text-slate-500">
              Create new account
            </p>
          </div>
        </div>

        {message && (
          <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
            {message}
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            required
          />

          <input
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            required
          />
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
          required
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mb-6 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>

        <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
          Register
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have account?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}