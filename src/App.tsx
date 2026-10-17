import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react';
import { Shell } from './app/Shell';
import type { Dataset } from './domain/types';
import { loadDataset, type LoadResult } from './data/repository';
import { RouterProvider, useRouter } from './lib/router';
import { AppProvider } from './state/AppState';
import { ErrorBoundary, LoadingState } from './ui/Overlay';
import { DetailHost } from './views/details/DetailHost';
import { Overview } from './views/Overview';

const OrsView = lazy(() => import('./views/OrsView'));
const MatrixView = lazy(() => import('./views/MatrixView'));
const DependencyView = lazy(() => import('./views/DependencyView'));
const PipelineView = lazy(() => import('./views/PipelineView'));
const CultureView = lazy(() => import('./views/CultureView'));
const RiskView = lazy(() => import('./views/RiskView'));
const ScenarioView = lazy(() => import('./views/ScenarioView'));
const ActionsView = lazy(() => import('./views/ActionsView'));
const ModelView = lazy(() => import('./views/ModelView'));
const ReportView = lazy(() => import('./views/ReportView'));
const AboutView = lazy(() => import('./views/AboutView'));

const ROUTES: Record<string, { title: string; render: () => ReactNode }> = {
  '/': { title: 'Direktionsoverblik', render: () => <Overview /> },
  '/ors': { title: 'Organizational Resilience Score™', render: () => <OrsView /> },
  '/matrix': { title: 'Future Value Matrix™', render: () => <MatrixView /> },
  '/afhaengigheder': { title: 'Strategic Dependency Mapper™', render: () => <DependencyView /> },
  '/pipeline': { title: 'Leadership Pipeline Engine™', render: () => <PipelineView /> },
  '/kultur': { title: 'Culture Infrastructure Map™', render: () => <CultureView /> },
  '/risici': { title: 'Human Capital Risk Dashboard™', render: () => <RiskView /> },
  '/scenarier': { title: 'Scenariesimulering', render: () => <ScenarioView /> },
  '/handlinger': { title: 'Handlingsplan', render: () => <ActionsView /> },
  '/model': { title: 'Modelkatalog', render: () => <ModelView /> },
  '/rapport': { title: 'Bestyrelsesrapport', render: () => <ReportView /> },
  '/om': { title: 'Om demonstrationen', render: () => <AboutView /> },
};

function NotFound() {
  const { navigate } = useRouter();
  return (
    <div className="panel max-w-xl p-6">
      <p className="eyebrow">Siden findes ikke</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold">Vi kunne ikke finde siden</h1>
      <p className="mt-2 text-sm text-ink-2">Linket kan være forældet eller skrevet forkert.</p>
      <button type="button" className="btn-primary mt-4" onClick={() => navigate('/')}>
        Gå til direktionsoverblikket
      </button>
    </div>
  );
}

function Routes() {
  const { route } = useRouter();
  const r = ROUTES[route.path];
  useEffect(() => {
    document.title = `${r ? r.title : 'Siden findes ikke'} · Human Capital Sustainability™`;
  }, [r]);
  useEffect(() => {
    // Flyt fokus til indholdet ved sideskift (skærmlæsere annoncerer den nye side).
    document.getElementById('indhold')?.focus({ preventScroll: true });
  }, [route.path]);
  return (
    <Shell>
      <ErrorBoundary key={route.path} label={r?.title ?? 'Siden'}>
        <Suspense fallback={<LoadingState label="Indlæser modul …" />}>{r ? r.render() : <NotFound />}</Suspense>
      </ErrorBoundary>
      <ErrorBoundary label="Detaljevisningen">
        <DetailHost />
      </ErrorBoundary>
    </Shell>
  );
}

function DataGate() {
  const [state, setState] = useState<LoadResult | null>(null);
  useEffect(() => {
    let alive = true;
    loadDataset().then((r) => alive && setState(r));
    return () => {
      alive = false;
    };
  }, []);
  if (!state) return <LoadingState label="Indlæser datagrundlag …" />;
  if (!state.ok) {
    return (
      <div role="alert" className="mx-auto mt-16 max-w-2xl panel p-6">
        <p className="eyebrow">Fejl i datagrundlaget</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold">Data kunne ikke indlæses</h1>
        <p className="mt-2 text-sm text-ink-2">{state.error}</p>
        {state.issues.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-2xs text-ink-2">
            {state.issues.slice(0, 20).map((i, n) => (
              <li key={n}>
                {i.entity} {i.id}: {i.message}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn mt-4" onClick={() => window.location.reload()}>
          Prøv igen
        </button>
      </div>
    );
  }
  return <Loaded data={state.data} />;
}

function Loaded({ data }: { data: Dataset }) {
  return (
    <AppProvider data={data}>
      <Routes />
    </AppProvider>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <DataGate />
    </RouterProvider>
  );
}
