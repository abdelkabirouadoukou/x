import { useCallback, useRef, useState } from "react";

export type FormValidator<TValues> = (values: TValues) => Record<string, string> | null;

export interface FormState<TValues> {
  values: TValues;
  errors: Record<string, string>;
  isDirty: boolean;
}

/**
 * Small, dependency-light form state + validation hook. Accepts any validator
 * of shape `(values) => Record<string,string> | null` so it works with zod,
 * valibot, or hand-written validators (no schema-library coupling).
 * SSR-safe — pure state, no window access.
 */
export function useForm<TValues extends Record<string, unknown>>(
  initialValues: TValues,
  validate: FormValidator<TValues>,
) {
  const [state, setState] = useState<FormState<TValues>>({
    values: initialValues,
    errors: {},
    isDirty: false,
  });
  const validateRef = useRef(validate);
  validateRef.current = validate;

  const setValue = useCallback(<K extends keyof TValues>(key: K, value: TValues[K]) => {
    setState((prev) => {
      const values = { ...prev.values, [key]: value };
      const errors = validateRef.current(values) ?? {};
      return { values, errors, isDirty: true };
    });
  }, []);

  const setValues = useCallback((values: TValues) => {
    setState((prev) => {
      const merged = { ...prev.values, ...values };
      const errors = validateRef.current(merged) ?? {};
      return { values: merged, errors, isDirty: true };
    });
  }, []);

  const handleSubmit = useCallback(
    (onValid: (values: TValues) => void) => (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.();
      const errors = validateRef.current(state.values) ?? {};
      if (Object.keys(errors).length > 0) {
        setState((prev) => ({ ...prev, errors }));
        return false;
      }
      onValid(state.values);
      return true;
    },
    [state.values],
  );

  const reset = useCallback(() => {
    setState({ values: initialValues, errors: {}, isDirty: false });
  }, [initialValues]);

  return {
    values: state.values,
    errors: state.errors,
    isDirty: state.isDirty,
    setValue,
    setValues,
    handleSubmit,
    reset,
  };
}
