import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;      // mínimo de caracteres para considerar como barcode (padrão: 8)
  maxDelay?: number;       // delay máximo entre teclas em ms (padrão: 50ms)
  enabled?: boolean;       // habilitar/desabilitar (padrão: true)
}

export const useBarcodeScanner = ({
  onScan,
  minLength = 8,
  maxDelay = 50,
  enabled = true,
}: BarcodeScannerOptions) => {
  const buffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se o foco está num input de texto,
      // a menos que seja o input explícito de busca por barcode
      const target = e.target as HTMLElement;
      const isInputFocused = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInputFocused && !target.dataset.barcodeInput) return;

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime.current;

      // Se demorou muito entre teclas, resetar buffer
      if (timeSinceLastKey > maxDelay && buffer.current.length > 0) {
        buffer.current = '';
      }

      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        const barcode = buffer.current.trim();
        if (barcode.length >= minLength) {
          onScan(barcode);
        }
        buffer.current = '';
        e.preventDefault();
      } else if (e.key.length === 1) {
        buffer.current += e.key;

        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          buffer.current = '';
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutRef.current);
    };
  }, [onScan, minLength, maxDelay, enabled]);
};
