import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Aplica máscara brasileira enquanto o usuário digita: (XX) XXXXX-XXXX */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/** Remove a máscara, retornando apenas os dígitos */
export function unmaskedPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** Retorna a data atual no fuso horário especificado no formato YYYY-MM-DD */
export function getISODateForTimeZone(timeZone: string): string {
  const now = new Date();
  return new Intl.DateTimeFormat('sv', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Converte `YYYY-MM-DD` para `DD/MM/YYYY` para exibição ao usuário */
export function isoToDDMMYYYY(iso?: string | null): string {
  if (!iso) return '';
  // Já está no formato YYYY-MM-DD
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  // Fallback: tentar parsear como Date
  try {
    const dt = new Date(iso);
    return dt.toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

/** Converte `DD/MM/YYYY` para `YYYY-MM-DD` (ISO) para envio ao servidor */
export function ddmmyyyyToIso(ddmmyyyy?: string | null): string {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return ddmmyyyy;
}
