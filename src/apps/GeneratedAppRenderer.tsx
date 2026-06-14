import { useCallback } from 'react';
import { useOS } from '../os/store';
import type { AppComponentProps } from '../os/types';
import TrackerTemplate from './templates/TrackerTemplate';
import CollectionTemplate from './templates/CollectionTemplate';
import WritingTemplate from './templates/WritingTemplate';
import StudyTemplate from './templates/StudyTemplate';
import ChecklistTemplate from './templates/ChecklistTemplate';
import TimerTemplate from './templates/TimerTemplate';
import CounterTemplate from './templates/CounterTemplate';
import DashboardTemplate from './templates/DashboardTemplate';
import FormTemplate from './templates/FormTemplate';

interface GeneratedAppRendererProps extends AppComponentProps {
  generatedId: string;
}

/**
 * Renders a generated app by dispatching its `templateType` to the matching
 * trusted React template. Data flows down via `app`, and changes flow back up
 * through `onChange`, which persists to the store.
 */
export default function GeneratedAppRenderer({ generatedId }: GeneratedAppRendererProps) {
  const app = useOS((s) => s.generatedApps.find((g) => g.id === generatedId));
  const updateData = useOS((s) => s.updateGeneratedAppData);

  const onChange = useCallback(
    (data: Record<string, unknown>) => updateData(generatedId, data),
    [generatedId, updateData],
  );

  if (!app) {
    return (
      <div className="h-full w-full grid place-items-center text-slate-400 text-sm">
        This app no longer exists.
      </div>
    );
  }

  const props = { app, onChange };

  switch (app.templateType) {
    case 'tracker':
      return <TrackerTemplate {...props} />;
    case 'collection':
      return <CollectionTemplate {...props} />;
    case 'writing':
      return <WritingTemplate {...props} />;
    case 'study':
      return <StudyTemplate {...props} />;
    case 'checklist':
      return <ChecklistTemplate {...props} />;
    case 'timer':
      return <TimerTemplate {...props} />;
    case 'counter':
      return <CounterTemplate {...props} />;
    case 'dashboard':
      return <DashboardTemplate {...props} />;
    case 'form':
      return <FormTemplate {...props} />;
    default:
      return (
        <div className="h-full w-full grid place-items-center text-slate-400 text-sm">
          Unknown template.
        </div>
      );
  }
}
