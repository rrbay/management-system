import { redirect } from 'next/navigation';

export default function LegacyTeamPlanningAdminRedirect() {
  redirect('/modules/crew-planning/admin');
}
