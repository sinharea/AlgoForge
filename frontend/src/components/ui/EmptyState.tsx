export default function EmptyState({ title }: { title: string }) {
  return <div className="rounded border border-slate-800 bg-slate-900 p-6 text-slate-400">{title}</div>;
}
