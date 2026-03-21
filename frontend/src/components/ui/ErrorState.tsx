export default function ErrorState({ message }: { message: string }) {
  return <div className="rounded border border-rose-800 bg-rose-950/30 p-4 text-rose-300">{message}</div>;
}
