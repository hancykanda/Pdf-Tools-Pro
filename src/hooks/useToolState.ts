import { useState, useCallback } from 'react';

export type ToolStep = 'upload' | 'options' | 'download';

interface UseToolStateOptions<TOptions> {
  initialOptions?: TOptions;
  onReset?: () => void;
}

export function useToolState<TOptions = Record<string, unknown>>({
  initialOptions,
  onReset,
}: UseToolStateOptions<TOptions> = {}) {
  const [step, setStep] = useState<ToolStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<TOptions>(initialOptions || ({} as TOptions));
  const [result, setResult] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const goToUpload = useCallback(() => {
    setStep('upload');
    setFile(null);
    setOptions(initialOptions || ({} as TOptions));
    setResult(null);
    setCountdown(0);
    setError(null);
    setSuccess(false);
    onReset?.();
  }, [initialOptions, onReset]);

  const goToOptions = useCallback(() => {
    setStep('options');
    setError(null);
  }, []);

  const goToDownload = useCallback(() => {
    setStep('download');
  }, []);

  const resetAll = useCallback(() => {
    goToUpload();
  }, [goToUpload]);

  return {
    step,
    setStep,
    file,
    setFile,
    options,
    setOptions,
    result,
    setResult,
    countdown,
    setCountdown,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    success,
    setSuccess,
    goToUpload,
    goToOptions,
    goToDownload,
    resetAll,
  };
}
