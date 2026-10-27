// A message box. tone="error" (red, read out immediately) or "success" / "info".
export default function Alert({ tone = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
