import type { ReactNode } from 'react';
import { SignInButton } from '../components/auth/SignInButton';
import { LiveDemo } from '../components/landing/LiveDemo';
import { Header } from '../components/layout/Header';
import { BoardIcon, ChartIcon, DevicesIcon, HistoryIcon } from '../components/ui/Icons';

interface Feature {
  icon: ReactNode;
  title: string;
  text: string;
}

const FEATURES: Feature[] = [
  {
    icon: <BoardIcon className="size-5" />,
    title: 'Канбан и таблица',
    text: 'Доска по этапам, чтобы видеть всю картину, и таблица, чтобы искать и сравнивать.',
  },
  {
    icon: <HistoryIcon className="size-5" />,
    title: 'История каждого отклика',
    text: 'Каждая смена этапа сохраняется с датой: видно, как долго шёл путь от отклика до оффера.',
  },
  {
    icon: <ChartIcon className="size-5" />,
    title: 'Статистика воронки',
    text: 'Сколько откликов дошли до собеседования и какой процент приглашений — без таблиц и формул.',
  },
  {
    icon: <DevicesIcon className="size-5" />,
    title: 'С любого устройства',
    text: 'Вход через Google, данные хранятся в аккаунте: начали на компьютере — продолжили с телефона.',
  },
];

/** Стартовая страница для гостя: что это за сервис, живое демо и вход */
export function LandingPage() {
  return (
    <>
      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20 sm:pb-14">
          <p className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-600/15 ring-inset">
            Для тех, кто ищет работу
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl">
            Все отклики на вакансии — в одном месте
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-slate-600 sm:text-lg">
            Записывайте, куда откликнулись, двигайте вакансии по этапам от отклика до оффера и смотрите,
            сколько откликов превращаются в собеседования.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SignInButton />
            <a
              href="#demo"
              className="inline-flex h-11 items-center rounded-lg px-4 text-base font-medium text-slate-700 hover:bg-slate-100"
            >
              Посмотреть демо ↓
            </a>
          </div>
          <p className="mt-3 text-sm text-slate-500">Бесплатно. Нужен только аккаунт Google.</p>
        </section>

        <section id="demo" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mb-5 text-center">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Попробуйте прямо здесь</h2>
            <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
              Это настоящий интерфейс с примерами: меняйте статусы, переключайте вид, ищите по компании.
            </p>
          </div>
          <LiveDemo />
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  {feature.icon}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl font-semibold text-balance text-slate-900 sm:text-3xl">
            Готовы навести порядок в откликах?
          </h2>
          <p className="mt-3 text-slate-600">Вход займёт пару секунд — и можно добавлять первую вакансию.</p>
          <SignInButton className="mt-6" label="Начать бесплатно" />
        </section>
      </main>
    </>
  );
}
