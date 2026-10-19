import { apiFetch } from '@/lib/api';
import type { ClientWithSubscriptions } from '@/lib/types';
import type { SubscriptionStatus } from '@/lib/status';

export type DashboardUpcomingItem = {
  client: ClientWithSubscriptions;
  subId: string;
  numero_abonne: string | null;
  numero_carte: string | null;
  date_fin: string | null;
  status: SubscriptionStatus;
};

export type DashboardData = {
  revenuToday: number;
  clientsToday: number;
  reabonnementsToday: number;
  solde: number;
  upcoming: DashboardUpcomingItem[];
};

export async function getDashboardData(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/dashboard');
}