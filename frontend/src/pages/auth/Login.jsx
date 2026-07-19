import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import logo from "../../../image/app_logo.png";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { setUser } = useAuth();

  const [loginType, setLoginType] = useState("normal");
  const [parentStep, setParentStep] = useState("request");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    login_id: "",
    password: "",
  });

  const [parentForm, setParentForm] = useState({
    student_code: "",
    parent_phone: "",
    otp: "",
  });

  const clearOldLoginData = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("profile_image");
    localStorage.removeItem("user_id");
    localStorage.removeItem("id");
    localStorage.removeItem("role");
    localStorage.removeItem("full_name");

    localStorage.removeItem("student_id");
    localStorage.removeItem("student_code");
    localStorage.removeItem("class_id");

    localStorage.removeItem("teacher_id");
    localStorage.removeItem("teacher_code");

    localStorage.removeItem("parent_id");
    localStorage.removeItem("parent_phone");
    localStorage.removeItem("parent_students");
    localStorage.removeItem("selected_student_id");
    localStorage.removeItem("selected_student_code");
  };

  const getErrorMessage = (err, fallbackMessage) => {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    return fallbackMessage;
  };

  const switchLoginType = (type) => {
    setLoginType(type);
    setParentStep("request");
    setError("");
    setMessage("");

    setParentForm({
      student_code: "",
      parent_phone: "",
      otp: "",
    });
  };

  // =====================================================
  // Normal login: admin, teacher, student
  // =====================================================

  const submitNormalLogin = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      clearOldLoginData();

      const res = await api.post("/auth/login", {
        login_id: form.login_id.trim(),
        password: form.password,
      });

      const user = {
        id: res.data.id,
        email: res.data.email,
        role: res.data.role,
        full_name: res.data.full_name,

        student_id: res.data.student_id,
        student_code: res.data.student_code,
        class_id: res.data.class_id,

        teacher_id: res.data.teacher_id,
        teacher_code: res.data.teacher_code,

        profile_image: res.data.profile_image,
      };

      localStorage.setItem(
        "token",
        res.data.access_token || "",
      );

      localStorage.setItem(
        "user",
        JSON.stringify(user),
      );

      localStorage.setItem(
        "user_id",
        String(user.id || ""),
      );

      localStorage.setItem(
        "id",
        String(user.id || ""),
      );

      localStorage.setItem(
        "role",
        user.role || "",
      );

      localStorage.setItem(
        "full_name",
        user.full_name || "",
      );

      if (user.profile_image) {
        localStorage.setItem(
          "profile_image",
          user.profile_image,
        );
      }

      if (user.role === "teacher") {
        localStorage.setItem(
          "teacher_id",
          String(user.teacher_id || user.id || ""),
        );

        localStorage.setItem(
          "teacher_code",
          user.teacher_code || "",
        );
      }

      if (user.role === "student") {
        localStorage.setItem(
          "student_id",
          String(user.student_id || user.id || ""),
        );

        localStorage.setItem(
          "student_code",
          user.student_code || "",
        );

        localStorage.setItem(
          "class_id",
          String(user.class_id || ""),
        );
      }

      setUser(user);

      if (user.role === "teacher") {
        window.location.href = "/teacher";
        return;
      }

      if (user.role === "student") {
        window.location.href = "/student";
        return;
      }

      if (user.role === "admin") {
        window.location.href = "/admin";
        return;
      }

      setError("Unknown user role");
    } catch (err) {
      console.log(
        "LOGIN ERROR:",
        err.response?.data || err.message,
      );

      setError(
        getErrorMessage(
          err,
          "Login failed. Check login ID and password.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Parent request OTP
  // =====================================================

  const requestParentOtp = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const studentCode = parentForm.student_code.trim();
    const parentPhone = parentForm.parent_phone.trim();

    if (!studentCode) {
      setError("Student ID is required.");
      return;
    }

    if (!parentPhone) {
      setError("Parent phone is required.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(
        "/auth/parent/request-otp",
        {
          student_code: studentCode,
          parent_phone: parentPhone,
        },
      );

      setParentStep("verify");

      setMessage(
        res.data?.message ||
        "OTP was sent to the parent phone.",
      );
    } catch (err) {
      console.log(
        "PARENT OTP ERROR:",
        err.response?.data || err.message,
      );

      setError(
        getErrorMessage(
          err,
          "Failed to send OTP. Check Student ID and parent phone.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Parent verify OTP and login
  // =====================================================

  const verifyParentOtp = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const studentCode = parentForm.student_code.trim();
    const parentPhone = parentForm.parent_phone.trim();
    const otp = parentForm.otp.trim();

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      clearOldLoginData();

      const res = await api.post(
        "/auth/parent/verify-otp",
        {
          student_code:
            parentForm.student_code.trim(),
          parent_phone:
            parentForm.parent_phone.trim(),
          otp: parentForm.otp.trim(),
        },
      );

      if (res.data.requires_password_setup) {
        sessionStorage.setItem(
          "parent_setup_token",
          res.data.setup_token,
        );

        window.location.href =
          "/parent/create-password";

        return;
      }

      const students =
        res.data.students ||
        res.data.children ||
        [];

      const firstStudent =
        students.length > 0
          ? students[0]
          : {
            id: res.data.student_id,
            student_code: res.data.student_code,
            class_id: res.data.class_id,
            student_name: res.data.student_name,
          };

      const parentData =
        res.data.parent || {
          id: res.data.parent_id,
          name:
            res.data.parent_name ||
            res.data.guardian_name ||
            "Parent",
          phone:
            res.data.parent_phone ||
            res.data.guardian_phone ||
            parentPhone,
        };

      const parentUser = {
        id: parentData.id,
        role: "parent",
        full_name: parentData.name,
        phone: parentData.phone,
        students,
        selected_student_id: firstStudent?.id || null,
      };

      localStorage.setItem(
        "token",
        res.data.access_token || "",
      );

      localStorage.setItem(
        "role",
        "parent",
      );

      localStorage.setItem(
        "parent_id",
        String(parentData.id || ""),
      );

      localStorage.setItem(
        "parent_phone",
        parentData.phone || parentPhone,
      );

      localStorage.setItem(
        "full_name",
        parentData.name || "Parent",
      );

      localStorage.setItem(
        "user",
        JSON.stringify(parentUser),
      );

      localStorage.setItem(
        "parent_students",
        JSON.stringify(students),
      );

      if (firstStudent?.id) {
        localStorage.setItem(
          "selected_student_id",
          String(firstStudent.id),
        );

        localStorage.setItem(
          "student_id",
          String(firstStudent.id),
        );
      }

      if (firstStudent?.student_code) {
        localStorage.setItem(
          "selected_student_code",
          firstStudent.student_code,
        );

        localStorage.setItem(
          "student_code",
          firstStudent.student_code,
        );
      }

      if (firstStudent?.class_id) {
        localStorage.setItem(
          "class_id",
          String(firstStudent.class_id),
        );
      }

      setUser(parentUser);

      window.location.href = "/parent";
    } catch (err) {
      console.log(
        "PARENT VERIFY ERROR:",
        err.response?.data || err.message,
      );

      setError(
        getErrorMessage(
          err,
          "OTP is incorrect or expired.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const resendParentOtp = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post(
        "/auth/parent/request-otp",
        {
          student_code:
            parentForm.student_code.trim(),
          parent_phone:
            parentForm.parent_phone.trim(),
        },
      );

      setMessage(
        res.data?.message ||
        "A new OTP was sent.",
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Failed to resend OTP.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const isParent = loginType === "parent";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-200 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-200 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-2">
        {/* Left side */}
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
              {isParent
                ? "Stay connected with your child's education and school activities."
                : "School management system for students, teachers, and admins."}
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck />
              <p className="font-semibold">
                {isParent
                  ? "Parent Portal"
                  : "Secure Portal"}
              </p>
            </div>

            <p className="text-sm text-blue-100">
              {isParent
                ? "Login securely using your child's Student ID and your registered phone number."
                : "Login with email, teacher code, or student code to access your dashboard."}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="p-8 md:p-12">
          <div className="mb-7">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 md:hidden">
              <GraduationCap size={30} />
            </div>

            <h2 className="text-3xl font-bold text-slate-900">
              {isParent
                ? parentStep === "verify"
                  ? "Verify OTP"
                  : "Parent Login"
                : "Welcome back"}
            </h2>

            <p className="mt-2 text-slate-500">
              {isParent
                ? parentStep === "verify"
                  ? "Enter the 6-digit code sent to your phone"
                  : "Access your children's school information"
                : "Please sign in to continue"}
            </p>
          </div>

          {/* Login type tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() =>
                switchLoginType("normal")
              }
              className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${loginType === "normal"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Student / Staff
            </button>

            <button
              type="button"
              onClick={() =>
                switchLoginType("parent")
              }
              className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${loginType === "parent"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Parent
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          {/* Normal login */}
          {loginType === "normal" && (
            <form onSubmit={submitNormalLogin}>
              <div className="mb-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Login ID
                </label>

                <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
                  <Mail
                    size={20}
                    className="text-slate-400"
                  />

                  <input
                    type="text"
                    value={form.login_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        login_id: e.target.value,
                      })
                    }
                    placeholder="Email, Teacher ID, or Student ID"
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
                  <Lock
                    size={20}
                    className="text-slate-400"
                  />

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
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}

                {!loading && (
                  <ArrowRight size={20} />
                )}
              </button>
            </form>
          )}

          {/* Parent request OTP */}
          {loginType === "parent" &&
            parentStep === "request" && (
              <form onSubmit={requestParentOtp}>
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Student ID
                  </label>

                  <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
                    <UserRound
                      size={20}
                      className="text-slate-400"
                    />

                    <input
                      type="text"
                      value={
                        parentForm.student_code
                      }
                      onChange={(e) =>
                        setParentForm({
                          ...parentForm,
                          student_code:
                            e.target.value,
                        })
                      }
                      placeholder="Example: ST-0001"
                      className="w-full bg-transparent px-3 py-4 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Parent Phone
                  </label>

                  <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
                    <Phone
                      size={20}
                      className="text-slate-400"
                    />

                    <input
                      type="tel"
                      value={
                        parentForm.parent_phone
                      }
                      onChange={(e) =>
                        setParentForm({
                          ...parentForm,
                          parent_phone:
                            e.target.value,
                        })
                      }
                      placeholder="Example: 012345678"
                      className="w-full bg-transparent px-3 py-4 outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Sending OTP..."
                    : "Send OTP"}

                  {!loading && (
                    <ArrowRight size={20} />
                  )}
                </button>
              </form>
            )}

          {/* Parent verify OTP */}
          {loginType === "parent" &&
            parentStep === "verify" && (
              <form onSubmit={verifyParentOtp}>
                <button
                  type="button"
                  onClick={() => {
                    setParentStep("request");
                    setError("");
                    setMessage("");
                    setParentForm({
                      ...parentForm,
                      otp: "",
                    });
                  }}
                  className="mb-5 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
                >
                  <ArrowLeft size={17} />
                  Change Student ID or Phone
                </button>

                <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  OTP was sent to{" "}
                  <span className="font-semibold">
                    {parentForm.parent_phone}
                  </span>
                </div>

                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    OTP Code
                  </label>

                  <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
                    <KeyRound
                      size={20}
                      className="text-slate-400"
                    />

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={parentForm.otp}
                      onChange={(e) =>
                        setParentForm({
                          ...parentForm,
                          otp: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6),
                        })
                      }
                      placeholder="Enter 6-digit OTP"
                      className="w-full bg-transparent px-3 py-4 text-center text-xl font-bold tracking-[0.5em] outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Verifying..."
                    : "Verify & Login"}

                  {!loading && (
                    <ArrowRight size={20} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={resendParentOtp}
                  disabled={loading}
                  className="mt-4 w-full py-2 text-sm font-semibold text-blue-600 hover:underline disabled:opacity-60"
                >
                  Resend OTP
                </button>
              </form>
            )}
        </div>
      </div>
    </div>
  );
}