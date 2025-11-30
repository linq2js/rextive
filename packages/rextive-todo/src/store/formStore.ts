/**
 * Form store using rextive signals and provider pattern
 */
import { signal, disposable } from "rextive";
import { provider } from "rextive/react";
import type { Mutable } from "rextive";
import {
  ComplexFormModel,
  FormConfig,
  defaultFormModel,
  defaultFormConfig,
} from "../types/form";

// Combined provider for both form data and config
export interface FormContextValue {
  formData: Mutable<ComplexFormModel>;
  formConfig: Mutable<FormConfig>;
}

export const [useFormContext, FormContextProvider] = provider<
  FormContextValue,
  { formData?: ComplexFormModel; formConfig?: FormConfig }
>({
  name: "FormContext",
  create: (initialValue) => {
    const formData = signal(initialValue.formData ?? defaultFormModel, {
      name: "formData",
    });
    const formConfig = signal(initialValue.formConfig ?? defaultFormConfig, {
      name: "formConfig",
    });

    return disposable({
      formData,
      formConfig,
    });
  },
});
