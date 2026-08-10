import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BlindStructureItem } from '@/api/types';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type LevelItem = Extract<BlindStructureItem, { type: 'level' }>;
type BreakItem = Extract<BlindStructureItem, { type: 'break' }>;

interface BlindStructureEditorProps {
  items: BlindStructureItem[];
  onChange: (items: BlindStructureItem[]) => void;
  onGenerate: () => void;
  generating?: boolean;
}

const toInt = (value: string) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

/** Input numerico compacto para las celdas de la estructura. */
function CellInput({
  value,
  onChangeText,
  placeholder,
  style,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  style?: object;
}) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType="number-pad"
      style={[
        styles.input,
        { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
        style,
      ]}
    />
  );
}

/** Editor manual de la estructura de ciegas: ver, editar, agregar y eliminar niveles/descansos. */
export function BlindStructureEditor({
  items,
  onChange,
  onGenerate,
  generating = false,
}: BlindStructureEditorProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const lastLevel = [...items].reverse().find((i) => i.type === 'level') as LevelItem | undefined;
  const nextLevel = lastLevel ? lastLevel.level + 1 : 1;

  const updateLevel = (index: number, patch: Partial<Omit<LevelItem, 'type'>>) => {
    onChange(items.map((item, i) => (i === index && item.type === 'level' ? { ...item, ...patch } : item)));
  };

  const updateBreak = (index: number, patch: Partial<Omit<BreakItem, 'type'>>) => {
    onChange(items.map((item, i) => (i === index && item.type === 'break' ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addLevel = () => {
    const smallBlind = lastLevel ? lastLevel.bigBlind : 25;
    const bigBlind = lastLevel ? lastLevel.bigBlind * 2 : 50;
    const durationMin = lastLevel ? lastLevel.durationMin : 20;
    onChange([...items, { type: 'level', level: nextLevel, smallBlind, bigBlind, ante: 0, durationMin }]);
  };

  const addBreak = () => {
    const afterLevel = lastLevel ? lastLevel.level : 1;
    onChange([...items, { type: 'break', afterLevel, durationMin: 10 }]);
  };

  return (
    <View>
      <AppButton
        title={t('structure.generateNew')}
        icon="refresh"
        variant="ghost"
        onPress={onGenerate}
        loading={generating}
        style={styles.generateBtn}
      />

      {items.length === 0 ? (
        <AppText variant="caption" color={colors.textSecondary} style={styles.empty}>
          {t('structure.editorHint')}
        </AppText>
      ) : (
        <>
          <View style={[styles.colHeader, { borderBottomColor: colors.border }]}>
            <AppText variant="caption" color={colors.textMuted} style={styles.colLevel}>
              L
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.colSb}>
              SB
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.colBb}>
              BB
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.colAnte}>
              Ante
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.colMin}>
              Min
            </AppText>
            <View style={styles.colDel} />
          </View>

          {items.map((item, index) => {
            if (item.type === 'break') {
              return (
                <View key={`break-${index}`} style={[styles.row, { borderBottomColor: colors.border }]}>
                  <AppText variant="caption" weight="semibold" style={styles.colLevel}>
                    {t('tournament.breakShort')}
                  </AppText>
                  <CellInput
                    value={String(item.durationMin)}
                    onChangeText={(v) => updateBreak(index, { durationMin: toInt(v) })}
                    placeholder="Min"
                    style={styles.colMin}
                  />
                  <Pressable onPress={() => removeItem(index)} hitSlop={8} style={styles.delBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              );
            }
            return (
              <View key={`level-${item.level}-${index}`} style={[styles.row, { borderBottomColor: colors.border }]}>
                <AppText variant="body" weight="semibold" style={styles.colLevel}>
                  L{item.level}
                </AppText>
                <CellInput
                  value={String(item.smallBlind)}
                  onChangeText={(v) => updateLevel(index, { smallBlind: toInt(v) })}
                  style={styles.colSb}
                />
                <CellInput
                  value={String(item.bigBlind)}
                  onChangeText={(v) => updateLevel(index, { bigBlind: toInt(v) })}
                  style={styles.colBb}
                />
                <CellInput
                  value={String(item.ante)}
                  onChangeText={(v) => updateLevel(index, { ante: toInt(v) })}
                  style={styles.colAnte}
                />
                <CellInput
                  value={String(item.durationMin)}
                  onChangeText={(v) => updateLevel(index, { durationMin: toInt(v) })}
                  style={styles.colMin}
                />
                <Pressable onPress={() => removeItem(index)} hitSlop={8} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            );
          })}
        </>
      )}

      <View style={styles.addRow}>
        <AppButton
          title={t('structure.addLevel')}
          icon="add"
          size="sm"
          variant="secondary"
          style={styles.addBtn}
          onPress={addLevel}
        />
        <AppButton
          title={t('structure.addBreak')}
          icon="add"
          size="sm"
          variant="ghost"
          style={styles.addBtn}
          onPress={addBreak}
        />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  generateBtn: { marginBottom: spacing.sm, alignSelf: 'flex-start' },
  empty: { marginVertical: spacing.sm },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  colLevel: { width: 30, marginRight: 2, fontSize: typography.size.sm },
  colSb: { width: 48 },
  colBb: { width: 48 },
  colAnte: { width: 48 },
  colMin: { width: 42 },
  colDel: { width: 24 },
  delBtn: { width: 24, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: typography.size.sm,
    textAlign: 'center',
  },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  addBtn: { flex: 1 },
});

