/** Заглушка на время первой загрузки: повторяет раскладку страницы, чтобы ничего не прыгало */
export function TrackerSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Загрузка вакансий">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[106px] animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="h-10 w-56 animate-pulse rounded-lg bg-slate-200/70" />
      <div className="h-72 animate-pulse rounded-2xl bg-slate-200/70" />
    </div>
  );
}
