import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Table2 } from 'lucide-react';
import type { TemplateProps, TemplateField } from '../../os/types';
import { uid, cn, todayISO } from '../../os/utils';
import { Button } from '../../components/Button';

/** A single tracker row: an id plus a value per configured field. */
type Row = { id: string } & Record<string, string | number>;

interface TrackerData {
  rows: Row[];
}

const FALLBACK_FIELDS: TemplateField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'value', label: 'Value', type: 'text' },
  { key: 'date', label: 'Date', type: 'date' },
];

/** Build an empty draft, defaulting date fields to today. */
function emptyDraft(fields: TemplateField[]): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const f of fields) {
    draft[f.key] = f.type === 'date' ? todayISO() : '';
  }
  return draft;
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60';

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === 'textarea') {
    return (
      <textarea
        className={cn(inputCls, 'resize-none h-16')}
        placeholder={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" className="bg-slate-900">
          {field.label}…
        </option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt} className="bg-slate-900">
            {opt}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      className={inputCls}
      placeholder={field.label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function TrackerTemplate({ app, onChange }: TemplateProps) {
  const fields = (app.config.fields as TemplateField[] | undefined) ?? FALLBACK_FIELDS;
  const rows = (app.data.rows as Row[] | undefined) ?? [];

  const [draft, setDraft] = useState<Record<string, string>>(() => emptyDraft(fields));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const numericKeys = useMemo(
    () => fields.filter((f) => f.type === 'number').map((f) => f.key),
    [fields],
  );

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const key of numericKeys) {
      t[key] = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
    }
    return t;
  }, [rows, numericKeys]);

  const persist = (next: Row[]) => onChange({ rows: next } satisfies TrackerData);

  const coerce = (field: TemplateField, raw: string): string | number =>
    field.type === 'number' ? (raw === '' ? 0 : Number(raw)) : raw;

  const addRow = () => {
    const hasContent = fields.some((f) => String(draft[f.key] ?? '').trim() !== '');
    if (!hasContent) return;
    const row: Row = { id: uid('row') };
    for (const f of fields) row[f.key] = coerce(f, draft[f.key] ?? '');
    persist([...rows, row]);
    setDraft(emptyDraft(fields));
  };

  const startEdit = (row: Row) => {
    const d: Record<string, string> = {};
    for (const f of fields) d[f.key] = String(row[f.key] ?? '');
    setEditDraft(d);
    setEditingId(row.id);
  };

  const saveEdit = () => {
    if (!editingId) return;
    persist(
      rows.map((r) => {
        if (r.id !== editingId) return r;
        const updated: Row = { id: r.id };
        for (const f of fields) updated[f.key] = coerce(f, editDraft[f.key] ?? '');
        return updated;
      }),
    );
    setEditingId(null);
  };

  const deleteRow = (id: string) => {
    if (editingId === id) setEditingId(null);
    persist(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      {/* Add row form */}
      <div className="shrink-0 p-4 glass-strong border-b border-white/10">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr))` }}
        >
          {fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={draft[f.key] ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="primary" size="sm" onClick={addRow}>
            <Plus size={16} /> Add row
          </Button>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 min-h-0 overflow-auto scroll-thin">
        {rows.length === 0 ? (
          <div className="h-full grid place-items-center text-center px-6">
            <div className="text-slate-400">
              <Table2 size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-300">No entries yet</p>
              <p className="text-sm mt-1">Fill in the fields above and add your first row.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-xl">
              <tr className="text-left text-slate-400">
                {fields.map((f) => (
                  <th key={f.key} className="px-4 py-2.5 font-medium border-b border-white/10">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-2.5 font-medium border-b border-white/10 w-px" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    {fields.map((f) => (
                      <td key={f.key} className="px-4 py-2 border-b border-white/5 align-top">
                        {isEditing ? (
                          <FieldInput
                            field={f}
                            value={editDraft[f.key] ?? ''}
                            onChange={(v) => setEditDraft((d) => ({ ...d, [f.key]: v }))}
                          />
                        ) : f.type === 'date' ? (
                          <span className="text-slate-300">
                            {String(row[f.key] ?? '') || '—'}
                          </span>
                        ) : f.type === 'number' ? (
                          <span className="font-mono tabular-nums text-slate-200">
                            {String(row[f.key] ?? 0)}
                          </span>
                        ) : (
                          <span className="text-slate-200 whitespace-pre-wrap">
                            {String(row[f.key] ?? '') || '—'}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 border-b border-white/5">
                      <div className="flex items-center gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <Button size="sm" variant="primary" onClick={saveEdit} aria-label="Save">
                              <Check size={15} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              aria-label="Cancel"
                            >
                              <X size={15} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(row)}
                              aria-label="Edit"
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => deleteRow(row.id)}
                              aria-label="Delete"
                            >
                              <Trash2 size={15} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {numericKeys.length > 0 && (
              <tfoot className="sticky bottom-0 bg-slate-900/85 backdrop-blur-xl">
                <tr className="text-slate-300 font-medium">
                  {fields.map((f, i) => (
                    <td key={f.key} className="px-4 py-2.5 border-t border-white/10">
                      {i === 0 && !numericKeys.includes(f.key) ? (
                        <span className="text-slate-400">Totals</span>
                      ) : numericKeys.includes(f.key) ? (
                        <span className="font-mono tabular-nums text-accent">
                          {totals[f.key].toLocaleString()}
                        </span>
                      ) : null}
                    </td>
                  ))}
                  <td className="border-t border-white/10" />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      <div className="shrink-0 px-4 py-2 text-xs text-slate-500 border-t border-white/10 glass-strong">
        {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
      </div>
    </div>
  );
}
