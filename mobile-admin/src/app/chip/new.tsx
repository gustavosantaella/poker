import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ChipForm } from '@/components/forms/ChipForm';

export default function NewChipScreen() {
  return (
    <AppScreen>
      <AppHeader title="New chip" showBack />
      <ChipForm />
    </AppScreen>
  );
}