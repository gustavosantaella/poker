import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { ChipForm } from '@/components/forms/ChipForm';
import { useI18n } from '@/i18n/I18nProvider';

export default function NewChipScreen() {
  const { t } = useI18n();
  return (
    <AppScreen>
      <AppHeader title={t('chip.new')} showBack />
      <ChipForm />
    </AppScreen>
  );
}