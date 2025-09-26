import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BRAND_NAME } from '@/lib/brand';
import { buildShareCaption, buildShareIntentCaption } from '@/lib/share/caption';
import { exportMessageCardToPng } from '@/lib/share/exportImage';
import { pushToast } from '@/lib/ui/toast';
import { trackEvent } from '@/lib/analytics/events';

export type ShareTargetState = {
  conversationId: string;
  messageId: string;
  domId: string;
  plainText: string;
  mdText?: string | null;
  mode: 'patient' | 'doctor' | 'research' | 'therapy';
  research: boolean;
};

export type ShareActionKey =
  | 'link'
  | 'download'
  | 'caption'
  | 'system'
  | 'x'
  | 'facebook';

const SHARE_FALLBACK_MESSAGE = 'Shared response unavailable.';

type ShareLinks = Record<string, string>;

type EnsureShareLink = (target: ShareTargetState) => Promise<string>;

type UseShareActionsResult = {
  shareTarget: ShareTargetState | null;
  shareBusy: ShareActionKey | null;
  sharePreview: string;
  systemShareSupported: boolean;
  openShare: (target: ShareTargetState) => void;
  closeShare: () => void;
  handleCopyShareLink: () => Promise<void>;
  handleDownloadShareImage: () => Promise<void>;
  handleShareX: () => Promise<void>;
  handleShareFacebook: () => Promise<void>;
  handleSystemShare: () => Promise<void>;
  handleCopyShareCaption: () => Promise<void>;
};

const resolveNormalizedAppUrl = () => {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
};

const resolveAbsoluteUrl = (candidate: string, normalizedAppUrl: string) => {
  if (!candidate) return '';
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (candidate.startsWith('//')) {
    return `https:${candidate}`;
  }
  if (candidate.startsWith('/')) {
    return normalizedAppUrl ? `${normalizedAppUrl}${candidate}` : '';
  }
  return normalizedAppUrl ? `${normalizedAppUrl}/${candidate.replace(/^\/+/, '')}` : '';
};

