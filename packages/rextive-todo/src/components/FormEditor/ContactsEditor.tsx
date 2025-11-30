/**
 * Contacts editor - repeatable nested group using focus operator
 */
import { rx, useScope } from "rextive/react";
import { focus } from "rextive/op";
import { useFormContext } from "../../store/formStore";
import type { Contact, Address } from "../../types/form";

// Generate unique ID for new items
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function ContactsEditor() {
  const { formData } = useFormContext();

  const scope = useScope(() => {
    const contacts = formData.pipe(focus("contacts"));
    return {
      contacts,
      addContact() {
        const newContact: Contact = {
          id: generateId(),
          firstName: "",
          lastName: "",
          email: "",
          addresses: [],
        };
        contacts.set((prev) => [...prev, newContact]);
      },
      removeContact: (index: number) =>
        contacts.set((prev) => prev.filter((_, i) => i !== index)),
    };
  });

  return (
    <div className="contacts-editor">
      {rx(() =>
        scope
          .contacts()
          .map((contact: Contact, index: number) => (
            <ContactItem
              key={contact.id || index}
              index={index}
              onRemove={() => scope.removeContact(index)}
            />
          ))
      )}

      <button
        type="button"
        onClick={() => scope.addContact()}
        className="btn-add-contact"
      >
        + Add Contact
      </button>

      {rx(() =>
        scope.contacts().length === 0 ? (
          <p className="contacts-empty">No contacts added yet</p>
        ) : null
      )}
    </div>
  );
}

interface ContactItemProps {
  index: number;
  onRemove: () => void;
}

function ContactItem({ index, onRemove }: ContactItemProps) {
  const { formData } = useFormContext();

  // Use watch to recreate scope when index changes (e.g., after removal of another item)
  const scope = useScope(() => {
    const firstName = formData.pipe(focus(`contacts.${index}.firstName`));
    const lastName = formData.pipe(focus(`contacts.${index}.lastName`));
    const email = formData.pipe(focus(`contacts.${index}.email`));
    const phone = formData.pipe(focus(`contacts.${index}.phone`, () => ""));
    const role = formData.pipe(focus(`contacts.${index}.role`, () => ""));
    const addresses = formData.pipe(focus(`contacts.${index}.addresses`));

    return {
      firstName,
      lastName,
      email,
      phone,
      role,
      addresses,
      addAddress() {
        const newAddress: Address = {
          id: generateId(),
          street: "",
          city: "",
          country: "",
        };
        addresses.set((prev) => [...prev, newAddress]);
      },
      removeAddress: (addrIndex: number) =>
        addresses.set((prev) => prev.filter((_, i) => i !== addrIndex)),
    };
  });

  return (
    <div className="contact-item">
      <div className="contact-header">
        <span className="contact-number">Contact #{index + 1}</span>
        <button type="button" onClick={onRemove} className="btn-remove">
          🗑️ Remove
        </button>
      </div>

      <div className="contact-fields">
        <div className="form-row">
          <div className="form-field">
            <label>First Name *</label>
            {rx(() => (
              <input
                type="text"
                value={scope.firstName()}
                onChange={(e) => scope.firstName.set(e.target.value)}
                placeholder="First name"
              />
            ))}
          </div>
          <div className="form-field">
            <label>Last Name *</label>
            {rx(() => (
              <input
                type="text"
                value={scope.lastName()}
                onChange={(e) => scope.lastName.set(e.target.value)}
                placeholder="Last name"
              />
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Email *</label>
            {rx(() => (
              <input
                type="email"
                value={scope.email()}
                onChange={(e) => scope.email.set(e.target.value)}
                placeholder="email@example.com"
              />
            ))}
          </div>
          <div className="form-field">
            <label>Phone</label>
            {rx(() => (
              <input
                type="tel"
                value={scope.phone()}
                onChange={(e) => scope.phone.set(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Role</label>
          {rx(() => (
            <select
              value={scope.role()}
              onChange={(e) => scope.role.set(e.target.value)}
            >
              <option value="">Select role...</option>
              <option value="owner">👑 Owner</option>
              <option value="manager">📊 Manager</option>
              <option value="employee">👤 Employee</option>
            </select>
          ))}
        </div>

        {/* Addresses sub-list */}
        <div className="addresses-section">
          <h5>Addresses</h5>
          {rx(() =>
            (scope.addresses() as Address[]).map((addr, addrIndex) => (
              <AddressItem
                key={addr.id || addrIndex}
                contactIndex={index}
                addressIndex={addrIndex}
                onRemove={() => scope.removeAddress(addrIndex)}
              />
            ))
          )}
          <button
            type="button"
            onClick={() => scope.addAddress()}
            className="btn-add-small"
          >
            + Add Address
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddressItemProps {
  contactIndex: number;
  addressIndex: number;
  onRemove: () => void;
}

function AddressItem({
  contactIndex,
  addressIndex,
  onRemove,
}: AddressItemProps) {
  const { formData } = useFormContext();

  const basePath = `contacts.${contactIndex}.addresses.${addressIndex}`;

  // Use watch to recreate scope when indices change
  const scope = useScope(() => ({
    street: formData.pipe(focus(`${basePath}.street` as any)),
    city: formData.pipe(focus(`${basePath}.city` as any)),
    state: formData.pipe(focus(`${basePath}.state` as any, () => "")),
    postalCode: formData.pipe(focus(`${basePath}.postalCode` as any, () => "")),
    country: formData.pipe(focus(`${basePath}.country` as any)),
    isPrimary: formData.pipe(
      focus(`${basePath}.isPrimary` as any, () => false)
    ),
  }));

  return (
    <div className="address-item">
      <div className="address-header">
        {rx(() => (
          <label className="address-primary">
            <input
              type="checkbox"
              checked={scope.isPrimary()}
              onChange={(e) => scope.isPrimary.set(e.target.checked)}
            />
            Primary
          </label>
        ))}
        <button type="button" onClick={onRemove} className="btn-remove-small">
          ×
        </button>
      </div>

      <div className="form-field">
        {rx(() => (
          <input
            type="text"
            value={scope.street()}
            onChange={(e) => scope.street.set(e.target.value)}
            placeholder="Street address"
          />
        ))}
      </div>

      <div className="form-row">
        <div className="form-field">
          {rx(() => (
            <input
              type="text"
              value={scope.city()}
              onChange={(e) => scope.city.set(e.target.value)}
              placeholder="City"
            />
          ))}
        </div>
        <div className="form-field">
          {rx(() => (
            <input
              type="text"
              value={scope.state()}
              onChange={(e) => scope.state.set(e.target.value)}
              placeholder="State"
            />
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          {rx(() => (
            <input
              type="text"
              value={scope.postalCode()}
              onChange={(e) => scope.postalCode.set(e.target.value)}
              placeholder="Postal code"
            />
          ))}
        </div>
        <div className="form-field">
          {rx(() => (
            <input
              type="text"
              value={scope.country()}
              onChange={(e) => scope.country.set(e.target.value)}
              placeholder="Country"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
