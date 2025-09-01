'use client';

export interface UploadPanelProps {
  onUpload: (file: File) => void;
}

export default function UploadPanel({ onUpload }: UploadPanelProps) {
  return (
    <label className="item" style={{ cursor: 'pointer' }}>
      Upload Medical Doc
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.currentTarget.value = '';
        }}
      />
    </label>
  );
}
