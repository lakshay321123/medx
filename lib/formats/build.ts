import { Lang, Mode, FormatId } from './types';
import { FORMATS, isFormatAllowed } from './registry';
import { HEADING_MAP } from '@/lib/i18n/headingMap';
import { tableDirective } from '@/lib/prompts/presets';

export function buildFormatInstruction(lang: Lang, mode: Mode, formatId?: FormatId) {
  if (!formatId) return '';
  const meta = FORMATS.find(f => f.id === formatId);
  if (!meta || !isFormatAllowed(formatId, mode)) return '';

  const canonical = meta.canonicalHeading?.toLowerCase();
  const localized = canonical ? HEADING_MAP[lang]?.[canonical] : undefined;

  const localizedName = meta.label[lang] ?? meta.label['en'] ?? formatId;

  const directive = meta.id === 'table_compare'
    ? tableDirective(lang, 'Comparison')
    : '';

  return [
    directive,
    `# Output format: ${localizedName}`,
    meta.systemHint,
    meta.userGuide ? `User-guide: ${meta.userGuide}` : '',
    localized ? `Preferred primary heading in ${lang}: "${localized}"` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
