import { getStatus, statusLabels, statusClasses, type SubscriptionStatus } from '@/lib/status';

type Props = {
  dateFin: string | null | undefined;
};

export default function StatusBadge({ dateFin }: Props) {
  const status: SubscriptionStatus = getStatus(dateFin);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
