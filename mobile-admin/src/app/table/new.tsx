import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { TableForm } from '@/components/forms/TableForm';
import { useI18n } from '@/i18n/I18nProvider';

export default function NewTableScreen() {
  const { t } = useI18n();
  return (
    <AppScreen>
      <AppHeader title={t('table.new')} showBack />
      <TableForm />
    </AppScreen>
  );
}