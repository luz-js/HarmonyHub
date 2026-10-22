import { z } from 'zod';

/**
 * ChordPro (https://www.chordpro.org): texto con directivas entre llaves ({title: ...}) y acordes en linea ([G]).
 * Este modulo lo comparten la web (vista previa) y la API (guardar): el mismo parser en los dos lados.
 *
 * En HarmonyHub cada linea guarda los acordes como texto alineado por columna sobre la letra:
 *     chords: "G       C"
 *     lyrics: "Amazing grace"
 * y en ChordPro eso es "[G]Amazing [C]grace". Exportar y volver a importar conserva el contenido.
 */

export const SONG_SECTION_TYPES = ['INTRO', 'VERSE', 'PRE_CHORUS', 'CHORUS', 'BRIDGE', 'INTERLUDE', 'INSTRUMENTAL', 'SOLO', 'ENDING', 'CUSTOM'] as const;
export type SongSectionType = (typeof SONG_SECTION_TYPES)[number];

/** Mismos nombres que usa el editor de la web. */
export const SECTION_TYPE_LABELS: Record<SongSectionType, string> = {
  INTRO: 'Intro',
  VERSE: 'Verso',
  PRE_CHORUS: 'Precoro',
  CHORUS: 'Coro',
  BRIDGE: 'Puente',
  INTERLUDE: 'Interludio',
  INSTRUMENTAL: 'Instrumental',
  SOLO: 'Solo',
  ENDING: 'Final',
  CUSTOM: 'Personalizada',
};

export type ChordProLine = { id: string; order: number; chords: string; lyrics: string };
export type ChordProSection = { id: string; type: SongSectionType; name: string; order: number; notes?: string; lines: ChordProLine[] };
export type ChordProContent = { version: 1; sections: ChordProSection[] };

export type ChordProMetadata = {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  key?: string;
  tempo?: number;
  time?: string;
  capo?: number;
};

export type ParsedChordPro = {
  metadata: ChordProMetadata;
  content: ChordProContent;
  /** Cosas que no tienen lugar en la cancion (capo, directivas desconocidas): van como nota de la version. */
  notes: string[];
  /** Avisos para mostrar en la vista previa (nunca rompen el import). */
  warnings: string[];
};

/** Un archivo ChordPro de una cancion pesa unos pocos KB; esto deja margen y cabe en el limite del cuerpo JSON. */
export const CHORDPRO_MAX_LENGTH = 60_000;

// ======================= Acordes: columna <-> en linea =======================

/** "[G]Amazing [C]grace" -> { chords: "G       C", lyrics: "Amazing grace" } */
export function inlineToChordLine(text: string): { chords: string; lyrics: string } {
  let lyrics = '';
  const placed: Array<{ column: number; chord: string }> = [];
  const pattern = /\[([^\]]*)\]/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    lyrics += text.slice(cursor, match.index);
    cursor = (match.index ?? 0) + match[0].length;
    const chord = match[1].trim();
    if (chord) placed.push({ column: lyrics.length, chord });
  }
  lyrics += text.slice(cursor);

  let chords = '';
  for (const { column, chord } of placed) {
    // Si el acorde anterior todavia ocupa esa columna, este va despues de un espacio.
    const at = chords.length === 0 ? column : Math.max(column, chords.length + 1);
    chords = chords.padEnd(at) + chord;
  }
  return { chords, lyrics: lyrics.trimEnd() };
}

/** { chords: "G       C", lyrics: "Amazing grace" } -> "[G]Amazing [C]grace" */
export function chordLineToInline(chords: string, lyrics: string): string {
  const tokens = [...chords.matchAll(/\S+/g)].map((match) => ({ column: match.index ?? 0, chord: match[0] }));
  if (tokens.length === 0) return lyrics.trimEnd();
  const lastColumn = tokens[tokens.length - 1].column;
  const padded = lyrics.length < lastColumn ? lyrics.padEnd(lastColumn) : lyrics;
  let out = '';
  let cursor = 0;
  for (const { column, chord } of tokens) {
    out += `${padded.slice(cursor, column)}[${chord}]`;
    cursor = column;
  }
  return (out + padded.slice(cursor)).trimEnd();
}

// ======================= Importar =======================

