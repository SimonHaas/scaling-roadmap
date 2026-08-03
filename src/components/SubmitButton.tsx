'use client';

import { useFormStatus } from 'react-dom';

/** Every form's submit: disables itself and says what it is doing while the
    server round trip runs, so a second click has nothing to land on. */
export default function SubmitButton({
  label,
  pendingLabel,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={disabled || pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
