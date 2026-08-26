import {
  supabase,
  type ClientWithSubscriptions,
} from '@/lib/supabase';

import {
  getStatus,
  type SubscriptionStatus,
} from '@/lib/status';

import { getMvolaBalance } from '@/lib/mvola';
import { todayLocal } from '@/lib/date';

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
  const todayStr = todayLocal();

  const [
    reabTodayResult,
    solde,
    clientsResult,
  ] = await Promise.all([
    supabase
      .from('reabonnements')
      .select(
        'id, montant, date_reabonnement'
      )
      .eq(
        'date_reabonnement',
        todayStr
      ),

    getMvolaBalance(),

    supabase
      .from('clients')
      .select(
        '*, subscriptions(*, formula:formulas(*))'
      )
      .order(
        'nom_complet',
        { ascending: true }
      ),
  ]);

  if (reabTodayResult.error) {
    throw reabTodayResult.error;
  }

  if (clientsResult.error) {
    throw clientsResult.error;
  }

  const reabonnements =
    reabTodayResult.data ?? [];

  const revenuToday =
    reabonnements.reduce(
      (sum, reabonnement) =>
        sum +
        Number(
          reabonnement.montant || 0
        ),
      0
    );

  const clientsToday =
    reabonnements.length;

  const reabonnementsToday =
    reabonnements.length;

  const clients =
    (clientsResult.data ??
      []) as ClientWithSubscriptions[];

  const today = new Date(
    `${todayStr}T00:00:00`
  );

  const upcoming: DashboardUpcomingItem[] =
    [];

  clients.forEach((client) => {
    (client.subscriptions ?? []).forEach(
      (subscription) => {
        if (!subscription.date_fin) {
          return;
        }

        const dateFin = new Date(
          `${subscription.date_fin}T00:00:00`
        );

        const diffDays = Math.round(
          (dateFin.getTime() -
            today.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        /*
         * On conserve :
         *
         * < 0  : expiré
         * = 0  : expire aujourd'hui
         * = 1  : expire demain
         * 2-7  : expire dans les 7 prochains jours
         *
         * Au-delà de 7 jours :
         * non affiché dans le dashboard.
         */

        if (
          diffDays < 0 ||
          diffDays <= 7
        ) {
          upcoming.push({
            client,
            subId: subscription.id,
            numero_abonne:
              subscription.numero_abonne,
            numero_carte:
              subscription.numero_carte,
            date_fin:
              subscription.date_fin,
            status: getStatus(
              subscription.date_fin
            ),
          });
        }
      }
    );
  });

  upcoming.sort((a, b) => {
    const dateA =
      a.date_fin ?? '9999-12-31';

    const dateB =
      b.date_fin ?? '9999-12-31';

    return dateA.localeCompare(dateB);
  });

  return {
    revenuToday,
    clientsToday,
    reabonnementsToday,
    solde,
    upcoming,
  };
}