const SECTION_KEYWORDS: Array<[RegExp, SongSectionType]> = [
  [/^(pre[\s-]?chorus|pre[\s-]?coro|precoro)\b/i, 'PRE_CHORUS'],
  [/^(chorus|coro|estribillo|refr[aá]n)\b/i, 'CHORUS'],
  [/^(verse|verso|estrofa)\b/i, 'VERSE'],
  [/^(bridge|puente)\b/i, 'BRIDGE'],
  [/^intro\b/i, 'INTRO'],
  [/^(outro|ending|final|coda)\b/i, 'ENDING'],
  [/^(interlude|interludio)\b/i, 'INTERLUDE'],
  [/^instrumental\b/i, 'INSTRUMENTAL'],
  [/^solo\b/i, 'SOLO'],
];

/** "Coro 2", "Verse", "Puente:" -> tipo de seccion (o null si no parece el nombre de una seccion). */
export function sectionTypeFromLabel(label: string): SongSectionType | null {
  const clean = label.trim().replace(/[:.]$/, '');
  for (const [pattern, type] of SECTION_KEYWORDS) if (pattern.test(clean)) return type;
  return null;
}

const ENVIRONMENTS: Record<string, SongSectionType> = {
  verse: 'VERSE',
  chorus: 'CHORUS',
  bridge: 'BRIDGE',
  intro: 'INTRO',
  pre_chorus: 'PRE_CHORUS',
  prechorus: 'PRE_CHORUS',
  interlude: 'INTERLUDE',
  instrumental: 'INSTRUMENTAL',
  solo: 'SOLO',
  ending: 'ENDING',
  outro: 'ENDING',
  custom: 'CUSTOM',
};
const ENVIRONMENT_ALIASES: Record<string, string> = { sov: 'start_of_verse', eov: 'end_of_verse', soc: 'start_of_chorus', eoc: 'end_of_chorus', sob: 'start_of_bridge', eob: 'end_of_bridge', sot: 'start_of_tab', eot: 'end_of_tab', sog: 'start_of_grid', eog: 'end_of_grid' };
const DIRECTIVE_ALIASES: Record<string, string> = { t: 'title', st: 'subtitle', c: 'comment', ci: 'comment', cb: 'comment', comment_italic: 'comment', comment_box: 'comment', highlight: 'comment' };
/** Formato del texto que ChordPro tambien define pero que no cambia el contenido de la cancion. */
const IGNORED_DIRECTIVES = new Set(['new_page', 'np', 'new_physical_page', 'npp', 'column_break', 'colb', 'columns', 'col', 'textfont', 'textsize', 'textcolour', 'textcolor', 'chordfont', 'chordsize', 'chordcolour', 'chordcolor', 'pagetype', 'titles', 'grid', 'g', 'no_grid', 'ng', 'transpose']);

