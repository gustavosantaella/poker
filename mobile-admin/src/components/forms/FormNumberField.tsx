import { useController } from 'react-hook-form';
import { AppTextField, AppTextFieldProps } from '@/components/ui/AppTextField';

export interface FormNumberFieldProps
  extends Omit<AppTextFieldProps, 'value' | 'onChangeText' | 'keyboardType'> {
  name: string;
}

/** Campo numerico conectado a react-hook-form (zod coerce convierte a number). */
export function FormNumberField({ name, ...props }: FormNumberFieldProps) {
  const { field, fieldState } = useController({ name });

  return (
    <AppTextField
      {...props}
      keyboardType="decimal-pad"
      value={field.value == null || field.value === '' ? '' : String(field.value)}
      onChangeText={(text) => {
        const cleaned = text.replace(',', '.');
        field.onChange(cleaned);
      }}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}