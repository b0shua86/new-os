/**
 * App generation system.
 *
 * SAFETY: We never turn user text into executable code. Instead, a search term
 * is matched against a registry of rules that pick a trusted template type and
 * a field configuration. The resulting JSON metadata is rendered by a trusted
 * React component (see GeneratedAppRenderer). This keeps generation entirely
 * sandboxed while still feeling like "the OS built me an app".
 *
 * The interface here is intentionally swappable: `previewGeneration` could be
 * backed by a local or remote AI model in the future without changing callers.
 */
import type {
  GeneratedApp,
  GenerationPreview,
  TemplateField,
  TemplateType,
} from './types';
import { uid, titleCase } from './utils';

interface GenerationRule {
  /** Keywords that route a query to this template. */
  match: string[];
  templateType: TemplateType;
  icon: string;
  description: string;
  fields?: TemplateField[];
  /** Extra non-field config merged into the generated app. */
  config?: Record<string, unknown>;
  /** Seed data so a freshly generated app isn't empty. */
  seed?: (name: string) => Record<string, unknown>;
}

const RULES: GenerationRule[] = [
  {
    match: ['budget', 'expense', 'spending', 'finance', 'money', 'cost', 'invoice', 'bill'],
    templateType: 'tracker',
    icon: '💰',
    description: 'Track entries with amounts, categories and dates.',
    fields: [
      { key: 'item', label: 'Item', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'number' },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: ['General', 'Food', 'Bills', 'Travel', 'Fun', 'Health'],
      },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    match: ['habit', 'fitness', 'workout', 'exercise', 'water', 'sleep', 'mood', 'weight'],
    templateType: 'tracker',
    icon: '📈',
    description: 'Log daily entries and watch your streak grow.',
    fields: [
      { key: 'activity', label: 'Activity', type: 'text' },
      { key: 'amount', label: 'Count', type: 'number' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['Done', 'Skipped', 'Partial'],
      },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    match: ['recipe', 'cookbook', 'meal', 'cooking'],
    templateType: 'collection',
    icon: '🍳',
    description: 'A collection of recipes with ingredients and steps.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'ingredients', label: 'Ingredients', type: 'textarea' },
      { key: 'instructions', label: 'Instructions', type: 'textarea' },
      {
        key: 'rating',
        label: 'Rating',
        type: 'select',
        options: ['★', '★★', '★★★', '★★★★', '★★★★★'],
      },
    ],
  },
  {
    match: ['collection', 'library', 'catalog', 'inventory', 'book', 'movie', 'game', 'wishlist', 'contacts', 'directory'],
    templateType: 'collection',
    icon: '🗂️',
    description: 'Store and browse a collection of records.',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      {
        key: 'tag',
        label: 'Tag',
        type: 'select',
        options: ['New', 'In progress', 'Done', 'Favorite'],
      },
    ],
  },
  {
    match: ['journal', 'diary', 'blog', 'writing', 'log', 'gratitude'],
    templateType: 'writing',
    icon: '📔',
    description: 'A private journal of dated entries.',
  },
  {
    match: ['flashcard', 'flashcards', 'study', 'quiz', 'vocab', 'vocabulary', 'learn', 'memorize', 'deck'],
    templateType: 'study',
    icon: '🃏',
    description: 'Flip-card study deck with question and answer.',
    seed: () => ({
      cards: [
        { id: uid(), question: 'What is the capital of France?', answer: 'Paris' },
        { id: uid(), question: '2 + 2 = ?', answer: '4' },
      ],
    }),
  },
  {
    match: ['todo', 'task', 'checklist', 'grocery', 'shopping', 'packing', 'chores', 'list'],
    templateType: 'checklist',
    icon: '✅',
    description: 'A simple checklist you can tick off.',
  },
  {
    match: ['timer', 'pomodoro', 'countdown', 'stopwatch', 'alarm'],
    templateType: 'timer',
    icon: '⏱️',
    description: 'A countdown timer and stopwatch.',
  },
  {
    match: ['counter', 'tally', 'dice', 'roll', 'random', 'score', 'clicker'],
    templateType: 'counter',
    icon: '🎲',
    description: 'Tally counters and a dice / random roller.',
  },
  {
    match: ['dashboard', 'overview', 'stats', 'monitor', 'widgets', 'home', 'calendar', 'clock'],
    templateType: 'dashboard',
    icon: '📊',
    description: 'An at-a-glance dashboard of widgets.',
  },
  {
    match: ['form', 'survey', 'feedback', 'contact', 'signup', 'calculator', 'converter'],
    templateType: 'form',
    icon: '🧾',
    description: 'A small form / input tool that saves submissions.',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'message', label: 'Message', type: 'textarea' },
    ],
  },
];

