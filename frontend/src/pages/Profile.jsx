import {
  Camera,
  Mail,
  Pencil,
  Shield,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
  });

  const getDefaultAvatar = (name = "User") => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || "User"
    )}&background=E0F2FE&color=2563EB&size=256`;
  };

  const loadProfile = async () => {
    try {
      const res = await api.get("/profile/me");
      setProfile(res.data);

      const fullName = `${res.data.user.first_name || ""} ${
        res.data.user.last_name || ""
      }`.trim();

      const avatar =
        res.data.user.avatar_url || getDefaultAvatar(fullName || "User");

      const userData = {
        id: res.data.user.id,
        email: res.data.user.email,
        role: res.data.user.role,
        full_name: fullName,
        profile_image: avatar,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("profile_image", avatar);
    } catch (err) {
      setError(err?.response?.data?.detail || "Cannot load profile");
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const fullName = profile
    ? `${profile.user.first_name || ""} ${profile.user.last_name || ""}`.trim()
    : "";

  const role = profile?.user?.role;
  const data = profile?.profile;

  const avatarUrl =
    avatarPreview ||
    profile?.user?.avatar_url ||
    getDefaultAvatar(fullName || "User");

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await api.post("/profile/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setProfile((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          avatar_url: res.data.avatar_url,
        },
      }));

      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

      savedUser.profile_image = res.data.avatar_url;

      localStorage.setItem("user", JSON.stringify(savedUser));
      localStorage.setItem("profile_image", res.data.avatar_url);

      setAvatarPreview("");
      alert("Avatar uploaded successfully");
    } catch {
      setAvatarPreview("");
      alert("Upload failed");
    }
  };

  const openEditProfile = () => {
    setEditForm({
      first_name: profile.user.first_name || "",
      last_name: profile.user.last_name || "",
    });

    setEditOpen(true);
  };

  const updateProfile = async (e) => {
    e.preventDefault();

    try {
      const res = await api.put("/profile/info", editForm);

      setProfile((prev) => ({
        ...prev,
        user: res.data.user,
      }));

      const fullName = `${res.data.user.first_name || ""} ${
        res.data.user.last_name || ""
      }`.trim();

      const avatar =
        res.data.user.avatar_url || getDefaultAvatar(fullName || "User");

      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

      savedUser.full_name = fullName;
      savedUser.email = res.data.user.email;
      savedUser.role = res.data.user.role;
      savedUser.profile_image = avatar;

      localStorage.setItem("user", JSON.stringify(savedUser));
      localStorage.setItem("profile_image", avatar);

      setEditOpen(false);
      alert("Profile updated successfully");
    } catch (err) {
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-600">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profile</h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your account information
          </p>
        </div>

        <button
          onClick={openEditProfile}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Pencil size={16} />
          Edit Profile
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-30 bg-gradient-to-r from-blue-600 to-cyan-500" />

        <div className="px-8 pb-8">
          <div className="-mt-14 flex flex-col gap-5 md:flex-row md:items-end">
            <div className="relative">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>

              <label className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-700">
                <Camera size={18} />

                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-green-600">
                {fullName || "User"}
              </h2>

              <p className="mt-1 capitalize text-blue-600">
                {role || "-"}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {role === "student" && (
              <SummaryCard
                icon={User}
                label="Student ID"
                value={data?.student_code}
              />
            )}

            {role === "teacher" && (
              <SummaryCard
                icon={User}
                label="Teacher ID"
                value={data?.teacher_code}
              />
            )}

            <SummaryCard
              icon={Mail}
              label="Email"
              value={profile.user.email}
            />

            <SummaryCard
              icon={Shield}
              label="Role"
              value={profile.user.role}
            />
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-6">
            <h3 className="mb-5 text-lg font-bold text-slate-800">
              Profile Information
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Info label="Full Name" value={fullName} />
              <Info label="Email" value={profile.user.email} />
              

              {data ? (
                <>
                  {role === "student" && (
                    <>
                      <Info label="Student ID" value={data.student_code} />
                      <Info
                        label="Class"
                        value={data.class_name || data.class_id}
                      />
                      
                      <Info label="Gender" value={data.gender} />
                      <Info label="Guardian Name" value={data.guardian_name} />
                      <Info label="Guardian Phone" value={data.guardian_phone} />
                      <Info label="Address" value={data.address} />
                    </>
                  )}

                  {role === "teacher" && (
                    <>
                      <Info label="Teacher ID" value={data.teacher_code} />
                      <Info label="Subject" value={data.subject_name} />
                      <Info label="Phone" value={data.phone} />
                      <Info label="Address" value={data.address} />
                      <Info label="Qualification" value={data.qualification} />
                    </>
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-red-50 p-4 text-red-600 md:col-span-2">
                  {role} profile not created yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={updateProfile}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Update Profile
              </h2>

              <button type="button" onClick={() => setEditOpen(false)}>
                <X />
              </button>
            </div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              First Name
            </label>

            <input
              value={editForm.first_name}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  first_name: e.target.value,
                })
              }
              className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              required
            />

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Last Name
            </label>

            <input
              value={editForm.last_name}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  last_name: e.target.value,
                })
              }
              className="mb-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              required
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
        <Icon size={22} />
      </div>

      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-bold text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}