import { useController } from 'react-hook-form';
import { AppSelect, AppSelectProps } from '@/components/ui/AppSelect';

export interface FormSelectProps extends Omit<AppSelectProps, 'value' | 'onSelect'> {
  name: string;
}

/** Selector conectado a react-hook-form. */
export function FormSelect({ name, ...props }: FormSelectProps) {
  const { field, fieldState } = useController({ name });

  return (
    <AppSelect
      {...props}
      value={field.value == null ? null : String(field.value)}
      onSelect={(value) => field.onChange(value)}
      error={fieldState.error?.message}
    />
  );
}