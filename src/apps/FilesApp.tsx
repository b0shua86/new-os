import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronRight,
  FilePlus2,
  FolderClosed,
  Grid2x2,
  Home,
  LayoutGrid,
  Save,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { AppIcon } from '../components/Icon';
import { useOS } from '../os/store';
import type { GeneratedApp, Note, VFile, VFileType } from '../os/types';
import { cn, formatDate } from '../os/utils';

/** The selectable left-pane location. Folder locations carry the folder name. */
type Location =
  | { kind: 'home' }
  | { kind: 'folder'; name: string }
  | { kind: 'apps' }
  | { kind: 'notes' };

const TYPE_GLYPH: Record<VFileType, string> = {
  folder: '📁',
  text: '📄',
  image: '🖼️',
  note: '📝',
  app: '🧩',
};

/**
 * Files — a virtual file manager that composes several store sources:
 * virtual files (by folder), generated apps, and notes.
 */
export default function FilesApp() {
  const files = useOS((s) => s.files);
  const generatedApps = useOS((s) => s.generatedApps);
  const notes = useOS((s) => s.notes);
  const createFile = useOS((s) => s.createFile);
  const updateFile = useOS((s) => s.updateFile);
  const deleteFile = useOS((s) => s.deleteFile);
  const openGeneratedApp = useOS((s) => s.openGeneratedApp);
  const openApp = useOS((s) => s.openApp);

  const [location, setLocation] = useState<Location>({ kind: 'home' });

  // Modals & transient editing state.
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [editing, setEditing] = useState<VFile | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<VFile | null>(null);

  // Top-level folders (folders that live at the root) become sidebar locations.
  const rootFolders = useMemo(
    () => files.filter((f) => f.type === 'folder' && f.folder === '/'),
    [files],
  );

  // The folder name represented by the current location ('/' for Home).
  const currentFolderName =
    location.kind === 'home' ? '/' : location.kind === 'folder' ? location.name : null;

  // Files (and sub-folders) inside the current folder location.
  const folderItems = useMemo(() => {
    if (currentFolderName === null) return [];
    return files
      .filter((f) => f.folder === currentFolderName)
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [files, currentFolderName]);

  const itemCount =
    location.kind === 'apps'
      ? generatedApps.length
      : location.kind === 'notes'
        ? notes.length
        : folderItems.length;

  const locationLabel =
    location.kind === 'home'
      ? 'Home'
      : location.kind === 'folder'
        ? location.name
        : location.kind === 'apps'
          ? 'Apps'
          : 'Notes';

  const openItem = (file: VFile) => {
    if (file.type === 'folder') {
      setLocation({ kind: 'folder', name: file.name });
    } else if (file.type === 'text') {
      setEditing(file);
      setEditDraft(file.content ?? '');
    }
  };

  const confirmNewFile = () => {
    const name = newFileName.trim();
    if (!name || currentFolderName === null) return;
    createFile({
      name: /\.[^.]+$/.test(name) ? name : `${name}.txt`,
      type: 'text',
      folder: currentFolderName,
      content: '',
    });
    setNewFileName('');
    setNewFileOpen(false);
  };

  const saveEdit = () => {
    if (!editing) return;
    updateFile(editing.id, { content: editDraft });
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteFile(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-950/40 text-slate-100">
      <div className="flex flex-1 min-h-0">
        {/* ---- Sidebar ---- */}
        <aside className="w-56 shrink-0 flex flex-col border-r border-white/10 bg-black/20 overflow-auto scroll-thin">
          <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Locations
          </div>
          <nav className="px-2 pb-3 space-y-0.5">
            <SidebarItem
              icon={<Home size={15} />}
              label="Home"
              active={location.kind === 'home'}
              onClick={() => setLocation({ kind: 'home' })}
            />
            {rootFolders.map((folder) => (
              <SidebarItem
                key={folder.id}
                icon={<FolderClosed size={15} />}
                label={folder.name}
                active={location.kind === 'folder' && location.name === folder.name}
                onClick={() => setLocation({ kind: 'folder', name: folder.name })}
              />
            ))}
            <div className="my-2 mx-2 border-t border-white/10" />
            <SidebarItem
              icon={<LayoutGrid size={15} />}
              label="Apps"
              count={generatedApps.length}
              active={location.kind === 'apps'}
              onClick={() => setLocation({ kind: 'apps' })}
            />
            <SidebarItem
              icon={<StickyNote size={15} />}
              label="Notes"
              count={notes.length}
              active={location.kind === 'notes'}
              onClick={() => setLocation({ kind: 'notes' })}
            />
          </nav>
        </aside>

        {/* ---- Main pane ---- */}
        <section className="flex-1 min-w-0 flex flex-col">
          {/* Breadcrumb / toolbar */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-1.5 min-w-0 text-sm">
              <Grid2x2 size={15} className="text-accent shrink-0" />
              <button
                className="text-slate-300 hover:text-slate-100 transition-colors"
                onClick={() => setLocation({ kind: 'home' })}
              >
                Home
              </button>
              {location.kind !== 'home' && (
                <>
                  <ChevronRight size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate font-medium text-slate-100">
                    {locationLabel}
                  </span>
                </>
              )}
              <span className="ml-2 shrink-0 text-xs text-slate-500">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </span>
            </div>
            {currentFolderName !== null && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setNewFileName('');
                  setNewFileOpen(true);
                }}
              >
                <FilePlus2 size={14} />
                New text file
              </Button>
            )}
          </div>

          {/* Grid */}
          <div className="flex-1 min-h-0 overflow-auto scroll-thin p-5">
            {location.kind === 'apps' ? (
              <AppsView
                apps={generatedApps}
                onOpen={(id) => openGeneratedApp(id)}
              />
            ) : location.kind === 'notes' ? (
              <NotesView notes={notes} onOpen={() => openApp('notes')} />
            ) : (
              <FolderView
                items={folderItems}
                generatedApps={generatedApps}
                onOpen={openItem}
                onDelete={(file) => setPendingDelete(file)}
              />
            )}
          </div>
        </section>
      </div>

      {/* New text file */}
      <Modal
        open={newFileOpen}
        onClose={() => setNewFileOpen(false)}
        title="New text file"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewFileOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmNewFile}
              disabled={!newFileName.trim()}
            >
              Create
            </Button>
          </>
        }
      >
        <label className="block">
          <span className="text-xs text-slate-400">
            File name (in {locationLabel})
          </span>
          <input
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmNewFile();
            }}
            placeholder="notes.txt"
            className="selectable mt-1.5 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </label>
      </Modal>

      {/* Text editor */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit — ${editing.name}` : 'Edit'}
        className="w-[min(92vw,640px)]"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEdit}>
              <Save size={14} />
              Save
            </Button>
          </>
        }
      >
        <textarea
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          placeholder="Empty file…"
          className="selectable h-72 w-full resize-none overflow-auto scroll-thin rounded-lg bg-black/30 border border-white/10 p-3 text-sm leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60"
        />
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete file"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Delete{' '}
          <span className="font-semibold text-slate-100">
            “{pendingDelete?.name}”
          </span>
          ? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/* ------------------------------- Sidebar item ------------------------------ */

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

function SidebarItem({ icon, label, active, count, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors border',
        active
          ? 'bg-accent/20 border-accent/40 text-slate-100'
          : 'bg-transparent border-transparent text-slate-300 hover:bg-white/5',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-accent' : 'text-slate-400')}>
        {icon}
      </span>
      <span className="truncate flex-1 text-left">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="shrink-0 text-[10px] text-slate-400">{count}</span>
      )}
    </button>
  );
}

/* --------------------------------- Tile ----------------------------------- */

interface TileProps {
  glyph: string;
  label: string;
  meta?: string;
  onOpen: () => void;
  onDelete?: () => void;
}

function Tile({ glyph, label, meta, onOpen, onDelete }: TileProps) {
  return (
    <div className="group relative">
      <button
        onDoubleClick={onOpen}
        className="w-full flex flex-col items-center gap-2 rounded-xl border border-transparent p-3 text-center transition-colors hover:bg-white/5 hover:border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        title={label}
      >
        <AppIcon glyph={glyph} size={30} tile />
        <span className="w-full truncate text-xs font-medium text-slate-200">
          {label}
        </span>
        {meta && (
          <span className="w-full truncate text-[10px] text-slate-400">{meta}</span>
        )}
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute right-1.5 top-1.5 hidden rounded-md bg-black/40 p-1 text-slate-300 hover:bg-rose-500/80 hover:text-white group-hover:block"
          aria-label={`Delete ${label}`}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------- Empty state ------------------------------ */

function EmptyState({ glyph, text }: { glyph: string; text: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-slate-400">
      <span className="text-4xl opacity-70 select-none">{glyph}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

const GRID =
  'grid gap-2 grid-cols-[repeat(auto-fill,minmax(108px,1fr))]';

/* ------------------------------- Folder view ------------------------------ */

interface FolderViewProps {
  items: VFile[];
  generatedApps: GeneratedApp[];
  onOpen: (file: VFile) => void;
  onDelete: (file: VFile) => void;
}

function FolderView({ items, generatedApps, onOpen, onDelete }: FolderViewProps) {
  if (items.length === 0) {
    return <EmptyState glyph="📂" text="This folder is empty." />;
  }
  return (
    <div className={GRID}>
      {items.map((file) => {
        // For 'app' files, prefer the matching generated app's emoji icon.
        let glyph = TYPE_GLYPH[file.type];
        if (file.type === 'app') {
          const app = generatedApps.find((g) => g.name === file.name);
          if (app) glyph = app.icon;
        }
        return (
          <Tile
            key={file.id}
            glyph={glyph}
            label={file.name}
            meta={file.type === 'folder' ? 'Folder' : formatDate(file.createdAt)}
            onOpen={() => onOpen(file)}
            onDelete={file.type === 'folder' ? undefined : () => onDelete(file)}
          />
        );
      })}
    </div>
  );
}

/* -------------------------------- Apps view ------------------------------- */

function AppsView({
  apps,
  onOpen,
}: {
  apps: GeneratedApp[];
  onOpen: (id: string) => void;
}) {
  if (apps.length === 0) {
    return (
      <EmptyState
        glyph="🧩"
        text="No generated apps yet. Create one from the launcher."
      />
    );
  }
  return (
    <div className={GRID}>
      {apps.map((app) => {
        const records = recordCount(app);
        return (
          <Tile
            key={app.id}
            glyph={app.icon}
            label={app.name}
            meta={`${app.templateType} · ${records} item${records === 1 ? '' : 's'}`}
            onOpen={() => onOpen(app.id)}
          />
        );
      })}
    </div>
  );
}

/** Best-effort count of stored records for a generated app. */
function recordCount(app: GeneratedApp): number {
  let total = 0;
  for (const value of Object.values(app.data)) {
    if (Array.isArray(value)) total += value.length;
  }
  return total;
}

/* ------------------------------- Notes view ------------------------------- */

function NotesView({ notes, onOpen }: { notes: Note[]; onOpen: () => void }) {
  if (notes.length === 0) {
    return <EmptyState glyph="📝" text="No notes yet. Open the Notes app to write one." />;
  }
  const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="space-y-1.5">
      {sorted.map((note) => (
        <button
          key={note.id}
          onDoubleClick={onOpen}
          className="w-full flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          title="Double-click to open in Notes"
        >
          <AppIcon glyph="📝" size={20} />
          <span className="flex-1 min-w-0">
            <span className="block truncate text-sm font-medium text-slate-100">
              {note.title.trim() || 'Untitled note'}
            </span>
            <span className="block truncate text-xs text-slate-400">
              {note.body.trim().replace(/\s+/g, ' ') || 'No additional text'}
            </span>
          </span>
          <span className="shrink-0 text-[10px] text-slate-400">
            {formatDate(note.updatedAt)}
          </span>
        </button>
      ))}
    </div>
  );
}
