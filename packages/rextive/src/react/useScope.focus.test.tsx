/**
 * Test useScope with focus operator - simulating ContactsEditor pattern
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import React, { StrictMode } from "react";
import { signal, disposable } from "../index";
import { focus } from "../operators/focus";
import { useScope } from "./useScope";
import { rx } from "./rx";

// Mock form data structure similar to ContactsEditor
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface FormData {
  contacts: Contact[];
}

describe("useScope with focus operator", () => {
  let formData: ReturnType<typeof signal<FormData>>;
  let signalCreateCount: number;
  let signalDisposeCount: number;

  beforeEach(() => {
    signalCreateCount = 0;
    signalDisposeCount = 0;

    formData = signal<FormData>(
      { contacts: [] },
      { name: "formData", equals: "shallow" }
    );
  });

  afterEach(() => {
    cleanup();
    formData.dispose();
  });

  describe("factory mode with focus", () => {
    it("should create signals once in StrictMode", async () => {
      const initCalls: string[] = [];
      const disposeCalls: string[] = [];

      function ContactsEditor() {
        const scope = useScope(
          () => {
            initCalls.push("contacts");
            const contacts = formData.pipe(focus("contacts"));
            return disposable({ contacts });
          },
          {
            dispose: () => {
              disposeCalls.push("contacts");
            },
          }
        );

        return (
          <div data-testid="contacts">
            {rx(() => `Count: ${scope.contacts().length}`)}
          </div>
        );
      }

      const { unmount } = render(
        <StrictMode>
          <ContactsEditor />
        </StrictMode>
      );

      // Wait for StrictMode double-mount cycle to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("contacts").textContent).toBe("Count: 0");

      // In React 18 StrictMode with commit pattern:
      // - useMemo runs twice (double-invoke is unavoidable)
      // - Each creates a scope and schedules auto-dispose via microtask
      // - First scope: uncommitted → disposed by microtask
      // - Second scope: committed before microtask → survives
      console.log("initCalls:", initCalls);
      console.log("disposeCalls:", disposeCalls);

      // With StrictMode + commit pattern:
      // - 2 init calls (useMemo runs twice, can't prevent)
      // - 1 dispose call (orphaned first scope disposed by microtask)
      expect(initCalls.length).toBe(2); // useMemo runs twice in StrictMode
      expect(disposeCalls.length).toBe(1); // Orphaned scope disposed

      // Unmount component
      unmount();

      // After unmount, committed scope should also be disposed
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(disposeCalls.length).toBe(2); // Both scopes disposed
    });

    it("should dispose signals when component unmounts", async () => {
      const disposeCalls: string[] = [];
      let contactsSignal: any = null;

      function ContactsEditor() {
        const scope = useScope(
          () => {
            const contacts = formData.pipe(focus("contacts"));
            contactsSignal = contacts;
            return disposable({ contacts });
          },
          {
            dispose: () => {
              disposeCalls.push("contacts");
            },
          }
        );

        return <div>{rx(() => `Count: ${scope.contacts().length}`)}</div>;
      }

      const { unmount } = render(
        <StrictMode>
          <ContactsEditor />
        </StrictMode>
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(contactsSignal).not.toBeNull();
      expect(contactsSignal.disposed()).toBe(false);

      // Unmount
      unmount();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Signal should be disposed after unmount
      // 2 dispose calls: 1 for orphaned scope (StrictMode), 1 for committed scope
      expect(disposeCalls.length).toBe(2);
      expect(contactsSignal.disposed()).toBe(true);
    });

    it("should recreate signals when watch deps change", async () => {
      const initCalls: number[] = [];
      const disposeCalls: number[] = [];

      function ContactItem({ index }: { index: number }) {
        const scope = useScope(
          () => {
            initCalls.push(index);
            const firstName = formData.pipe(
              focus(`contacts.${index}.firstName`)
            );
            return disposable({ firstName });
          },
          {
            watch: [index],
            dispose: () => {
              disposeCalls.push(index);
            },
          }
        );

        return (
          <div data-testid={`contact-${index}`}>
            {rx(() => scope.firstName() || "(empty)")}
          </div>
        );
      }

      // Add a contact first
      act(() => {
        formData.set({
          contacts: [{ id: "1", firstName: "John", lastName: "Doe" }],
        });
      });

      const { rerender } = render(
        <StrictMode>
          <ContactItem index={0} />
        </StrictMode>
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("contact-0").textContent).toBe("John");

      // Change index (simulates item reorder)
      act(() => {
        formData.set({
          contacts: [
            { id: "2", firstName: "Jane", lastName: "Smith" },
            { id: "1", firstName: "John", lastName: "Doe" },
          ],
        });
      });

      rerender(
        <StrictMode>
          <ContactItem index={1} />
        </StrictMode>
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      console.log("initCalls:", initCalls);
      console.log("disposeCalls:", disposeCalls);

      // After index change, old scope should be disposed and new one created
      expect(initCalls).toContain(0);
      expect(initCalls).toContain(1);
    });

    it("should dispose signals when item is removed from list", async () => {
      const disposeCalls: string[] = [];

      function ContactItem({
        index,
        id,
        onRemove,
      }: {
        index: number;
        id: string;
        onRemove: () => void;
      }) {
        const scope = useScope(
          () => {
            const firstName = formData.pipe(
              focus(`contacts.${index}.firstName`)
            );
            return disposable({ firstName });
          },
          {
            watch: [index, id],
            dispose: () => {
              disposeCalls.push(`contact-${id}`);
            },
          }
        );

        return (
          <div data-testid={`contact-${id}`}>
            {rx(() => scope.firstName() || "(empty)")}
            <button onClick={onRemove}>Remove</button>
          </div>
        );
      }

      function ContactList() {
        const contacts = formData().contacts;

        const removeContact = (index: number) => {
          formData.set((prev) => ({
            ...prev,
            contacts: prev.contacts.filter((_, i) => i !== index),
          }));
        };

        return (
          <div>
            {contacts.map((contact, index) => (
              <ContactItem
                key={contact.id}
                index={index}
                id={contact.id}
                onRemove={() => removeContact(index)}
              />
            ))}
          </div>
        );
      }

      // Add contacts
      act(() => {
        formData.set({
          contacts: [
            { id: "1", firstName: "John", lastName: "Doe" },
            { id: "2", firstName: "Jane", lastName: "Smith" },
          ],
        });
      });

      const { rerender } = render(
        <StrictMode>
          <ContactList />
        </StrictMode>
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(screen.getByTestId("contact-1")).toBeDefined();
      expect(screen.getByTestId("contact-2")).toBeDefined();

      // Remove first contact
      act(() => {
        formData.set({
          contacts: [{ id: "2", firstName: "Jane", lastName: "Smith" }],
        });
      });

      rerender(
        <StrictMode>
          <ContactList />
        </StrictMode>
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      console.log("disposeCalls after remove:", disposeCalls);

      // Contact 1 should be disposed
      expect(disposeCalls).toContain("contact-1");
    });
  });
});
