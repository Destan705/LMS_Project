// One labelled form field, with an optional hint and an error message underneath.
// as="input" (default), "textarea" or "select" (pass <option>s as children).
// The error is linked to the field (aria-describedby) so screen readers read it out.
export default function FormField({ id, label, error, hint, as: Tag = 'input', children, ...fieldProps }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <>
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="help" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <Tag id={id} name={id} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...fieldProps}>
        {children}
      </Tag>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </>
  );
}
