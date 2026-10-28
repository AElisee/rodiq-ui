"use client";

import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api/client";
import { toDateKey } from "@/lib/reservations";
import { adminButtonClassName, PendingLabel } from "./admin-ui";

// Tableau à exporter : en-têtes et lignes en texte brut (toutes les lignes filtrées, pas seulement la page)
export type ExportTable = {
  title: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
};

// Séparateur « ; » et BOM UTF-8 : le fichier s'ouvre directement dans Excel en français
const toCsv = ({ headers, rows }: ExportTable) =>
  "﻿" +
  [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\r\n");

const downloadCsv = (table: ExportTable) => {
  const url = URL.createObjectURL(new Blob([toCsv(table)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${table.filename}-${toDateKey(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const escapeHtml = (value: string | number) =>
  String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Impression dans un cadre caché : seul le document est imprimé, sans la navigation de l'admin.
// Attend le chargement des images avant d'ouvrir la fenêtre d'impression.
export const printDocument = async (title: string, body: string, css = "") => {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0";
  document.body.append(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body{font-family:system-ui,sans-serif;color:#000;margin:24px}
  h1{font-size:18px;margin:0 0 4px}
  p{font-size:12px;color:#555;margin:0 0 16px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border-bottom:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
  th{border-bottom:2px solid #000}
  tr{break-inside:avoid}
  ${css}
</style></head><body>${body}</body></html>`);
  doc.close();
  await Promise.all(
    Array.from(doc.images, (img) =>
      img.complete
        ? null
        : new Promise((resolve) => {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
          }),
    ),
  );
  const win = frame.contentWindow!;
  win.addEventListener("afterprint", () => frame.remove());
  win.focus();
  win.print();
};

const printTable = ({ title, headers, rows }: ExportTable) =>
  printDocument(
    title,
    `<h1>${escapeHtml(title)}</h1>
<p>${rows.length} ligne${rows.length > 1 ? "s" : ""} · ${new Date().toLocaleDateString("fr-FR")}</p>
<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
  );

type AdminExportButtonsProps =
  // Tableau déjà en mémoire
  | { table: ExportTable }
  // Tableau lu au clic (liste filtrée et paginée par l'API) : `count` lignes attendues
  | { count: number; load: () => Promise<ExportTable> };

// Boutons « Imprimer » et « Exporter CSV » d'un tableau
export const AdminExportButtons = (props: AdminExportButtonsProps) => {
  // Export en cours de préparation (l'API lit toutes les lignes)
  const [loading, setLoading] = useState<"print" | "csv" | null>(null);
  const empty = ("table" in props ? props.table.rows.length : props.count) === 0;

  const run = async (kind: "print" | "csv", action: (table: ExportTable) => unknown) => {
    if ("table" in props) return action(props.table);
    setLoading(kind);
    try {
      await action(await props.load());
    } catch (error) {
      toast.error("L'export n'a pas été préparé", { description: errorMessage(error) });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void run("print", printTable)}
        disabled={empty || !!loading}
        className={adminButtonClassName}
      >
        <Printer className="size-4" strokeWidth={1.75} aria-hidden />
        <PendingLabel pending={loading === "print"} pendingLabel="Préparation…">Imprimer</PendingLabel>
      </button>
      <button
        type="button"
        onClick={() => void run("csv", downloadCsv)}
        disabled={empty || !!loading}
        className={adminButtonClassName}
      >
        <Download className="size-4" strokeWidth={1.75} aria-hidden />
        <PendingLabel pending={loading === "csv"} pendingLabel="Préparation…">Exporter CSV</PendingLabel>
      </button>
    </>
  );
};
