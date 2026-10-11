import { useId, useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "success" | "error";

type Messages = {
  name: string;
  email: string;
  message: string;
  send: string;
  sending: string;
  sent: string;
  error: string;
  required: string;
  invalidEmail: string;
  fallbackPrefix: string;
  fallbackSuffix: string;
};

const MESSAGES: Record<"en" | "es", Messages> = {
  en: {
    name: "Name",
    email: "Email",
    message: "Message",
    send: "Send message",
    sending: "Sending...",
    sent: "Message sent",
    error: "Something went wrong. Please try again or email us directly.",
    required: "This field is required",
    invalidEmail: "Please enter a valid email address",
    fallbackPrefix: "The contact form is not configured. Please email",
    fallbackSuffix: "directly.",
  },
  es: {
    email: "Correo electrónico",
    name: "Nombre",
    message: "Mensaje",
    send: "Enviar mensaje",
    sending: "Enviando...",
    sent: "Mensaje enviado",
    error:
      "Algo salió mal. Por favor, inténtalo de nuevo o envíanos un correo electrónico directamente.",
    required: "Este campo es obligatorio",
    invalidEmail: "Por favor, introduce un correo electrónico válido",
    fallbackPrefix: "El formulario de contacto no está configurado. Por favor, envía un correo electrónico a",
    fallbackSuffix: "directamente.",
  },
};

const fieldClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink " +
  "placeholder:text-muted/70 focus:border-accent focus:outline-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const labelClass = "block text-sm font-medium text-ink";

export default function ContactForm() {
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const statusId = useId();
  const nameErrorId = useId();
  const emailErrorId = useId();
  const messageErrorId = useId();

  const [status, setStatus] = useState<Status>("idle");
  const [nameError, setNameError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [messageError, setMessageError] = useState<string>("");

  // Detect locale from document lang or pathname
  const docLang = typeof document !== "undefined" ? document.documentElement.lang : "en";
  const locale = docLang.startsWith("es") ? "es" : "en";
  const messages = MESSAGES[locale];

  const accessKey = import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY || "";

  const validateForm = (form: HTMLFormElement): boolean => {
    let isValid = true;
    const formData = new FormData(form);

    const name = (formData.get("name") as string)?.trim() || "";
    const email = (formData.get("email") as string)?.trim() || "";
    const message = (formData.get("message") as string)?.trim() || "";

    if (!name) {
      setNameError(messages.required);
      isValid = false;
    } else {
      setNameError("");
    }

    if (!email) {
      setEmailError(messages.required);
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError(messages.invalidEmail);
        isValid = false;
      } else {
        setEmailError("");
      }
    }

    if (!message) {
      setMessageError(messages.required);
      isValid = false;
    } else {
      setMessageError("");
    }

    return isValid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    // Reset errors
    setNameError("");
    setEmailError("");
    setMessageError("");

    if (!validateForm(form)) {
      return;
    }

    if (!accessKey) {
      setStatus("error");
      return;
    }

    setStatus("sending");

    try {
      const formData = new FormData(form);
      formData.append("access_key", accessKey);
      formData.append("subject", "New contact from endtoendsolutions.dev");

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const isDisabled = status === "sending";

  if (!accessKey) {
    const mailto = locale === "es" ? "contacto@endtoendsolutions.dev" : "contact@endtoendsolutions.dev";
    return (
      <div className="grid gap-5">
        <p className="text-sm text-muted" aria-live="polite">
          {messages.fallbackPrefix}{" "}
          <a href={`mailto:${mailto}`} className="font-medium text-accent underline underline-offset-2 hover:text-accent-ink">
            {mailto}
          </a>{" "}
          {messages.fallbackSuffix}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" aria-describedby={statusId} noValidate>
      <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className={labelClass}>
            {messages.name}
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
            aria-invalid={nameError ? "true" : "false"}
            aria-describedby={nameError ? nameErrorId : undefined}
          />
          {nameError && (
            <p id={nameErrorId} className="mt-1 text-xs text-red-600" aria-live="polite">
              {nameError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={emailId} className={labelClass}>
            {messages.email}
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
            aria-invalid={emailError ? "true" : "false"}
            aria-describedby={emailError ? emailErrorId : undefined}
          />
          {emailError && (
            <p id={emailErrorId} className="mt-1 text-xs text-red-600" aria-live="polite">
              {emailError}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={messageId} className={labelClass}>
          {messages.message}
        </label>
        <textarea
          id={messageId}
          name="message"
          rows={5}
          required
          disabled={isDisabled}
          placeholder="What are you building, and where does it get stuck?"
          className={`mt-1.5 resize-y ${fieldClass}`}
          aria-invalid={messageError ? "true" : "false"}
          aria-describedby={messageError ? messageErrorId : undefined}
        />
        {messageError && (
          <p id={messageErrorId} className="mt-1 text-xs text-red-600" aria-live="polite">
            {messageError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? messages.sending : status === "success" ? messages.sent : messages.send}
        </button>

        <p id={statusId} role="status" aria-live="polite" className="text-sm text-muted">
          {status === "success" && messages.sent}
          {status === "error" && messages.error}
          {status === "sending" && messages.sending}
          {status === "idle" && ""}
        </p>
      </div>
    </form>
  );
}
