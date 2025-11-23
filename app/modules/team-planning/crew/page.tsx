import { redirect } from 'next/navigation';

export default function LegacyTeamPlanningCrewRedirect() {
  redirect('/modules/crew-planning/crew');
}
