import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { TableForm } from '@/components/forms/TableForm';

export default function NewTableScreen() {
  return (
    <AppScreen>
      <AppHeader title="New table" showBack />
      <TableForm />
    </AppScreen>
  );
}