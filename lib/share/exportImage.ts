'use client';

import { toPng } from 'html-to-image';

type ExportOptions = {
  brand: string;
  modeLabel?: string;
  timestamp?: Date;
};

export async function exportMessageCardToPng(node: HTMLElement, options: ExportOptions) {
  const target = node;
  if (!target) throw new Error('message_node_missing');

  const dark = document.documentElement.classList.contains('dark');
  const clone = target.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('[data-message-actions]').forEach((el) => el.remove());
  clone.querySelectorAll('img').forEach((img) => img.remove());
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.background = 'transparent';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';

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

  try {
    await document.fonts?.ready?.catch(() => {});
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const dataUrl = await toPng(wrapper, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: dark ? '#0b0f14' : '#ffffff',
    });
    return dataUrl;
  } finally {
    document.body.removeChild(wrapper);
  }
}
