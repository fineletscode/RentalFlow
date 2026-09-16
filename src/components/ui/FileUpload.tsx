import { type ReactNode } from 'react';

interface FileUploadProps {
  label: string;
  url: string | null;
  onChange: (url: string) => void;
  required?: boolean;
  hint?: string;
  icon?: ReactNode;
}

export function FileUpload({ label, url, onChange, required, hint, icon }: FileUploadProps) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mockUrl = `mock://${file.name}`;
      onChange(mockUrl);
    }
  };

  return (
    <div>
      <label className="label-text">
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </label>
      <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-300 bg-ink-50 px-4 py-6 text-center transition-all hover:border-brand-400 hover:bg-brand-50">
        {url ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 text-success-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-medium text-success-700">Uploaded</span>
            <span className="text-xs text-ink-400">{url.replace('mock://', '')}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-200 text-ink-500 transition-colors group-hover:bg-brand-100 group-hover:text-brand-600">
              {icon || (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
            </div>
            <span className="text-xs font-medium text-ink-600">Click to upload</span>
            {hint && <span className="text-xs text-ink-400">{hint}</span>}
          </div>
        )}
        <input type="file" className="hidden" onChange={handleFile} accept="image/*,application/pdf" />
      </label>
    </div>
  );
}
