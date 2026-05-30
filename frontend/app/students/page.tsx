"use client";

import { useState } from "react";

type ApiRecord = {
  id: number;
  student_id: string;
  student_name: string;
  has_password: boolean;
  record_data: Record<string, string>;
};

export default function StudentsPage() {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [password, setPassword] = useState("");
  const [authStage, setAuthStage] = useState<"idle" | "password">("idle");
  const [passwordAction, setPasswordAction] = useState<"login" | "create">("login");
  const [statusMessage, setStatusMessage] = useState(
    "Enter your student ID and click Log in. The system will check whether the account already has a password, then let you enter it or create one.",
  );
  const [record, setRecord] = useState<ApiRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const recordEntries = record ? Object.entries(record.record_data || {}) : [];

  async function handleCheckStudent() {
    const trimmedStudentId = studentId.trim();

    if (!trimmedStudentId) {
      setStatusMessage("Student ID is required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/student-records/auth/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: trimmedStudentId,
          student_name: studentName.trim(),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        detail?: string;
        record?: ApiRecord;
        bootstrapped?: boolean;
        record_exists?: boolean;
        has_password?: boolean;
        needs_password?: boolean;
      };

      if (!response.ok) {
        setStatusMessage(body.detail ?? "Unable to log in.");
        return;
      }

      if (!body.record_exists || body.needs_password) {
        setRecord(null);
        setPassword("");
        setPasswordAction("create");
        setAuthStage("password");
        setStatusMessage(
          body.record_exists
            ? "No password found yet. Create one for this student ID."
            : "No account found yet. Create one by setting a password.",
        );
        return;
      }

  setRecord(null);
      setPassword("");
      setPasswordAction("login");
      setAuthStage("password");
      setStatusMessage("Password found. Enter it to log in.");
    } catch {
      setStatusMessage("Backend not reachable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitPassword() {
    const trimmedStudentId = studentId.trim();
    const trimmedPassword = password.trim();
    const trimmedStudentName = studentName.trim();

    if (!trimmedStudentId || !trimmedPassword) {
      setStatusMessage("Student ID and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/student-records/auth/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: trimmedStudentId,
          student_name: trimmedStudentName,
          password: trimmedPassword,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        detail?: string;
        record?: ApiRecord;
        bootstrapped?: boolean;
      };

      if (!response.ok || !body.record) {
        setStatusMessage(body.detail ?? "Unable to log in.");
        return;
      }

      setRecord(body.record);
      setAuthStage("idle");
      setPassword("");
      setStatusMessage(
        body.bootstrapped
          ? `Password created for ${body.record.student_id}.`
          : `Logged in as ${body.record.student_id}.`,
      );
    } catch {
      setStatusMessage("Backend not reachable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Students</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Log in with your student ID.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            If your student ID does not have an account yet, the password you enter here becomes the first password for that ID.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_18px_70px_rgba(15,23,42,0.18)]">
            <h2 className="text-2xl font-semibold tracking-tight">Student login</h2>
            <div className="mt-5 space-y-3">
              <input
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                placeholder="Student ID"
              />
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                placeholder="Student name"
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={authStage === "idle"}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                placeholder={authStage === "idle" ? "Click Log in first" : passwordAction === "login" ? "Password" : "Create password"}
                type="password"
              />
              <button
                type="button"
                onClick={() => void (authStage === "idle" ? handleCheckStudent() : handleSubmitPassword())}
                disabled={isLoading}
                className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading
                  ? "Checking..."
                  : authStage === "idle"
                    ? "Log in"
                    : passwordAction === "login"
                      ? "Log in"
                      : "Create password"}
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{statusMessage}</p>
            {authStage === "password" ? (
              <button
                type="button"
                onClick={() => {
                  setAuthStage("idle");
                  setPassword("");
                  setPasswordAction("login");
                }}
                className="mt-4 text-sm font-medium text-sky-300 underline underline-offset-4"
              >
                Back to student ID
              </button>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.1)] backdrop-blur-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Your record</h2>
            {record ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <tbody>
                    <tr>
                      <th className="w-40 whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-left font-medium text-slate-600">
                        1st Row
                      </th>
                      <td className="border-b border-slate-200 px-4 py-3 text-slate-950">
                        Student ID: {record.student_id}
                      </td>
                    </tr>
                    <tr>
                      <th className="whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-left font-medium text-slate-600">
                        2nd Row
                      </th>
                      <td className="border-b border-slate-200 px-4 py-3 text-slate-950">
                        Name: {record.student_name || "Not set"}
                      </td>
                    </tr>
                    <tr>
                      <th className="whitespace-nowrap border-b border-slate-200 bg-slate-100 px-4 py-3 text-left font-medium text-slate-600">
                        3rd Row
                      </th>
                      <td className="border-b border-slate-200 px-4 py-3 text-slate-950">
                        Access: {record.has_password ? "Password enabled" : "Password not set yet"}
                      </td>
                    </tr>
                    <tr>
                      <th className="align-top whitespace-nowrap bg-slate-100 px-4 py-3 text-left font-medium text-slate-600">
                        4th Row
                      </th>
                      <td className="px-4 py-3 text-slate-950">
                        <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Your records</div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {recordEntries.length > 0 ? (
                            recordEntries.map(([key, value]) => (
                              <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{key}</p>
                                <p className="mt-1 text-sm font-medium text-slate-950">{String(value)}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No record cells have been filled yet.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Your record will appear here after login.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
