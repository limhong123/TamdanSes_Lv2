import { CheckCircle, ClipboardCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function TeacherPermissions() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadData = () => {
    api
      .get("/permissions/teacher/me")
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/permissions/${id}/status`, { status });
      showMessage("success", `Request ${status}`);
      loadData();
    } catch (err) {
      showMessage("error", err?.response?.data?.detail || "Action failed");
    }
  };

  return (
    <div>
      {message && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold shadow-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? <CheckCircle /> : <XCircle />}
          {message.text}
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <ClipboardCheck className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Permission Requests</h1>
          <p className="text-sm text-slate-500">Approve or reject student requests</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">From</th>
              <th className="p-4 text-left">To</th>
              <th className="p-4 text-left">Reason</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-4 font-semibold">{item.student_name}</td>
                <td className="p-4">{item.type}</td>
                <td className="p-4">{item.start_date}</td>
                <td className="p-4">{item.end_date}</td>
                <td className="p-4">{item.reason}</td>
                <td className="p-4">{item.status}</td>
                <td className="p-4 text-right">
                  {item.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => updateStatus(item.id, "approved")}
                        className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "rejected")}
                        className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400">Done</span>
                  )}
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan="7" className="p-6 text-center text-slate-500">
                  No permission requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}