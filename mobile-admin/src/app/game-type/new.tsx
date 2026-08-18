import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { GameTypeForm } from '@/components/forms/GameTypeForm';
import { useI18n } from '@/i18n/I18nProvider';

export default function NewGameTypeScreen() {
  const { t } = useI18n();
  return (
    <AppScreen>
      <AppHeader title={t('gameType.new')} showBack />
      <GameTypeForm />
    </AppScreen>
  );
}