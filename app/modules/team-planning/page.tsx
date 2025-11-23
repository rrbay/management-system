import { redirect } from 'next/navigation';

export default function LegacyTeamPlanningRedirect() {
  redirect('/modules/crew-planning');
}
