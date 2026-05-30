"use client";

import { useState } from "react";

import AdminSpreadsheet from "@/components/AdminSpreadsheet";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return sessionStorage.getItem("classrecord_admin_auth") === "true";
  });
  const [statusMessage, setStatusMessage] = useState("Enter the admin password to unlock the spreadsheet.");
  const [isLoading, setIsLoading] = useState(false);

  async function handleAdminLogin() {
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setStatusMessage("Admin password is required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin-auth/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: trimmedPassword }),
      });

      const body = (await response.json().catch(() => ({}))) as { detail?: string; authenticated?: boolean };

      if (!response.ok || !body.authenticated) {
        setStatusMessage(body.detail ?? "Invalid admin password.");
        return;
      }

      sessionStorage.setItem("classrecord_admin_auth", "true");
      setIsAuthed(true);
      setPassword("");
      setStatusMessage("Admin unlocked.");
    } catch {
      setStatusMessage("Backend not reachable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isAuthed) {
    return <AdminSpreadsheet />;
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Admin access</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Unlock the spreadsheet editor.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use the admin password to open the class record editor.
          </p>

          <div className="mt-5 space-y-3">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Admin password"
            />
            <button
              type="button"
              onClick={() => void handleAdminLogin()}
              disabled={isLoading}
              className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Checking..." : "Unlock admin"}
            </button>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">{statusMessage}</p>
        </div>
      </section>
    </main>
  );
}
