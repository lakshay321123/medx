import { Lang, Mode, FormatId } from './types';
import { FORMATS, isFormatAllowed } from './registry';
import { HEADING_MAP } from '@/lib/i18n/headingMap';

export function buildFormatInstruction(lang: Lang, mode: Mode, formatId?: FormatId) {
  if (!formatId) return '';
  const meta = FORMATS.find(f => f.id === formatId);
  if (!meta || !isFormatAllowed(formatId, mode)) return '';

  const canonical = meta.canonicalHeading?.toLowerCase();
  const localized = canonical ? HEADING_MAP[lang]?.[canonical] : undefined;

  const localizedName = meta.label[lang] ?? meta.label['en'] ?? formatId;

  return [
    `# Output format: ${localizedName}`,
    meta.systemHint,
    meta.userGuide ? `User-guide: ${meta.userGuide}` : '',
    localized ? `Preferred primary heading in ${lang}: "${localized}"` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
