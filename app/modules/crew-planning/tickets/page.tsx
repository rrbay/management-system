import { redirect } from 'next/navigation';

export default function TicketsLegacyRedirect() {
  // Eski yol /modules/crew-planning/tickets -> yeni ticketing sayfasına yönlendirme
  redirect('/modules/crew-planning/ticketing');
}
