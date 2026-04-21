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
      <main className="flex-1 overflow-hidden p-6 flex flex-col relative">
        <div className={`flex-1 flex flex-col overflow-hidden ${view === 'sets' ? '' : 'hidden'}`}>
          <ActionSetManager />
        </div>
        <div className={`flex-1 flex flex-col overflow-hidden ${view === 'actions' ? '' : 'hidden'}`}>
          <ActionManager />
        </div>
        <div className={`flex-1 flex flex-col overflow-hidden ${view === 'keyboard' ? '' : 'hidden'}`}>
          <KeyboardBinder />
        </div>
        <div className={`flex-1 flex flex-col overflow-hidden ${view === 'deck' ? '' : 'hidden'}`}>
          <DeckBinder />
        </div>
        <div className={`flex-1 flex flex-col overflow-hidden ${view === 'review' ? '' : 'hidden'}`}>
          <ReviewTable />
        </div>
      </main>
    </div>
  );
}

export default App;
