import { useController } from 'react-hook-form';
import { AppSegmentedControl, AppSegmentedControlProps } from '@/components/ui/AppSegmentedControl';

export interface FormSegmentedProps extends Omit<AppSegmentedControlProps, 'value' | 'onChange'> {
  name: string;
}

/** Control segmentado conectado a react-hook-form. */
export function FormSegmented({ name, ...props }: FormSegmentedProps) {
  const { field } = useController({ name });
  return (
    <AppSegmentedControl
      {...props}
      value={field.value == null ? '' : String(field.value)}
      onChange={(value) => field.onChange(value)}
    />
  );
}