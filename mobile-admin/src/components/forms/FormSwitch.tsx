import { useController } from 'react-hook-form';
import { AppSwitch, AppSwitchProps } from '@/components/ui/AppSwitch';

export interface FormSwitchProps extends Omit<AppSwitchProps, 'value' | 'onValueChange'> {
  name: string;
}

/** Interruptor conectado a react-hook-form. */
export function FormSwitch({ name, ...props }: FormSwitchProps) {
  const { field } = useController({ name });
  return <AppSwitch {...props} value={!!field.value} onValueChange={field.onChange} />;
}