/**
 * Utilitaires d'export : CSV, Excel (HTML table), PDF (print).
 * Aucune dépendance externe — CSV généré manuellement, Excel via une
 * table HTML avec extension .xls, PDF via window.print() sur une
 * fenêtre dédiée.
 */

export type Column<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCSV<T>(
  filename: string,
  columns: Column<T>[],
  rows: T[]
): void {
  const header = columns.map((c) => escapeCSV(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCSV(c.accessor(row))).join(','))
    .join('\n');
  // BOM pour qu'Excel reconnaisse l'UTF-8
  const csv = '\uFEFF' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename + '.csv');
}

export function exportExcel<T>(
  filename: string,
  title: string,
  columns: Column<T>[],
  rows: T[]
): void {
  const headerCells = columns
    .map((c) => `<th style="background:#1e293b;color:white;padding:8px;text-align:left;font-family:Arial;font-size:12px;">${escapeHtml(c.header)}</th>`)
    .join('');
  const bodyRows = rows
    .map(
      (row) =>
        '<tr>' +
        columns
          .map(
            (c) =>
              `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-family:Arial;font-size:12px;">${escapeHtml(c.accessor(row) ?? '')}</td>`
          )
          .join('') +
        '</tr>'
    )
    .join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><title>${escapeHtml(title)}</title></head>
<body>
<h2 style="font-family:Arial;font-size:16px;margin-bottom:12px;">${escapeHtml(title)}</h2>
<table style="border-collapse:collapse;width:100%;">
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, filename + '.xls');
}

export function exportPDF<T>(
  title: string,
  columns: Column<T>[],
  rows: T[]
): void {
  const headerCells = columns
    .map(
      (c) =>
        `<th style="background:#1e293b;color:white;padding:8px 10px;text-align:left;font-size:12px;border:1px solid #334155;">${escapeHtml(c.header)}</th>`
    )
    .join('');
  const bodyRows = rows
    .map(
      (row) =>
        '<tr>' +
        columns
          .map(
            (c) =>
              `<td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;">${escapeHtml(c.accessor(row) ?? '')}</td>`
          )
          .join('') +
        '</tr>'
    )
    .join('');

  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  @media print { @page { margin: 1.5cm; } }
  body { font-family: Arial, sans-serif; margin: 20px; }
  h2 { font-size: 16px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #cbd5e1; }
  th { background: #1e293b; color: white; }
  tr:nth-child(even) td { background: #f8fafc; }
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .date { font-size: 11px; color: #64748b; }
</style></head>
<body>
<div class="header">
  <h2>${escapeHtml(title)}</h2>
  <span class="date">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</span>
</div>
<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
<script>window.onload = function() { window.print(); }; </script>
</body></html>`);
  win.document.close();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
