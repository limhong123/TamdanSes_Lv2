import {
  Camera,
  Mail,
  Pencil,
  Shield,
  User,
  UserCircle,
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

  useEffect(() => {
    api
      .get("/profile/me")
      .then((res) => setProfile(res.data))
      .catch((err) =>
        setError(err?.response?.data?.detail || "Cannot load profile")
      );
  }, []);

  const fullName = profile
    ? `${profile.user.first_name || ""} ${profile.user.last_name || ""}`
    : "";

  const avatarUrl =
    avatarPreview ||
    (profile?.user?.avatar_url
      ? `http://127.0.0.1:8000${profile.user.avatar_url}`
      : "");

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await api.post("/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfile((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          avatar_url: res.data.avatar_url,
        },
      }));

      alert("Avatar uploaded successfully");
    } catch {
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

      setEditOpen(false);
      alert("Profile updated successfully");
    } catch (err) {
      alert(err?.response?.data?.detail || "Update failed");
    }
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!profile) return <p className="text-slate-500">Loading...</p>;

  const role = profile.user?.role;
  const data = profile.profile;

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
        <div className="h-25 bg-blue-600" />

        <div className="px-8 pb-8">
          <div className="-mt-14 flex flex-col gap-5 md:flex-row md:items-end">
            <div className="relative">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle size={80} className="text-slate-400" />
                )}
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

            <div className="pb">
              <h2 className="text-2xl font-bold text-slate-900">
                {fullName}
              </h2>
              <p className="mt-1 capitalize text-slate-500">{role}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            <SummaryCard icon={User} label="User ID" value={profile.user.id} />
            <SummaryCard icon={Mail} label="Email" value={profile.user.email} />
            <SummaryCard icon={Shield} label="Role" value={profile.user.role} />
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-6">
            <h3 className="mb-5 text-lg font-bold text-slate-800">
              Profile Information
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Info label="Full Name" value={fullName} />
              <Info label="Email" value={profile.user.email} />
              <Info label="Role" value={profile.user.role} />
              <Info label="User ID" value={profile.user.id} />

              {data ? (
                <>
                  <Info label="Profile ID" value={data.id} />
                  

                  {role === "student" && (
                    <>
                      <Info
                        label="Class"
                        value={data.class_name || data.class_id}
                      />
                      <Info label="Gender" value={data.gender} />
                      <Info label="Guardian Name" value={data.guardian_name} />
                      <Info
                        label="Guardian Phone"
                        value={data.guardian_phone}
                      />
                      <Info label="Address" value={data.address} />
                    </>
                  )}

                  {role === "teacher" && (
                    <>
                      <Info
                        label="Subject"
                        value={data.subject_name || data.subject_id}
                      />
                      <Info label="Phone" value={data.phone} />
                      <Info label="Address" value={data.address} />
                      <Info
                        label="Qualification"
                        value={data.qualification}
                      />
                    </>
                  )}
                </>
              ) : (
                <p className="text-red-600">{role} profile not created yet.</p>
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
                setEditForm({ ...editForm, first_name: e.target.value })
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
                setEditForm({ ...editForm, last_name: e.target.value })
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