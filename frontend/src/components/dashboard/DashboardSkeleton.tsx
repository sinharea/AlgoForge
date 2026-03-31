export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="skeleton h-80 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
      <div className="skeleton h-40 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    </div>
  );
}