/** Fallback rule when nothing matches — a flexible generic tracker. */
const DEFAULT_RULE: GenerationRule = {
  match: [],
  templateType: 'tracker',
  icon: '🧩',
  description: 'A flexible tracker for whatever you need.',
  fields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'value', label: 'Value', type: 'text' },
    { key: 'date', label: 'Date', type: 'date' },
  ],
};

const ICON_HINTS: Record<string, string> = {
  music: '🎵',
  weather: '🌤️',
  plant: '🌱',
  pet: '🐾',
  travel: '✈️',
  fitness: '💪',
  reading: '📚',
  password: '🔐',
  note: '📝',
};

function normalize(term: string): string {
  return term.trim().toLowerCase();
}

function pickRule(term: string): GenerationRule {
  const n = normalize(term);
  if (!n) return DEFAULT_RULE;
  // Prefer the rule with a keyword contained in the query.
  for (const rule of RULES) {
    if (rule.match.some((kw) => n.includes(kw))) return rule;
  }
  return DEFAULT_RULE;
}

function pickIcon(term: string, fallback: string): string {
  const n = normalize(term);
  for (const [kw, icon] of Object.entries(ICON_HINTS)) {
    if (n.includes(kw)) return icon;
  }
  return fallback;
}

/** Default empty data shape for each template type. */
function defaultData(type: TemplateType): Record<string, unknown> {
  switch (type) {
    case 'tracker':
      return { rows: [] };
    case 'collection':
      return { items: [] };
    case 'writing':
      return { entries: [] };
    case 'study':
      return { cards: [] };
    case 'checklist':
      return { items: [] };
    case 'timer':
      return { lastSeconds: 300 };
    case 'counter':
      return { counters: [{ id: uid(), label: 'Counter', value: 0 }], lastRoll: null };
    case 'dashboard':
      return { note: '' };
    case 'form':
      return { submissions: [] };
    default:
      return {};
  }
}

/**
 * Preview what would be generated for a term — used by the launcher to show a
 * "Create app" card before the user commits.
 */
export function previewGeneration(term: string): GenerationPreview {
  const rule = pickRule(term);
  const name = titleCase(term) || 'Untitled App';
  return {
    name,
    icon: pickIcon(term, rule.icon),
    templateType: rule.templateType,
    description: rule.description,
    config: { fields: rule.fields, ...(rule.config ?? {}) },
  };
}

/** Build a full generated-app record for a search term. */
export function generateApp(term: string): GeneratedApp {
  const rule = pickRule(term);
  const name = titleCase(term) || 'Untitled App';
  const seedData = rule.seed ? rule.seed(name) : {};
  return {
    id: uid('gen'),
    name,
    description: rule.description,
    icon: pickIcon(term, rule.icon),
    templateType: rule.templateType,
    createdAt: new Date().toISOString(),
    config: { fields: rule.fields, ...(rule.config ?? {}) },
    data: { ...defaultData(rule.templateType), ...seedData },
  };
}

/** Human-readable label for a template type (used in App Studio etc). */
export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  tracker: 'Tracker',
  collection: 'Collection / Database',
  writing: 'Writing',
  study: 'Flashcards / Study',
  checklist: 'Checklist',
  timer: 'Timer',
  counter: 'Counter / Dice',
  dashboard: 'Dashboard',
  form: 'Form',
};

export const TEMPLATE_TYPES = Object.keys(TEMPLATE_LABELS) as TemplateType[];
