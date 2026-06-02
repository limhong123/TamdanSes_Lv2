import { Link } from "react-router-dom";

export default function Navbar({ role = "teacher" }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const profileImage =
    user.profile_image ||
    localStorage.getItem("profile_image") ||
    "";

  return (
    <header className="flex h-16 items-center justify-end border-b bg-white px-6">
      <Link
        to={`/${role}/profile`}
        className="flex items-center gap-3"
      >
        {profileImage ? (
          <img
            src={`http://127.0.0.1:8000${profileImage}`}
            alt="Profile"
            className="h-10 w-10 rounded-full border object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
            {user.full_name?.charAt(0) || "U"}
          </div>
        )}

        <div>
          <p className="font-bold text-slate-800">
            {user.full_name}
          </p>

          <p className="text-xs text-slate-500 capitalize">
            {role}
          </p>
        </div>
      </Link>
    </header>
  );
}