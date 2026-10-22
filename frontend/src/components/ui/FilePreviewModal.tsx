import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppleModal } from './AppleModal';
import { AppleButton } from './AppleButton';
import { FileText, Download, AlertCircle, RefreshCw } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  title: string;
  fileName?: string | null;
}

/**
 * In-app document viewer. Fetches the file with the authenticated Bearer
 * header (browser-native PDF tabs cannot send Authorization headers, which is
 * why a plain link 401s) and renders PDFs in an embedded frame, images inline,
 * and an honest fallback for formats the browser can't preview (docx/xlsx…).
 *
 * All users get this: the file endpoint is still permission-filtered by the
 * backend, so a student can only ever preview what they're allowed to see.
 */
const guessIsImage = (name: string, mime: string): boolean => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || mime.startsWith('image/');
};

const guessIsPdf = (name: string, mime: string): boolean => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ext === 'pdf' || mime.includes('pdf');
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  documentId,
  title,
  fileName,
}) => {
  const [loading, setLoading] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState('application/octet-stream');
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const loadFile = useCallback(async () => {
    if (!isOpen || !documentId) return;
    const token = localStorage.getItem('iudwas_token');
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/documents/${documentId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = 'The file could not be opened.';
        try {
          const json = await res.clone().json();
          message = json.error?.message || message;
        } catch {
          // non-JSON body — keep the default message
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setFileMime(blob.type || res.headers.get('content-type') || 'application/octet-stream');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err.message || 'Preview failed to load.');
      }
    } finally {
      setLoading(false);
    }
  }, [isOpen, documentId]);

  // Load on open; abort in-flight loads when the modal is closed
  useEffect(() => {
    if (isOpen && documentId) {
      void loadFile();
    }
    if (!isOpen) {
      activeControllerRef.current?.abort();
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(null);
    }
    return () => activeControllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentId, reloadToken]);

  // Revoke the blob URL when the modal unmounts
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = useCallback(async () => {
    const token = localStorage.getItem('iudwas_token');
    try {
      const res = await fetch(`/api/v1/documents/${documentId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || title || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err: any) {
      // surfaced as a preview reload suggestion rather than a silent failure
      setError(err.message || 'Download failed.');
    }
  }, [documentId, fileName, title]);

  const isPreviewable = !!objectUrl && (guessIsPdf(fileName || '', fileMime) || guessIsImage(fileName || '', fileMime));

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Document Preview'}
      subtitle={fileName || undefined}
      maxWidth="5xl"
      actions={
        <>
          <AppleButton
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => setReloadToken((n) => n + 1)}
            disabled={loading}
          >
            Reload
          </AppleButton>
          <AppleButton
            variant="primary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownload}
            disabled={loading}
          >
            Download
          </AppleButton>
        </>
      }
    >
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw className="w-8 h-8 text-apple-blue animate-spin" />
          <p className="text-sm text-neutral-500">Loading document preview…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-apple-red" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Preview failed</p>
          <p className="text-xs text-neutral-500 max-w-md">{error}</p>
          <AppleButton
            variant="tinted"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => setReloadToken((n) => n + 1)}
          >
            Try again
          </AppleButton>
        </div>
      )}

      {!loading && !error && objectUrl && isPreviewable && guessIsPdf(fileName || '', fileMime) && (
        <iframe
          src={objectUrl}
          title={`${title} preview`}
          className="w-full h-[65vh] rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-black/20"
        />
      )}

      {!loading && !error && objectUrl && isPreviewable && guessIsImage(fileName || '', fileMime) && (
        <div className="flex items-center justify-center py-4">
          <img
            src={objectUrl}
            alt={`${title} preview`}
            className="max-h-[65vh] rounded-2xl border border-black/10 dark:border-white/10 object-contain"
          />
        </div>
      )}

      {!loading && !error && objectUrl && !isPreviewable && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <FileText className="w-10 h-10 text-neutral-400" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            In-browser preview isn't available for this format
          </p>
          <p className="text-xs text-neutral-500 max-w-md">
            Word, Excel and other office formats open best in their native apps — download the file below and it will keep
            its original version.
          </p>
        </div>
      )}
    </AppleModal>
  );
};
