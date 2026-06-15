import { Menu } from "lucide-react";
import defaultAvatar from "../../image/profile.jpg";

export default function Navbar({ title = "School Management System" }) {
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

  const profileImage =
    localStorage.getItem("profile_image") ||
    savedUser.profile_image ||
    defaultAvatar;

  const fullName = savedUser.full_name || "User";
  const role = savedUser.role || "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <Menu className="h-5 w-5 text-slate-600" />
        <h1 className="font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">
            {fullName}
          </p>
          <p className="text-xs capitalize text-slate-500">
            {role}
          </p>
        </div>

        <img
          src={profileImage}
          alt="Profile"
          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
          onError={(e) => {
            e.currentTarget.src = defaultAvatar;
          }}
        />
      </div>
    </header>
  );
}