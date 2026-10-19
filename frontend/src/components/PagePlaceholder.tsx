import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export default function PagePlaceholder({
  icon: Icon,
  title,
  description,
}: Props) {
  return (
    <div>
      {/* Header */}
      <h1 className="mb-6 text-xl font-semibold text-slate-900">
        {title}
      </h1>

      {/* Placeholder */}
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center sm:p-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>

        <p className="mb-1 text-sm font-medium text-slate-700">
          {title}
        </p>

        <p className="mx-auto max-w-md text-sm leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}