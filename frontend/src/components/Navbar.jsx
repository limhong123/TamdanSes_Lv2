import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import defaultAvatar from "../../image/profile.jpg";

export default function Navbar({ title = "School Management System" }) {
  const getUserFromStorage = () => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

    return {
      full_name: savedUser.full_name || "User",
      role: savedUser.role || "",
      profile_image:
        savedUser.profile_image ||
        localStorage.getItem("profile_image") ||
        defaultAvatar,
    };
  };

  const [user, setUser] = useState(getUserFromStorage());

  useEffect(() => {
    const refreshUser = () => {
      setUser(getUserFromStorage());
    };

    window.addEventListener("userUpdated", refreshUser);
    window.addEventListener("storage", refreshUser);

    return () => {
      window.removeEventListener("userUpdated", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <Menu className="h-5 w-5 text-slate-600" />
        <h1 className="font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-green-600 ">
            {user.full_name}
          </p>
          <p className="text-xs capitalize text-slate-500">
            {user.role}
          </p>
        </div>

        <img
          src={user.profile_image || defaultAvatar}
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