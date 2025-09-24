'use client';

import { toPng } from 'html-to-image';

type ExportOptions = {
  brand: string;
  modeLabel?: string;
  timestamp?: Date;
  fallbackText?: string;
};

export async function exportMessageCardToPng(node: HTMLElement, options: ExportOptions) {
  if (!node) throw new Error('message_node_missing');

  const nodeMatches = typeof node.matches === 'function' && node.matches('[data-shareable-message]');
  const source = nodeMatches ? node : node.closest<HTMLElement>('[data-shareable-message]');

  const target = source ?? node;

  const dark = document.documentElement.classList.contains('dark');
  const clone = target.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.removeAttribute('data-shareable-message');
  clone
    .querySelectorAll('[data-shareable-message]')
    .forEach((el) => el.removeAttribute('data-shareable-message'));
  clone.querySelectorAll('[data-message-actions]').forEach((el) => el.remove());
  clone.querySelectorAll('button').forEach((el) => el.remove());
  clone.querySelectorAll('img').forEach((img) => img.remove());
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.background = 'transparent';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.display = 'block';

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.padding = '24px';
  wrapper.style.width = '1200px';
  wrapper.style.maxWidth = '1200px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.borderRadius = '28px';
  wrapper.style.border = dark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid rgba(15, 23, 42, 0.08)';
  wrapper.style.background = dark ? '#0b0f14' : '#ffffff';
  wrapper.style.color = dark ? '#e2e8f0' : '#0f172a';
  wrapper.style.boxShadow = '0 30px 80px rgba(15, 23, 42, 0.18)';
  wrapper.style.fontFamily = '"Inter", "SF Pro Text", system-ui, sans-serif';
  wrapper.style.lineHeight = '1.55';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '12px';
  header.style.marginBottom = '18px';
  header.innerHTML = `
    <span style="font-weight:600;font-size:16px;">${options.brand}</span>
    <span style="font-size:12px;opacity:0.7;">${(options.timestamp || new Date()).toLocaleString()}</span>
  `;

  const bubble = document.createElement('div');
  bubble.style.padding = '24px';
  bubble.style.borderRadius = '22px';
  bubble.style.background = dark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(248, 250, 252, 0.9)';
  bubble.style.color = 'inherit';
  bubble.style.boxShadow = dark
    ? 'inset 0 0 0 1px rgba(148, 163, 184, 0.3)'
    : 'inset 0 0 0 1px rgba(15, 23, 42, 0.05)';
  bubble.style.backdropFilter = 'blur(6px)';
  bubble.style.width = '100%';
  bubble.appendChild(clone);

  const footer = document.createElement('div');
  footer.style.marginTop = '18px';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.fontSize = '12px';
  footer.style.opacity = '0.7';
  footer.innerHTML = `
    <span>${options.modeLabel || ''}</span>
    <span>${options.brand}</span>
  `;

  wrapper.appendChild(header);
  wrapper.appendChild(bubble);
  wrapper.appendChild(footer);

  document.body.appendChild(wrapper);

  let dataUrl: string | null = null;

  try {
    await document.fonts?.ready?.catch(() => {});
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    dataUrl = await toPng(wrapper, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: dark ? '#0b0f14' : '#ffffff',
    });
  } catch (error) {
    console.error('Share image export failed, falling back to text render', error);
    dataUrl = null;
  } finally {
    document.body.removeChild(wrapper);
  }

  if (dataUrl) {
    const isBlank = await imageLooksBlank(dataUrl);
    if (!isBlank) {
      return dataUrl;
    }
  }

  const fallbackContent =
    options.fallbackText?.trim() || target.textContent?.trim() || 'Shared response unavailable.';
  return renderFallbackImage(fallbackContent, options, dark);
}

async function imageLooksBlank(dataUrl: string) {
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
        resolve(true);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(false);
        return;
      }
      ctx.drawImage(img, 0, 0);

      const center = ctx.getImageData(
        Math.floor(img.naturalWidth / 2),
        Math.floor(img.naturalHeight / 2),
        1,
        1
      ).data;
      if (center[3] > 0) {
        resolve(false);
        return;
      }

      const stepX = Math.max(1, Math.floor(img.naturalWidth / 12));
      const stepY = Math.max(1, Math.floor(img.naturalHeight / 12));
      for (let y = 0; y < img.naturalHeight; y += stepY) {
        for (let x = 0; x < img.naturalWidth; x += stepX) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          if (pixel[3] > 0) {
            resolve(false);
            return;
          }
        }
      }
      resolve(true);
    };
    img.onerror = () => resolve(true);
    img.src = dataUrl;
  });
}

function renderFallbackImage(text: string, options: ExportOptions, isDark: boolean) {
  const content = text.trim() || 'Shared response unavailable.';
  const brand = options.brand || 'MedX';
  const timestamp = (options.timestamp || new Date()).toLocaleString();

  const width = 1200;
  const padding = 48;
  const innerWidth = width - padding * 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return `data:,${encodeURIComponent(content)}`;
  }

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  const lineHeight = 32;
  const textFont = "400 22px 'Inter', 'SF Pro Text', system-ui, sans-serif";
  const brandFont = "600 28px 'Inter', 'SF Pro Text', system-ui, sans-serif";
  const metaFont = "500 18px 'Inter', 'SF Pro Text', system-ui, sans-serif";
  const footerFont = "500 20px 'Inter', 'SF Pro Text', system-ui, sans-serif";

  if (measureCtx) {
    measureCtx.font = textFont;
  }

  const words = content.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words.length ? words : ['']) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = measureCtx?.measureText(testLine);
    const widthWithWord = metrics ? metrics.width : testLine.length * 10;
    if (widthWithWord > innerWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const hasMode = Boolean(options.modeLabel);
  const headerHeight = 36;
  const timestampHeight = 28;
  const modeHeight = hasMode ? 30 : 0;
  const textHeight = Math.max(1, lines.length) * lineHeight;
  const totalHeight =
    padding * 2 +
    headerHeight +
    timestampHeight +
    24 +
    textHeight +
    (hasMode ? modeHeight + 24 : 0);

  canvas.width = width;
  canvas.height = totalHeight;

  const background = isDark ? '#0b0f14' : '#ffffff';
  const foreground = isDark ? '#e2e8f0' : '#0f172a';
  const muted = isDark ? 'rgba(148, 163, 184, 0.85)' : 'rgba(71, 85, 105, 0.85)';

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, totalHeight);

  let y = padding;
  ctx.fillStyle = foreground;
  ctx.font = brandFont;
  ctx.fillText(brand, padding, y + 24);
  y += headerHeight;

  ctx.fillStyle = muted;
  ctx.font = metaFont;
  ctx.fillText(timestamp, padding, y);
  y += timestampHeight + 8;

  ctx.fillStyle = foreground;
  ctx.font = textFont;
  for (const line of lines) {
    ctx.fillText(line, padding, y);
    y += lineHeight;
  }

  if (hasMode) {
    y += 16;
    ctx.fillStyle = muted;
    ctx.font = footerFont;
    ctx.fillText(options.modeLabel ?? '', padding, y);
  }

  return canvas.toDataURL('image/png');
}
