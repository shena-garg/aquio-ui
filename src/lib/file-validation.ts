const ALLOWED_TYPES = {
  "order": {
    mimes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    accept: ".pdf,.jpg,.jpeg,.png,.xlsx,.docx",
    label: "PDF, JPG, PNG, XLSX or DOCX",
    maxBytes: 10 * 1024 * 1024,
    maxLabel: "10 MB",
  },
  "receipt": {
    mimes: ["application/pdf", "image/jpeg", "image/png"],
    accept: ".pdf,.jpg,.jpeg,.png",
    label: "PDF, JPG or PNG",
    maxBytes: 10 * 1024 * 1024,
    maxLabel: "10 MB",
  },
  "product": {
    mimes: ["application/pdf", "image/jpeg", "image/png"],
    accept: ".pdf,.jpg,.jpeg,.png",
    label: "PDF, JPG or PNG",
    maxBytes: 5 * 1024 * 1024,
    maxLabel: "5 MB",
  },
} as const;

export type FileContext = keyof typeof ALLOWED_TYPES;

export function getFileAccept(context: FileContext): string {
  return ALLOWED_TYPES[context].accept;
}

export function validateFile(file: File, context: FileContext): string | null {
  const config = ALLOWED_TYPES[context];

  if (file.size > config.maxBytes) {
    return `File "${file.name}" exceeds the ${config.maxLabel} limit.`;
  }

  if (!config.mimes.includes(file.type as any)) {
    return `File "${file.name}" is not allowed. Only ${config.label} files are accepted.`;
  }

  return null;
}
