// Form model types for the complex form editor demo

export interface Address {
  id?: string; // local-temp id for repeatable lists
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isPrimary?: boolean;
}

export interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: "owner" | "manager" | "employee" | string;
  addresses: Address[];
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
  status?: "pending" | "uploaded" | "failed";
}

export interface ComplexFormModel {
  id?: string;
  title: string;
  description?: string;
  status: "draft" | "submitted" | "archived";
  effectiveDate?: string;
  budget?: number;
  tags: string[];
  contacts: Contact[];
  primaryContactId?: string;
  settings: {
    enableNotifications: boolean;
    notificationEmail?: string;
    visibility: "private" | "team" | "public";
  };
  attachments: Attachment[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Form configuration for toggling optional fields
export interface FormConfig {
  enableDescription: boolean;
  enableEffectiveDate: boolean;
  enableBudget: boolean;
  enableMetadata: boolean;
}

// Default form values
export const defaultFormModel: ComplexFormModel = {
  title: "",
  status: "draft",
  tags: [],
  contacts: [],
  settings: {
    enableNotifications: false,
    notificationEmail: "",
    visibility: "private",
  },
  attachments: [],
};

export const defaultFormConfig: FormConfig = {
  enableDescription: false,
  enableEffectiveDate: false,
  enableBudget: false,
  enableMetadata: false,
};
