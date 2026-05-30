"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SpreadsheetRow = {
  studentId: string;
  studentName: string;
  password: string;
  recordData: Record<string, string>;
};

type ApiRecord = {
  id: number;
  student_id: string;
  student_name: string;
  has_password: boolean;
  record_data: Record<string, string>;
};

type LoginState = {
  studentId: string;
  studentName: string;
  password: string;
};

const DEFAULT_COLUMNS = ["Quiz 1", "Quiz 2", "Project", "Exam", "Remarks"];

function makeUniqueColumns(columns: string[]) {
  const seen = new Map<string, number>();

  return columns.map((column) => {
    const baseName = column.trim() || "Column";
    const nextCount = (seen.get(baseName) ?? 0) + 1;
    seen.set(baseName, nextCount);

    return nextCount === 1 ? baseName : `${baseName} ${nextCount}`;
  });
}

function createBlankRow(columns: string[] = DEFAULT_COLUMNS): SpreadsheetRow {
  return {
    studentId: "",
    studentName: "",
    password: "",
    recordData: Object.fromEntries(columns.map((column) => [column, ""])),
  };
}

function asText(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function parseExcelPaste(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length === 0) {
    return { columns: DEFAULT_COLUMNS, rows: [] as SpreadsheetRow[] };
  }

  const cells = lines.map((line) => line.split("\t"));
  const firstRow = cells[0].map((value) => value.trim());
  const headerHints = firstRow.some((value) => /student\s*id|name|password/i.test(value));
  const hasHeaderRow = headerHints || firstRow.length >= 3;

  const columns = makeUniqueColumns(
    hasHeaderRow ? firstRow.slice(2).filter(Boolean) : firstRow.length > 4 ? firstRow.slice(2).filter(Boolean) : DEFAULT_COLUMNS,
  );
  const dataRows = hasHeaderRow ? cells.slice(1) : cells;

  return {
    columns,
    rows: dataRows.map((row) => ({
      studentId: asText(row[0]),
      studentName: asText(row[1]),
      password: headerHints ? asText(row[2]) : "",
      recordData: Object.fromEntries(columns.map((column, index) => [column, asText(row[index + 2])])),
    })) satisfies SpreadsheetRow[],
  };
}

