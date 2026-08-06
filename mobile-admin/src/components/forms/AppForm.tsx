import { zodResolver } from '@hookform/resolvers/zod';
import { ReactNode } from 'react';
import {
  DefaultValues,
  FieldValues,
  FormProvider,
  Resolver,
  useForm,
  UseFormReturn,
} from 'react-hook-form';
import { z } from 'zod';

export interface AppFormProps<T extends FieldValues> {
  schema: z.ZodTypeAny;
  defaultValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  children: ReactNode | ((form: UseFormReturn<T>) => ReactNode);
  mode?: 'onBlur' | 'onChange' | 'onSubmit';
}

/**
 * Formulario reutilizable: conecta react-hook-form + zod.
 * Los hijos reciben las metodos del formulario (para el boton submit).
 */
export function AppForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  mode = 'onBlur',
}: AppFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema) as Resolver<T>,
    defaultValues: defaultValues as DefaultValues<T>,
    mode,
  });

  return (
    <FormProvider {...form}>
      {typeof children === 'function' ? children(form) : children}
    </FormProvider>
  );
}