const KEY_PATTERN = /^[A-G](#|b)?(m| minor| major| menor| mayor)?$/i;

function parseDirective(line: string): { name: string; value: string } | null {
  const match = /^\{\s*([A-Za-z_][\w-]*)\s*(?:[:\s]\s*([\s\S]*?))?\s*\}\s*$/.exec(line.trim());
  if (!match) return null;
  return { name: match[1].toLowerCase().replace(/-/g, '_'), value: (match[2] ?? '').trim() };
}

/**
 * Lee un ChordPro y lo convierte al contenido de una version (secciones con lineas de acordes y letra).
 * Nunca falla por algo desconocido: lo deja como nota o como aviso.
 */
export function parseChordPro(text: string): ParsedChordPro {
  const metadata: ChordProMetadata = {};
  const notes: string[] = [];
  const warnings: string[] = [];
  const sections: ChordProSection[] = [];
  let current: ChordProSection | null = null;
  let environment: string | null = null; // dentro de {start_of_x} ... {end_of_x}
  let pendingLabel: { type: SongSectionType; name: string } | null = null;
  let pendingNotes: string[] = [];
  let subtitle: string | undefined;
  let lastChorus: ChordProSection | null = null;

  const countOf = (type: SongSectionType) => sections.filter((section) => section.type === type).length;
  const autoName = (type: SongSectionType) => {
    const base = SECTION_TYPE_LABELS[type];
    const count = countOf(type);
    if (type !== 'VERSE' && count === 0) return base;
    return `${base} ${count + 1}`;
  };
  const openSection = (type: SongSectionType, name?: string) => {
    const section: ChordProSection = { id: `section-${sections.length + 1}`, type, name: (name || autoName(type)).slice(0, 80), order: sections.length, lines: [] };
    if (pendingNotes.length) {
      section.notes = pendingNotes.join('\n');
      pendingNotes = [];
    }
    sections.push(section);
    current = section;
    return section;
  };
  const closeStanza = () => {
    if (environment) return;
    current = null;
  };
  const addNote = (note: string) => {
    if (current) current.notes = current.notes ? `${current.notes}\n${note}` : note;
    else pendingNotes.push(note);
  };
  const addLine = (raw: string) => {
    if (!current) {
      const label = pendingLabel;
      pendingLabel = null;
      openSection(label?.type ?? 'VERSE', label?.name);
    }
    const section = current as unknown as ChordProSection;
    const { chords, lyrics } = inlineToChordLine(raw);
    section.lines.push({ id: `${section.id}-line-${section.lines.length + 1}`, order: section.lines.length, chords, lyrics });
  };

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.trim() === '') {
      closeStanza();
      continue;
    }
    if (line.trimStart().startsWith('#')) continue; // comentario del archivo, no de la cancion

    const directive = line.trimStart().startsWith('{') ? parseDirective(line) : null;
    if (!directive) {
      addLine(line);
      continue;
    }

    const name = DIRECTIVE_ALIASES[directive.name] ?? ENVIRONMENT_ALIASES[directive.name] ?? directive.name;
    const value = directive.value;

    const start = /^start_of_(\w+)$/.exec(name);
    if (start) {
      const kind = start[1];
      const type = ENVIRONMENTS[kind] ?? 'CUSTOM';
      const label = value || (kind === 'tab' ? 'Tablatura' : kind === 'grid' ? 'Grilla' : undefined);
      const inferred = kind === 'verse' && value ? sectionTypeFromLabel(value) : null;
      environment = kind;
      pendingLabel = null;
      const section = openSection(inferred ?? type, label);
      if (!ENVIRONMENTS[kind] && kind !== 'tab' && kind !== 'grid') warnings.push(`Seccion "${kind}" no estandar: se importo como "${section.name}"`);
      if (section.type === 'CHORUS') lastChorus = section;
      continue;
    }
    if (/^end_of_\w+$/.test(name)) {
      environment = null;
      current = null;
      continue;
    }

    switch (name) {
      case 'title':
        metadata.title = value || metadata.title;
        break;
      case 'subtitle':
        subtitle = value;
        break;
      case 'artist':
      case 'composer':
      case 'lyricist':
        if (name === 'artist' || !metadata.artist) metadata.artist = value;
        if (name !== 'artist') notes.push(`${name === 'composer' ? 'Compositor' : 'Letrista'}: ${value}`);
        break;
      case 'album':
        metadata.album = value;
        break;
      case 'year': {
        const year = Number(value);
        if (Number.isInteger(year) && year > 0) metadata.year = year;
        else warnings.push(`Año "${value}" no valido: no se uso`);
        break;
      }
      case 'key':
        if (KEY_PATTERN.test(value)) metadata.key = value;
        else warnings.push(`Tonalidad "${value}" no reconocida: se usara la tonalidad por defecto`);
        break;
      case 'tempo': {
        const bpm = Math.round(Number(value));
        if (Number.isFinite(bpm) && bpm > 0 && bpm <= 320) metadata.tempo = bpm;
        else warnings.push(`Tempo "${value}" no valido: no se uso`);
        break;
      }
      case 'time':
        metadata.time = value;
        break;
      case 'capo': {
        const capo = Number(value);
        if (Number.isInteger(capo) && capo >= 0 && capo <= 12) metadata.capo = capo;
        notes.push(`Capo: ${value}`);
        warnings.push('El capo no tiene un campo propio en la cancion: quedo como nota de la version');
        break;
      }
      case 'comment': {
        const type = !environment ? sectionTypeFromLabel(value) : null;
        if (type && (!current || (current as ChordProSection).lines.length > 0)) {
          // "{c: Coro}" antes de una estrofa: es el nombre de la seccion que sigue.
          current = null;
          pendingLabel = { type, name: value.replace(/[:.]$/, '') };
        } else if (type && current && (current as ChordProSection).lines.length === 0 && !environment) {
          const section = current as ChordProSection;
          section.type = type;
          section.name = value.replace(/[:.]$/, '').slice(0, 80);
        } else {
          addNote(value);
        }
        break;
      }
      case 'chorus': {
        // {chorus}: repetir el ultimo coro.
        closeStanza();
        if (lastChorus) {
          const source: ChordProSection = lastChorus;
          const copy = openSection('CHORUS', value || `${source.name} (repetición)`);
          copy.lines = source.lines.map((item, index) => ({ ...item, id: `${copy.id}-line-${index + 1}` }));
          current = null;
        } else {
          warnings.push('{chorus} sin un coro anterior: se ignoro');
        }
        break;
      }
      default:
        if (IGNORED_DIRECTIVES.has(name)) break;
        notes.push(`{${directive.name}${value ? `: ${value}` : ''}}`);
        warnings.push(`Directiva no reconocida {${directive.name}}: se guardo como nota`);
    }
  }

  if (!metadata.artist && subtitle) metadata.artist = subtitle;
  else if (subtitle) notes.push(subtitle);
  if (pendingNotes.length) notes.push(...pendingNotes);

  // Las secciones vacias (solo un nombre) se descartan.
  const kept = sections.filter((section) => section.lines.length > 0 || section.notes);
  kept.forEach((section, index) => (section.order = index));
  if (kept.length === 0) warnings.push('No se encontro letra ni acordes en el texto');

  return { metadata, content: { version: 1, sections: kept }, notes, warnings };
}

