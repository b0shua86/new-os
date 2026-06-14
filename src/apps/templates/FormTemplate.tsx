import { useState } from 'react';
import { Send, Trash2, Inbox } from 'lucide-react';
import type { TemplateProps, TemplateField } from '../../os/types';
import { uid, cn, formatDate } from '../../os/utils';
import { Button } from '../../components/Button';

/** A submission: id + timestamp + one string value per field. */
type Submission = { id: string; submittedAt: string } & Record<string, string>;

interface FormData {
  submissions: Submission[];
}

const FALLBACK_FIELDS: TemplateField[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'message', label: 'Message', type: 'textarea' },
];

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60';

function emptyDraft(fields: TemplateField[]): Record<string, string> {
  const d: Record<string, string> = {};
  for (const f of fields) d[f.key] = '';
  return d;
}

function FieldInput({
  field,
  value,
  invalid,
  onChange,
}: {
  field: TemplateField;
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  const cls = cn(inputCls, invalid && 'border-rose-500/70 ring-1 ring-rose-500/40');
  if (field.type === 'textarea') {
    return (
      <textarea
        className={cn(cls, 'resize-none h-24')}
        placeholder={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select className={cls} value={value} onChange={(e) => onChange(e.target.value)}>
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
      className={cls}
      placeholder={field.label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function FormTemplate({ app, onChange }: TemplateProps) {
  const fields = (app.config.fields as TemplateField[] | undefined) ?? FALLBACK_FIELDS;
  const submissions = (app.data.submissions as Submission[] | undefined) ?? [];

  const [draft, setDraft] = useState<Record<string, string>>(() => emptyDraft(fields));
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Required = all text fields (and any matching the common "required" key names).
  const requiredKeys = fields.filter((f) => f.type === 'text').map((f) => f.key);

  const persist = (next: Submission[]) =>
    onChange({ submissions: next } satisfies FormData);

  const submit = () => {
    const nextErrors: Record<string, boolean> = {};
    for (const key of requiredKeys) {
      if ((draft[key] ?? '').trim() === '') nextErrors[key] = true;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const submission: Submission = {
      id: uid('sub'),
      submittedAt: new Date().toISOString(),
    };
    for (const f of fields) submission[f.key] = (draft[f.key] ?? '').trim();
    persist([submission, ...submissions]);
    setDraft(emptyDraft(fields));
    setErrors({});
  };

  const remove = (id: string) => persist(submissions.filter((s) => s.id !== id));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-100 bg-slate-950/40">
      <div className="flex-1 min-h-0 overflow-auto scroll-thin">
        {/* Form */}
        <div className="p-4 glass-strong border-b border-white/10">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {fields.map((f) => {
              const required = requiredKeys.includes(f.key);
              return (
                <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs text-slate-400 mb-1">
                    {f.label}
                    {required && <span className="text-rose-400"> *</span>}
                  </label>
                  <FieldInput
                    field={f}
                    value={draft[f.key] ?? ''}
                    invalid={Boolean(errors[f.key])}
                    onChange={(v) => {
                      setDraft((d) => ({ ...d, [f.key]: v }));
                      if (errors[f.key]) setErrors((er) => ({ ...er, [f.key]: false }));
                    }}
                  />
                  {errors[f.key] && (
                    <p className="mt-1 text-xs text-rose-400">{f.label} is required.</p>
                  )}
                </div>
              );
            })}
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="primary" size="md">
                <Send size={16} /> Submit
              </Button>
            </div>
          </form>
        </div>

        {/* Submissions */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Submissions</h3>
            <span className="text-xs text-slate-500">
              {submissions.length} {submissions.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {submissions.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-slate-400">
              <Inbox size={36} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium text-slate-300">No submissions yet</p>
              <p className="text-sm mt-1">Fill in the form above and submit to record an entry.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map((s) => (
                <div key={s.id} className="glass rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {fields.map((f) =>
                        s[f.key] ? (
                          <div key={f.key} className="text-sm">
                            <span className="text-slate-500">{f.label}: </span>
                            <span className="text-slate-200 whitespace-pre-wrap break-words">
                              {s[f.key]}
                            </span>
                          </div>
                        ) : null,
                      )}
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => remove(s.id)}
                      aria-label="Delete submission"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {formatDate(s.submittedAt)} ·{' '}
                    {new Date(s.submittedAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
