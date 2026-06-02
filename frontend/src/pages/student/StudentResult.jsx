import {
  Award,
  BookOpen,
  FileBarChart,
  FlaskConical,
  Globe,
  Languages,
  Sigma,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

const subjectStyles = {
  Khmer: {
    icon: Languages,
    color: "bg-violet-100 text-violet-700",
    bar: "bg-violet-500",
  },
  Math: {
    icon: Sigma,
    color: "bg-green-100 text-green-700",
    bar: "bg-green-500",
  },
  Mathematics: {
    icon: Sigma,
    color: "bg-green-100 text-green-700",
    bar: "bg-green-500",
  },
  English: {
    icon: BookOpen,
    color: "bg-red-100 text-red-700",
    bar: "bg-red-500",
  },
  Science: {
    icon: FlaskConical,
    color: "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
  },
  "Social Studies": {
    icon: Globe,
    color: "bg-pink-100 text-pink-700",
    bar: "bg-pink-500",
  },
  "Physics": {
    icon: FlaskConical,
    color: "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
  },
  "Chemistry": {
    icon: FlaskConical,
    color: "bg-purple-100 text-purple-700",
    bar: "bg-purple-500",
  }
};

export default function StudentResult() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    api
      .get("/scores/student/me")
      .then((res) => setScores(res.data))
      .catch(() => setScores([]));
  }, []);

  const subjects = useMemo(() => {
    const map = {};

    scores.forEach((s) => {
      const key = s.subject_name;

      if (!map[key]) {
        map[key] = {
          subject: key,
          total: 0,
          max: 0,
          scores: [],
        };
      }

      const max = s.exam_type === "Quiz" || s.exam_type === "Homework" ? 50 : 100;

      map[key].total += Number(s.score || 0);
      map[key].max += max;
      map[key].scores.push(s);
    });

    return Object.values(map);
  }, [scores]);

  const totalScore = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalMax = subjects.reduce((sum, s) => sum + s.max, 0);
  const average = totalMax ? ((totalScore / totalMax) * 100).toFixed(1) : 0;

  const rank = average >= 90 ? "A" : average >= 80 ? "B" : average >= 70 ? "C" : average >= 60 ? "D" : "F";

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <FileBarChart className="text-blue-600" size={30} />
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Result</h1>
          <p className="text-slate-500">View your study performance and subject scores</p>
        </div>
      </div>

      <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-200 text-yellow-700">
          <Award size={36} />
        </div>

        <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3">
          <div>
            <p className="text-blue-100">Total Score</p>
            <p className="mt-2 text-3xl font-bold">
              {totalScore}
              <span className="text-lg text-blue-100"> / {totalMax}</span>
            </p>
          </div>

          <div className="border-y border-white/30 py-4 md:border-x md:border-y-0 md:py-0">
            <p className="text-blue-100">Grade</p>
            <p className="mt-2 text-5xl font-bold">{rank}</p>
          </div>

          <div>
            <p className="text-blue-100">Average</p>
            <p className="mt-2 text-3xl font-bold">{average}%</p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-slate-800">Subjects</h2>

      <div className="space-y-4">
        {subjects.map((item) => {
          const style =
            subjectStyles[item.subject] || {
              icon: BookOpen,
              color: "bg-slate-100 text-slate-700",
              bar: "bg-slate-500",
            };

          const Icon = style.icon;
          const percent = item.max ? Math.round((item.total / item.max) * 100) : 0;

          return (
            <div
              key={item.subject}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${style.color}`}>
                  <Icon size={26} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {item.subject}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {item.scores.length} exam(s)
                      </p>
                    </div>

                    <p className="text-xl font-bold text-slate-900">
                      {item.total}/{item.max}
                    </p>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${style.bar}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {subjects.length === 0 && (
          <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
            No result yet
          </div>
        )}
      </div>
    </div>
  );
}