export function BenefitCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border p-4 shadow-sm bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
      <div className="mb-1 flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-200">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
          {icon}
        </span>
        {title}
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{desc}</p>
    </div>
  );
}