// ======================= Exportar =======================

const EXPORT_ENVIRONMENT: Record<SongSectionType, string> = {
  VERSE: 'verse',
  CHORUS: 'chorus',
  BRIDGE: 'bridge',
  INTRO: 'intro',
  PRE_CHORUS: 'pre_chorus',
  INTERLUDE: 'interlude',
  INSTRUMENTAL: 'instrumental',
  SOLO: 'solo',
  ENDING: 'ending',
  CUSTOM: 'custom',
};

type ExportableSection = { type: string; name: string; notes?: string | null; lines: Array<{ chords?: string; lyrics?: string }>; chords?: string[] };

/** Contenido de una version -> texto ChordPro. Importarlo de nuevo devuelve las mismas secciones y lineas. */
export function songToChordPro(metadata: ChordProMetadata, content: { sections: ExportableSection[] } | null | undefined): string {
  const out: string[] = [];
  const meta = (name: string, value: unknown) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') out.push(`{${name}: ${String(value).replace(/[{}\r\n]/g, ' ').trim()}}`);
  };
  meta('title', metadata.title);
  meta('artist', metadata.artist);
  meta('album', metadata.album);
  meta('year', metadata.year);
  meta('key', metadata.key);
  meta('tempo', metadata.tempo);
  meta('time', metadata.time);
  meta('capo', metadata.capo);

  for (const section of content?.sections ?? []) {
    const type = (SONG_SECTION_TYPES as readonly string[]).includes(section.type) ? (section.type as SongSectionType) : 'CUSTOM';
    const environment = EXPORT_ENVIRONMENT[type];
    out.push('', `{start_of_${environment}: ${section.name.replace(/[{}\r\n]/g, ' ').trim()}}`);
    for (const note of (section.notes ?? '').split('\n').filter((item) => item.trim())) out.push(`{comment: ${note.replace(/[{}]/g, ' ').trim()}}`);
    const lines = section.lines.length ? section.lines : section.chords?.length ? [{ chords: section.chords.join('   '), lyrics: '' }] : [];
    for (const line of lines) out.push(chordLineToInline(line.chords ?? '', line.lyrics ?? ''));
    out.push(`{end_of_${environment}}`);
  }
  return `${out.join('\n')}\n`;
}

// ======================= Pedido de importacion =======================

/** POST /api/songs/import/chordpro. Sin `songId` crea una cancion nueva; con `songId`, una version nueva de esa cancion. */
export const importChordProSchema = z.object({
  text: z
    .string({ message: 'Pega o elige un archivo ChordPro' })
    .max(CHORDPRO_MAX_LENGTH, `El archivo es demasiado grande (maximo ${CHORDPRO_MAX_LENGTH / 1000} mil caracteres)`)
    .refine((value) => value.trim().length > 0, 'El texto ChordPro esta vacio'),
  songId: z.string().trim().min(1).optional().nullable(),
  /** Correcciones de la vista previa (si el archivo no traia titulo, artista o tonalidad). */
  title: z.string().trim().max(200).optional().nullable(),
  artist: z.string().trim().max(200).optional().nullable(),
  key: z.string().trim().regex(KEY_PATTERN, 'Tonalidad invalida').optional().nullable(),
  versionName: z.string().trim().min(1).max(80).optional().nullable(),
});
export type ImportChordProInput = z.input<typeof importChordProSchema>;
export type ImportChordProData = z.output<typeof importChordProSchema>;

export type ImportChordProResult = {
  song: { id: string; title: string };
  version: { id: string; name: string };
  warnings: string[];
};
