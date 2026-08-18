import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { TournamentForm } from '@/components/forms/TournamentForm';
import { useI18n } from '@/i18n/I18nProvider';

export default function NewTournamentScreen() {
  const { t } = useI18n();
  return (
    <AppScreen>
      <AppHeader title={t('tournament.new')} showBack />
      <TournamentForm />
    </AppScreen>
  );
}