export function useShareActions(): UseShareActionsResult {
  const [shareTarget, setShareTarget] = useState<ShareTargetState | null>(null);
  const [shareBusy, setShareBusy] = useState<ShareActionKey | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLinks>({});
  const shareLinksRef = useRef<ShareLinks>({});
  const shareInFlightRef = useRef<Map<string, Promise<string>>>(new Map());

  useEffect(() => {
    shareLinksRef.current = shareLinks;
  }, [shareLinks]);

  const systemShareSupported = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      'share' in navigator &&
      typeof (navigator as Navigator & { share?: unknown }).share === 'function',
    []
  );

  const ensureShareLink: EnsureShareLink = useCallback(
    async (target) => {
      const cached = shareLinksRef.current[target.messageId];
      if (cached) return cached;

      const inflight = shareInFlightRef.current.get(target.messageId);
      if (inflight) return inflight;

      const request = (async () => {
        const fallbackMessage = SHARE_FALLBACK_MESSAGE;
        const safePlainText = (target.plainText || '').trim();
        const safeMdText = (target.mdText || '').trim();
        const plainTextPayload = safePlainText || safeMdText || fallbackMessage;
        const mdTextPayload = safeMdText || undefined;

        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: target.conversationId,
            messageId: target.messageId,
            plainText: plainTextPayload,
            mdText: mdTextPayload,
            mode: target.mode,
            research: target.research,
          }),
        });
        if (!res.ok) throw new Error('share_failed');
        const data = await res.json().catch(() => null);
        const absoluteUrlRaw = typeof data?.absoluteUrl === 'string' ? data.absoluteUrl.trim() : '';
        const slug = typeof data?.slug === 'string' ? data.slug : '';

        const normalizedAppUrl = resolveNormalizedAppUrl();
        const absoluteUrl = resolveAbsoluteUrl(absoluteUrlRaw, normalizedAppUrl);

        let shareUrl = '';
        if (absoluteUrl) {
          shareUrl = absoluteUrl;
        } else if (slug) {
          if (!normalizedAppUrl) throw new Error('share_failed');
          shareUrl = `${normalizedAppUrl}/s/${slug}`;
        } else {
          throw new Error('share_failed');
        }

        shareLinksRef.current[target.messageId] = shareUrl;
        setShareLinks((prev) => {
          if (prev[target.messageId]) return prev;
          return { ...prev, [target.messageId]: shareUrl };
        });
        return shareUrl;
      })();

      shareInFlightRef.current.set(target.messageId, request);
      try {
        return await request;
      } finally {
        shareInFlightRef.current.delete(target.messageId);
      }
    },
    []
  );

  const closeShare = useCallback(() => {
    setShareTarget(null);
    setShareBusy(null);
  }, []);

  const openShare = useCallback((target: ShareTargetState) => {
    const fallbackMessage = SHARE_FALLBACK_MESSAGE;
    const normalizedPlain = target.plainText.trim();
    const normalizedMd = target.mdText?.trim() ?? '';
    const normalizedTarget: ShareTargetState = {
      ...target,
      plainText: normalizedPlain || normalizedMd || fallbackMessage,
      mdText: normalizedMd || undefined,
    };
    setShareTarget(normalizedTarget);
    setShareBusy(null);
    trackEvent('share_opened', {
      conversationId: normalizedTarget.conversationId,
      messageId: normalizedTarget.messageId,
      mode: normalizedTarget.mode,
      research: normalizedTarget.research,
    });
  }, []);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareTarget) return;
    setShareBusy('link');
    try {
      const url = await ensureShareLink(shareTarget);
      try {
        if (!navigator?.clipboard?.writeText) throw new Error('clipboard_unsupported');
        await navigator.clipboard.writeText(url);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!successful) {
          throw new Error('copy_failed');
        }
      }
      pushToast({ title: 'Link copied' });
      trackEvent('share_copy_link', {
        conversationId: shareTarget.conversationId,
        messageId: shareTarget.messageId,
        mode: shareTarget.mode,
        research: shareTarget.research,
      });
    } catch {
      pushToast({ title: 'Could not copy link', variant: 'destructive' });
    } finally {
      setShareBusy(null);
    }
  }, [ensureShareLink, shareTarget]);

  const handleDownloadShareImage = useCallback(async () => {
    if (!shareTarget) return;
    setShareBusy('download');
    try {
      const node = document.getElementById(shareTarget.domId);
      if (!node) throw new Error('missing_node');
      const modeLabel =
        shareTarget.mode === 'doctor'
          ? 'Doctor mode'
          : shareTarget.mode === 'research'
          ? 'Research mode'
          : shareTarget.mode === 'therapy'
          ? 'Therapy mode'
          : 'Patient mode';
      const dataUrl = await exportMessageCardToPng(node, {
        brand: BRAND_NAME,
        modeLabel,
        timestamp: new Date(),
        fallbackText: shareTarget.plainText,
      });
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = 'medx-answer.png';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
      trackEvent('share_download_image', {
        conversationId: shareTarget.conversationId,
        messageId: shareTarget.messageId,
        mode: shareTarget.mode,
        research: shareTarget.research,
      });
    } catch {
      pushToast({ title: 'Could not download image', variant: 'destructive' });
    } finally {
      setShareBusy(null);
    }
  }, [shareTarget]);

  const handleShareX = useCallback(async () => {
    if (!shareTarget) return;
    const win = window.open('about:blank', '_blank', 'noopener,noreferrer');
    setShareBusy('x');
    try {
      const url = await ensureShareLink(shareTarget);
      const caption = buildShareIntentCaption(shareTarget.plainText, BRAND_NAME);
      const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(url)}`;
      if (win) {
        win.location.href = intentUrl;
      } else {
        window.open(intentUrl, '_blank', 'noopener,noreferrer');
      }
      trackEvent('share_x', {
        conversationId: shareTarget.conversationId,
        messageId: shareTarget.messageId,
        mode: shareTarget.mode,
        research: shareTarget.research,
      });
    } catch {
      if (win) {
        win.close();
      }
      pushToast({ title: 'Could not open X share', variant: 'destructive' });
    } finally {
      setShareBusy(null);
    }
  }, [ensureShareLink, shareTarget]);

  const handleShareFacebook = useCallback(async () => {
    if (!shareTarget) return;
    const win = window.open('about:blank', '_blank', 'noopener,noreferrer');
    setShareBusy('facebook');
    try {
      const url = await ensureShareLink(shareTarget);
      const intentUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      if (win) {
        win.location.href = intentUrl;
      } else {
        window.open(intentUrl, '_blank', 'noopener,noreferrer');
      }
      trackEvent('share_facebook', {
        conversationId: shareTarget.conversationId,
        messageId: shareTarget.messageId,
        mode: shareTarget.mode,
        research: shareTarget.research,
      });
    } catch {
      if (win) {
        win.close();
      }
      pushToast({ title: 'Could not open Facebook share', variant: 'destructive' });
    } finally {
      setShareBusy(null);
    }
  }, [ensureShareLink, shareTarget]);

  const handleSystemShare = useCallback(async () => {
    if (!shareTarget) return;
    if (!systemShareSupported || !navigator?.share) {
      pushToast({ title: 'Device sharing not available', variant: 'destructive' });
      return;
    }
    setShareBusy('system');
    try {
      const url = await ensureShareLink(shareTarget);
      const caption = buildShareCaption(shareTarget.plainText, BRAND_NAME, url);
      await navigator.share({ title: 'MedX Answer', text: caption, url });
      trackEvent('share_system', {
        conversationId: shareTarget.conversationId,
        messageId: shareTarget.messageId,
        mode: shareTarget.mode,
        research: shareTarget.research,
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        pushToast({ title: 'Share cancelled', variant: 'destructive' });
      }
    } finally {
      setShareBusy(null);
    }
  }, [ensureShareLink, shareTarget, systemShareSupported]);

  const handleCopyShareCaption = useCallback(async () => {
    if (!shareTarget) return;
    setShareBusy('caption');
    try {
      const url = await ensureShareLink(shareTarget);
      const caption = buildShareCaption(shareTarget.plainText, BRAND_NAME, url);
      try {
        if (!navigator?.clipboard?.writeText) throw new Error('clipboard_unsupported');
        await navigator.clipboard.writeText(caption);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = caption;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!successful) {
          throw new Error('copy_failed');
        }
      }
      pushToast({ title: 'Caption copied' });
    } catch {
      pushToast({ title: 'Could not copy caption', variant: 'destructive' });
    } finally {
      setShareBusy(null);
    }
  }, [ensureShareLink, shareTarget]);

  const sharePreview = shareTarget?.plainText ?? '';

  return {
    shareTarget,
    shareBusy,
    sharePreview,
    systemShareSupported,
    openShare,
    closeShare,
    handleCopyShareLink,
    handleDownloadShareImage,
    handleShareX,
    handleShareFacebook,
    handleSystemShare,
    handleCopyShareCaption,
  };
}
