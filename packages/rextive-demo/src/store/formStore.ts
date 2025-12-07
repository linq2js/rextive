/**
 * Form store using rextive signals and provider pattern
 */
import { signal } from "rextive";
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
  updateId: (newId?: string) => void;
}

export const [useFormContext, FormContextProvider] = provider({
  name: "FormContext",
  create: (initialValue: {
    formData?: ComplexFormModel;
    formConfig?: FormConfig;
    id?: string;
  }): FormContextValue => {
    let id = initialValue.id;
    const formData = signal(initialValue.formData ?? defaultFormModel, {
      name: "formData",
    });
    const formConfig = signal(initialValue.formConfig ?? defaultFormConfig, {
      name: "formConfig",
    });

    return {
      formData,
      formConfig,
      updateId(newId?: string) {
        if (newId !== id) {
          id = newId;
          formData.set(defaultFormModel);
          formConfig.set(defaultFormConfig);
        }
      },
    };
  },
  update: (context, value) => {
    context.updateId(value.id);
  },
});
