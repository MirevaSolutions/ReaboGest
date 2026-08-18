export type SubscriptionStatus = 'actif' | "expire_aujourd_hui" | 'expire_demain' | 'expire';

export function getStatus(dateFin: string | null | undefined): SubscriptionStatus {
  if (!dateFin) return 'expire';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(dateFin);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expire';
  if (diffDays === 0) return 'expire_aujourd_hui';
  if (diffDays === 1) return 'expire_demain';
  return 'actif';
}

export const statusLabels: Record<SubscriptionStatus, string> = {
  actif: 'Actif',
  expire_aujourd_hui: "Expire aujourd'hui",
  expire_demain: 'Expire demain',
  expire: 'Expiré',
};

export const statusClasses: Record<SubscriptionStatus, string> = {
  actif: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  expire_aujourd_hui: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  expire_demain: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  expire: 'bg-red-50 text-red-700 ring-red-600/20',
};

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(price) + ' Ar';
}
