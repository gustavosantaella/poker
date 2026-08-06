import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { GameTypeForm } from '@/components/forms/GameTypeForm';

export default function NewGameTypeScreen() {
  return (
    <AppScreen>
      <AppHeader title="New game type" showBack />
      <GameTypeForm />
    </AppScreen>
  );
}