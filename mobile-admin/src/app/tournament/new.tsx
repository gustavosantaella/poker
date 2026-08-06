import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { TournamentForm } from '@/components/forms/TournamentForm';

export default function NewTournamentScreen() {
  return (
    <AppScreen>
      <AppHeader title="New tournament" showBack />
      <TournamentForm />
    </AppScreen>
  );
}