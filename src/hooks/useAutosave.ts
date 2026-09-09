import { useState, useEffect, useRef, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'demo';

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<boolean | void>;
  debounceMs?: number;
  isDemo?: boolean;
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  debounceMs = 1200,
  isDemo = false,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>(isDemo ? 'demo' : 'idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep references to latest callbacks and data
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const pendingDataRef = useRef<T | null>(null);

  dataRef.current = data;
  onSaveRef.current = onSave;

  const triggerSave = useCallback(async (dataToSave: T) => {
    if (isDemo) {
      setStatus('demo');
      return;
    }

    setStatus('saving');
    setErrorMessage(null);

    try {
      await onSaveRef.current(dataToSave);
      setStatus('saved');
      setLastSavedAt(new Date());
      pendingDataRef.current = null;
    } catch (err: any) {
      console.error('Autosave failure:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Unable to save to cloud storage');
      pendingDataRef.current = dataToSave;
    }
  }, [isDemo]);

  // Debounced effect on data changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled) return;

    if (isDemo) {
      setStatus('demo');
      return;
    }

    setStatus('saving');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      triggerSave(dataRef.current);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, debounceMs, isDemo, enabled, triggerSave]);

  const retrySave = useCallback(() => {
    const targetData = pendingDataRef.current || dataRef.current;
    triggerSave(targetData);
  }, [triggerSave]);

  const manualSaveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    triggerSave(dataRef.current);
  }, [triggerSave]);

  return {
    status,
    lastSavedAt,
    errorMessage,
    retrySave,
    manualSaveNow,
  };
}
