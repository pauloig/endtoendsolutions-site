import { useId, useState, type SubmitEvent } from "react";

type Status = "idle" | "submitting" | "sent";

const fieldClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink " +
  "placeholder:text-muted/70 focus:border-accent focus:outline-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const labelClass = "block text-sm font-medium text-ink";

/**
 * Formulario de contacto (isla de React).
 *
 * [PLACEHOLDER: sólo UI. Falta conectar el envío real (endpoint, proveedor de
 * correo o Serverless Function); por ahora `handleSubmit` simula la respuesta.]
 */
export default function ContactForm() {
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const statusId = useId();

  const [status, setStatus] = useState<Status>("idle");

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    // [PLACEHOLDER: enviar los datos a un endpoint real.]
    setStatus("submitting");

    // Simula la latencia de un envío para que el estado de la UI sea visible
    // durante el desarrollo. Quitar cuando exista el backend.
    window.setTimeout(() => {
      setStatus("sent");
    }, 600);
  }

  const isDisabled = status !== "idle";

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5"
      aria-describedby={statusId}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className={labelClass}>
            Name
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            autoComplete="name"
            required
            disabled={isDisabled}
            placeholder="Ada Lovelace"
            className={`mt-1.5 ${fieldClass}`}
          />
        </div>

        <div>
          <label htmlFor={emailId} className={labelClass}>
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isDisabled}
            placeholder="you@company.com"
            className={`mt-1.5 ${fieldClass}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor={messageId} className={labelClass}>
          Message
        </label>
        <textarea
          id={messageId}
          name="message"
          rows={5}
          required
          disabled={isDisabled}
          placeholder="What are you building, and where does it get stuck?"
          className={`mt-1.5 resize-y ${fieldClass}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sent" ? "Message ready" : "Send message"}
        </button>

        <p id={statusId} role="status" aria-live="polite" className="text-sm text-muted">
          {status === "sent"
            ? "[PLACEHOLDER: this form is not connected yet — your message was not sent.]"
            : "[PLACEHOLDER: form UI only, nothing is sent yet.]"}
        </p>
      </div>
    </form>
  );
}