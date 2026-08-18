import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export default function PagePlaceholder({ icon: Icon, title, description }: Props) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">{title}</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
          <Icon className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
        <p className="text-sm text-slate-400 max-w-md mx-auto">{description}</p>
      </div>
    </div>
  );
}
