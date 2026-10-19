import { apiFetch } from '@/lib/api';
import type { Client, Formula, ClientWithSubscriptions, SubscriptionWithFormula } from '@/lib/types';

export type CreateClientData = {
  nom_complet: string;
  telephone: string;
};

export type SubscriptionData = {
  numero_abonne: string;
  numero_carte: string;
  vad: string;
  date_reabonnement: string;
  date_fin: string;
  formula_id: string;
};

export async function getClients(): Promise<ClientWithSubscriptions[]> {
  return apiFetch<ClientWithSubscriptions[]>('/clients');
}

export async function getActiveFormulas(): Promise<Formula[]> {
  return apiFetch<Formula[]>('/formulas/active');
}

export async function createClient(clientData: CreateClientData): Promise<Client> {
  return apiFetch<Client>('/clients', {
    method: 'POST',
    body: JSON.stringify(clientData),
  });
}

export async function createInitialSubscription(
  clientId: string,
  subscriptionData: SubscriptionData
): Promise<SubscriptionWithFormula> {
  return apiFetch<SubscriptionWithFormula>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ clientId, subscriptionData }),
  });
}

export async function updateClient(
  clientId: string,
  clientData: CreateClientData
): Promise<Client> {
  return apiFetch<Client>(`/clients/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify(clientData),
  });
}

export async function updateSubscription(
  subscriptionId: string,
  subscriptionData: SubscriptionData
): Promise<SubscriptionWithFormula> {
  return apiFetch<SubscriptionWithFormula>(`/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    body: JSON.stringify(subscriptionData),
  });
}

export async function createSubscriptionForClient(
  clientId: string,
  subscriptionData: SubscriptionData
): Promise<SubscriptionWithFormula> {
  return createInitialSubscription(clientId, subscriptionData);
}

export async function deleteClient(clientId: string): Promise<void> {
  await apiFetch(`/clients/${clientId}`, {
    method: 'DELETE',
  });
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await apiFetch(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
}

export async function registerClient(
  clientData: CreateClientData,
  subscriptionData: SubscriptionData,
  formulas: Formula[]
) {
  return apiFetch<{ client: Client; subscription: SubscriptionWithFormula; formula: Formula }>(
    '/clients/register',
    {
      method: 'POST',
      body: JSON.stringify({ clientData, subscriptionData }),
    }
  );
}

export async function getClientDetail(clientId: string): Promise<ClientWithSubscriptions> {
  return apiFetch<ClientWithSubscriptions>(`/clients/${clientId}`);
}