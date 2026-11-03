import { Button, Notice, TextInput } from "@luxydrive/ui";
import { type FormEvent, useState } from "react";
import { client } from "./api";
import type { SessionUser } from "./session";

type Fields = { name: string; email: string; password: string };
type Field = keyof Fields;
const fields = ["name", "email", "password"] as const;

// Mismas reglas que apps/api/src/schemas/signup.ts, para avisar de todos los campos a la vez.
const MIN_PASSWORD = 8;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const messages = {
  name: "Escribe tu nombre.",
  email: "Escribe un email válido, por ejemplo nombre@dominio.com.",
  password: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
  emailExists: "Ya hay una cuenta con este email. Usa otro.",
};

const fieldByError = {
  invalid_name: ["name", messages.name],
  invalid_email: ["email", messages.email],
  invalid_password: ["password", messages.password],
} as const;

function validate(values: Fields) {
  const errors: Partial<Record<Field, string>> = {};
  if (!values.name.trim()) errors.name = messages.name;
  if (!emailPattern.test(values.email.trim())) errors.email = messages.email;
  if (values.password.length < MIN_PASSWORD) errors.password = messages.password;
  return errors;
}

/** Formulario de registro: nombre, email y contraseña. Al crear la cuenta, la sesión ya está iniciada. */
export function SignupForm({ onSignedUp }: { onSignedUp: (user: SessionUser) => Promise<void> }) {
  const [values, setValues] = useState<Fields>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const change = (field: Field) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const showErrors = (next: Partial<Record<Field, string>>) => {
    setErrors(next);
    const first = fields.find((field) => next[field]);
    if (first) document.getElementById(`signup-${first}`)?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailed(false);
    const invalid = validate(values);
    if (Object.keys(invalid).length > 0) return showErrors(invalid);

    setSaving(true);
    try {
      const res = await client.api.auth.signup.$post({
        json: { name: values.name.trim(), email: values.email.trim(), password: values.password },
      });
      if (res.status === 201) return await onSignedUp(await res.json());
      if (res.status === 409) return showErrors({ email: messages.emailExists });
      if (res.status === 400) {
        const { error } = await res.json();
        if (error in fieldByError) {
          const [field, message] = fieldByError[error as keyof typeof fieldByError];
          return showErrors({ [field]: message });
        }
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {failed && (
        <Notice tone="error" title="No se ha podido crear la cuenta">
          Comprueba tu conexión e inténtalo de nuevo. No hemos borrado lo que has escrito.
        </Notice>
      )}
      <TextInput
        id="signup-name"
        label="Nombre"
        autoComplete="name"
        value={values.name}
        onChange={change("name")}
        error={errors.name}
        required
      />
      <TextInput
        id="signup-email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="nombre@dominio.com"
        value={values.email}
        onChange={change("email")}
        error={errors.email}
        required
      />
      <TextInput
        id="signup-password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
        value={values.password}
        onChange={change("password")}
        error={errors.password}
        required
      />
      <Button type="submit" fullWidth disabled={saving}>
        {saving ? "Creando la cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