export default function AdminSpreadsheet() {
  const [rows, setRows] = useState<SpreadsheetRow[]>([createBlankRow()]);
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [loginState, setLoginState] = useState<LoginState>({ studentId: "", studentName: "", password: "" });
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [importText, setImportText] = useState("");
  const [statusMessage, setStatusMessage] = useState("Load records from the backend or paste an Excel range to start.");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  function scrollTableToEnd() {
    window.requestAnimationFrame(() => {
      const container = tableScrollRef.current;
      if (!container) {
        return;
      }

      container.scrollLeft = container.scrollWidth;
    });
  }

  const activeRowIndex = useMemo(
    () => rows.findIndex((row) => row.studentId === selectedStudentId),
    [rows, selectedStudentId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      try {
        const response = await fetch("/api/student-records/");
        if (!response.ok) {
          throw new Error("Unable to load records");
        }

        const payload = (await response.json()) as ApiRecord[];
        if (cancelled) {
          return;
        }

        const dynamicColumns = Array.from(new Set(payload.flatMap((record) => Object.keys(record.record_data || {}))));
        const nextColumns = makeUniqueColumns(dynamicColumns.length > 0 ? dynamicColumns : DEFAULT_COLUMNS);

        setColumns(nextColumns);
        setRows(
          payload.length > 0
            ? payload.map((record) => ({
                studentId: record.student_id,
                studentName: record.student_name,
                password: "",
                recordData: nextColumns.reduce<Record<string, string>>((accumulator, column) => {
                  accumulator[column] = asText(record.record_data?.[column]);
                  return accumulator;
                }, {}),
              }))
            : [createBlankRow(nextColumns)],
        );

        setSelectedStudentId(payload[0]?.student_id ?? "");
        setStatusMessage(payload.length > 0 ? "Records loaded from the backend." : "No records yet. Start by adding a row or pasting Excel data.");
        if (payload.length > 0) {
          scrollTableToEnd();
        }
      } catch {
        if (!cancelled) {
          setStatusMessage("Backend not reachable yet, so the spreadsheet is running locally.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateRow(index: number, field: keyof Omit<SpreadsheetRow, "recordData">, value: string) {
    setRows((currentRows) =>
      currentRows.map((row, currentIndex) => (currentIndex === index ? { ...row, [field]: value } : row)),
    );
  }

  function updateRecordData(index: number, column: string, value: string) {
    setRows((currentRows) =>
      currentRows.map((row, currentIndex) =>
        currentIndex === index
          ? {
              ...row,
              recordData: {
                ...row.recordData,
                [column]: value,
              },
            }
          : row,
      ),
    );
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, createBlankRow(columns)]);
  }

  function addColumn() {
    const nextColumn = prompt("New column name")?.trim();
    if (!nextColumn) {
      return;
    }

    const nextColumns = makeUniqueColumns([...columns, nextColumn]);
    const finalColumn = nextColumns[nextColumns.length - 1] ?? nextColumn;

    setColumns(nextColumns);
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        recordData: {
          ...row.recordData,
          [finalColumn]: row.recordData[finalColumn] ?? "",
        },
      })),
    );
  }

  function removeRow(index: number) {
    setRows((currentRows) => currentRows.filter((_, currentIndex) => currentIndex !== index));
  }

  function importPaste() {
    const parsed = parseExcelPaste(importText);

    if (parsed.rows.length === 0) {
      setStatusMessage("Paste a tab-separated Excel range before importing.");
      return;
    }

    const normalizedColumns = makeUniqueColumns(parsed.columns);

    setColumns(normalizedColumns);
    setRows(
      parsed.rows.map((row) => ({
        ...row,
        recordData: normalizedColumns.reduce<Record<string, string>>((accumulator, column) => {
          accumulator[column] = row.recordData[column] ?? "";
          return accumulator;
        }, {}),
      })),
    );
    setSelectedStudentId(parsed.rows[0]?.studentId ?? "");
    setStatusMessage(
      `Imported ${parsed.rows.length} student rows and ${parsed.columns.length} editable columns from pasted Excel data.`,
    );
    scrollTableToEnd();
  }

  async function syncRow(row: SpreadsheetRow) {
    const payload = {
      student_id: row.studentId,
      student_name: row.studentName,
      password: row.password,
      record_data: row.recordData,
    };

    const detailResponse = await fetch(`/api/student-records/${encodeURIComponent(row.studentId)}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (detailResponse.ok) {
      return;
    }

    if (detailResponse.status === 404) {
      const createResponse = await fetch("/api/student-records/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (createResponse.ok) {
        return;
      }

      const createBody = (await createResponse.json().catch(() => ({}))) as { detail?: string };
      throw new Error(createBody.detail ?? `Failed to create ${row.studentId}`);
    }

    const updateBody = (await detailResponse.json().catch(() => ({}))) as { detail?: string };
    throw new Error(updateBody.detail ?? `Failed to sync ${row.studentId}`);
  }

  async function saveSpreadsheet() {
    setIsSaving(true);

    try {
      const validRows = rows.filter((row) => row.studentId.trim());
      for (const row of validRows) {
        await syncRow(row);
      }

      setStatusMessage(`Saved ${validRows.length} rows to the backend.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to save spreadsheet.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoginBootstrap() {
    const studentId = loginState.studentId.trim();
    const password = loginState.password.trim();
    const studentName = loginState.studentName.trim();

    if (!studentId || !password) {
      setStatusMessage("Student ID and password are required to bootstrap an account.");
      return;
    }

    const response = await fetch("/api/student-records/auth/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ student_id: studentId, password, student_name: studentName }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      detail?: string;
      record?: ApiRecord;
      bootstrapped?: boolean;
    };

    if (!response.ok || !body.record) {
      setStatusMessage(body.detail ?? "Unable to authenticate the student ID.");
      return;
    }

    const authenticatedRow: SpreadsheetRow = {
      studentId: body.record.student_id,
      studentName: body.record.student_name,
      password: "",
      recordData: columns.reduce<Record<string, string>>((accumulator, column) => {
        accumulator[column] = asText(body.record?.record_data?.[column]);
        return accumulator;
      }, {}),
    };

    setRows((currentRows) => {
      const existingIndex = currentRows.findIndex((row) => row.studentId === authenticatedRow.studentId);
      if (existingIndex === -1) {
        return [...currentRows, authenticatedRow];
      }

      return currentRows.map((row, index) => (index === existingIndex ? authenticatedRow : row));
    });

    setSelectedStudentId(authenticatedRow.studentId);
    setStatusMessage(body.bootstrapped ? `Created a password for ${authenticatedRow.studentId}.` : `Authenticated ${authenticatedRow.studentId} successfully.`);
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
          <article className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">ClassRecord</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Spreadsheet-style admin record editor.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Admins can freely type into cells, add new assessment columns, and paste an Excel range straight into the sheet.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <button type="button" onClick={addRow} className="rounded-full bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800">
                  Add row
                </button>
                <button type="button" onClick={addColumn} className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
                  Add column
                </button>
                <button type="button" onClick={saveSpreadsheet} disabled={isSaving} className="rounded-full bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? "Saving..." : "Save to backend"}
                </button>
              </div>
            </div>

            <div ref={tableScrollRef} className="overflow-x-auto pb-2">
              <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 text-slate-600 backdrop-blur">
                  <tr>
                    <th className="sticky left-0 z-20 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 font-medium">Student ID</th>
                    <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-medium">Name</th>
                    <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-medium">Password</th>
                    {columns.map((column) => (
                      <th key={column} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-medium">
                        {column}
                      </th>
                    ))}
                    <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const isActive = row.studentId !== "" && row.studentId === selectedStudentId;

                    return (
                      <tr
                        key={`${row.studentId || "blank"}-${rowIndex}`}
                        className={isActive ? "bg-sky-50/60" : "bg-white"}
                        onClick={() => row.studentId && setSelectedStudentId(row.studentId)}
                      >
                        <td className="sticky left-0 z-10 whitespace-nowrap border-b border-slate-100 bg-inherit px-3 py-2 align-top">
                          <input
                            value={row.studentId}
                            onChange={(event) => updateRow(rowIndex, "studentId", event.target.value)}
                            className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            placeholder="2024-001"
                          />
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 align-top">
                          <input
                            value={row.studentName}
                            onChange={(event) => updateRow(rowIndex, "studentName", event.target.value)}
                            className="min-w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            placeholder="Student name"
                          />
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 align-top">
                          <input
                            value={row.password}
                            onChange={(event) => updateRow(rowIndex, "password", event.target.value)}
                            className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            placeholder="Set or update"
                          />
                        </td>
                        {columns.map((column) => (
                          <td key={column} className="whitespace-nowrap border-b border-slate-100 px-3 py-2 align-top">
                            <input
                              value={row.recordData[column] ?? ""}
                              onChange={(event) => updateRecordData(rowIndex, column, event.target.value)}
                              className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              placeholder="-"
                            />
                          </td>
                        ))}
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 align-top">
                          <button type="button" onClick={() => removeRow(rowIndex)} className="rounded-full border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50">
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="flex flex-col gap-6">
            <section className="rounded-[28px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_18px_70px_rgba(15,23,42,0.18)]">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">Student access</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Bootstrap missing passwords here.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                If a student ID has no password yet, this form creates it. If the record already has a password, the form verifies it and opens the row.
              </p>

              <div className="mt-5 space-y-3">
                <input
                  value={loginState.studentId}
                  onChange={(event) => setLoginState((currentState) => ({ ...currentState, studentId: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                  placeholder="Student ID"
                />
                <input
                  value={loginState.studentName}
                  onChange={(event) => setLoginState((currentState) => ({ ...currentState, studentName: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                  placeholder="Student name"
                />
                <input
                  value={loginState.password}
                  onChange={(event) => setLoginState((currentState) => ({ ...currentState, password: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                  placeholder="Password"
                  type="password"
                />
                <button type="button" onClick={() => void handleLoginBootstrap()} className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
                  Login or create password
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.1)] backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Excel paste</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Paste directly from Excel.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Copy a range from Excel and paste the tab-separated text below. The first three columns are treated as Student ID, Name, and Password.
              </p>

              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                className="mt-4 min-h-40 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder={`2024-001\tAna Cruz\t1234\t95\t98\tA\t100\tPassed`}
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={importPaste} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                  Import paste
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportText("");
                    setRows([createBlankRow(columns)]);
                    setSelectedStudentId("");
                    setStatusMessage("Spreadsheet cleared.");
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Reset sheet
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-dashed border-sky-200 bg-sky-50/70 p-6 text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Status</p>
              <p className="mt-3 text-sm leading-6">{statusMessage}</p>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Active row: {activeRowIndex >= 0 ? activeRowIndex + 1 : "none"} {isLoading ? "· loading records" : ""}
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
