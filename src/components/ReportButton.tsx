import { useState } from 'react';

interface Props {
  disabled?: boolean;
  onReport: () => Promise<void>;
}

export default function ReportButton({ disabled, onReport }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onReport();
      setOpen(false);
    } catch {
      // The caller shows the error message.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        className="report-button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? 'Firebase is not configured' : undefined}
      >
        Report inspector
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => !submitting && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <p>Report a transport inspector at your current location?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
