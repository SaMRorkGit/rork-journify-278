import { useEffect } from 'react';
import { Platform } from 'react-native';

const LINKEDIN_SIGNATURE = 'LinkedIn Job Extractor';
const CROSS_ORIGIN_PHRASE = 'Blocked a frame with origin';

const includesSignature = (value?: unknown) => {
  if (typeof value !== 'string') {
    return false;
  }
  return value.includes(LINKEDIN_SIGNATURE) || value.includes(CROSS_ORIGIN_PHRASE);
};

export default function useSuppressLinkedInJobExtractorError() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return () => {};
    }

    const handleError = (event: ErrorEvent) => {
      const candidateMessages = [
        event.message,
        event.filename,
        (event.error as Error | undefined)?.message,
        (event.error as Error | undefined)?.stack,
      ];

      if (candidateMessages.some((msg) => includesSignature(msg))) {
        console.log('[LinkedIn Job Extractor] Cross-origin error suppressed');
        event.preventDefault();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as Error | string | undefined;
      const message =
        typeof reason === 'string' ? reason : typeof reason?.message === 'string' ? reason.message : undefined;

      if (includesSignature(message)) {
        console.log('[LinkedIn Job Extractor] Cross-origin rejection suppressed');
        event.preventDefault();
      }
    };

    globalThis.addEventListener?.('error', handleError as EventListener);
    globalThis.addEventListener?.('unhandledrejection', handleRejection as EventListener);

    return () => {
      globalThis.removeEventListener?.('error', handleError as EventListener);
      globalThis.removeEventListener?.('unhandledrejection', handleRejection as EventListener);
    };
  }, []);
}
