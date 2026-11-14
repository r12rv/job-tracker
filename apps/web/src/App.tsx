import { lazy, Suspense } from 'react';
import { EmptyState } from './components/layout/EmptyState';
import { Header } from './components/layout/Header';
import { Button } from './components/ui/Button';
import { authClient } from './lib/auth-client';
import { TrackerSkeleton } from './components/tracker/TrackerSkeleton';
import { LandingPage } from './pages/LandingPage';

// Трекер (форма, клиент API, валидация) грузится только после входа: гостю на стартовой странице он не нужен
const TrackerPage = lazy(() => import('./pages/TrackerPage').then((module) => ({ default: module.TrackerPage })));

/** Пока загружается код трекера — та же заглушка, что и при загрузке вакансий, без скачков раскладки */
function TrackerFallback() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <TrackerSkeleton />
      </main>
    </>
  );
}

export default function App() {
  const { data: session, isPending, isRefetching, error, refetch } = authClient.useSession();

  const renderPage = () => {
    // Пока проверяется сессия, показываем только шапку — без мелькания экрана входа
    if (isPending) {
      return (
        <>
          <Header />
          <div className="flex-1" />
        </>
      );
    }

    // key: при смене аккаунта состояние страницы (фильтры, открытые окна) сбрасывается
    if (session) {
      return (
        <Suspense fallback={<TrackerFallback />}>
          <TrackerPage key={session.user.id} userId={session.user.id} />
        </Suspense>
      );
    }

    // Сервер не ответил — это не «вы не вошли»: не предлагаем войти заново, а даём повторить
    if (error) {
      return (
        <>
          <Header />
          <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-12 sm:px-6">
            <div className="w-full">
              <EmptyState
                title="Сервер недоступен"
                description="Не удалось связаться с сервером. Проверьте подключение к интернету и попробуйте ещё раз."
                action={
                  <Button variant="secondary" disabled={isRefetching} onClick={() => { void refetch(); }}>
                    {isRefetching ? 'Подключение…' : 'Повторить'}
                  </Button>
                }
              />
            </div>
          </main>
        </>
      );
    }

    return <LandingPage />;
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {renderPage()}

      <footer className="mx-auto flex w-full max-w-7xl justify-center px-4 pb-6 text-xs text-slate-500 sm:px-6">
        <a href="/privacy.html" className="hover:text-slate-700 hover:underline">
          Политика конфиденциальности
        </a>
      </footer>
    </div>
  );
}
