import { createElement } from 'react';
import { useOS } from './store';
import { APP_COMPONENTS } from './appRegistry';
import { WindowFrame } from './Window';
import GeneratedAppRenderer from '../apps/GeneratedAppRenderer';

/** Renders the content for one window based on its appId. */
function WindowContent({ windowId }: { windowId: string }) {
  const win = useOS((s) => s.windows.find((w) => w.id === windowId));
  if (!win) return null;

  if (win.generatedId) {
    return <GeneratedAppRenderer windowId={windowId} generatedId={win.generatedId} />;
  }

  const Comp = APP_COMPONENTS[win.appId];
  if (!Comp) {
    return (
      <div className="p-6 text-sm text-slate-400">
        App “{win.appId}” could not be found.
      </div>
    );
  }
  return createElement(Comp, { windowId });
}

/** Renders every open (non-minimized) window. */
export function WindowManager() {
  const ids = useOS((s) => s.windows.map((w) => w.id).join(','));
  const idList = ids ? ids.split(',') : [];

  return (
    <>
      {idList.map((id) => (
        <WindowFrame key={id} windowId={id}>
          <WindowContent windowId={id} />
        </WindowFrame>
      ))}
    </>
  );
}
