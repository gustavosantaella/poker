import { useController } from 'react-hook-form';
import { AppTextField, AppTextFieldProps } from '@/components/ui/AppTextField';

export interface FormTextFieldProps extends Omit<AppTextFieldProps, 'value' | 'onChangeText' | 'onBlur'> {
  name: string;
}

/** Campo de texto conectado a react-hook-form. */
export function FormTextField({ name, ...props }: FormTextFieldProps) {
  const { field, fieldState } = useController({ name });

  return (
    <AppTextField
      {...props}
      value={field.value == null ? '' : String(field.value)}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}