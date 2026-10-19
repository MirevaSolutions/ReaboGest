import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import type { Column } from '@/lib/export';
import {
  exportCSV,
  exportExcel,
  exportPDF,
} from '@/lib/export';

type Props<T> = {
  filename: string;
  title: string;
  columns: Column<T>[];
  rows: T[];
  disabled?: boolean;
};

export default function ExportMenu<T>({
  filename,
  title,
  columns,
  rows,
  disabled,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const handleCSV = () => {
    exportCSV(filename, columns, rows);
    setOpen(false);
  };

  const handleExcel = () => {
    exportExcel(filename, title, columns, rows);
    setOpen(false);
  };

  const handlePDF = () => {
    exportPDF(title, columns, rows);
    setOpen(false);
  };

  const isDisabled =
    disabled || rows.length === 0;

  return (
    <div
      ref={ref}
      className="relative"
    >
      {/* Bouton Exporter */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={isDisabled}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download className="h-4 w-4 text-slate-400" />

        <span className="hidden sm:inline">
          Exporter
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu */}
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <ExportItem
            icon={FileText}
            label="CSV"
            onClick={handleCSV}
          />

          <ExportItem
            icon={FileSpreadsheet}
            label="Excel"
            onClick={handleExcel}
          />

          <ExportItem
            icon={Printer}
            label="PDF"
            onClick={handlePDF}
          />
        </div>
      )}
    </div>
  );
}

function ExportItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      <Icon className="h-4 w-4 text-slate-400" />

      <span>{label}</span>
    </button>
  );
}