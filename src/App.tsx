import { useState } from 'react';
import { Header } from './components/layout/Header';
import type { ViewMode } from './components/layout/Header';
import { ActionSetManager } from './components/views/ActionSetManager';
import { ActionManager } from './components/views/ActionManager';
import { KeyboardBinder } from './components/binders/KeyboardBinder';
import { DeckBinder } from './components/binders/DeckBinder';
import { ReviewTable } from './components/views/ReviewTable';

function App() {
  const [view, setView] = useState<ViewMode>('sets');

  return (
    <div className="h-screen bg-neutral-950 text-neutral-50 flex flex-col font-sans selection:bg-indigo-500/30 overflow-hidden">
      <Header view={view} setView={setView} />
      <main className="flex-1 overflow-hidden p-6 flex flex-col">
        {view === 'sets' && <ActionSetManager />}
        {view === 'actions' && <ActionManager />}
        {view === 'keyboard' && <KeyboardBinder />}
        {view === 'deck' && <DeckBinder />}
        {view === 'review' && <ReviewTable />}
      </main>
    </div>
  );
}

export default App;
