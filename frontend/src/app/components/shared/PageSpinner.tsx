export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3" role="status" aria-label={label || "Chargement"}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      {label && <p className="text-sm text-gray-400">{label}</p>}
    </div>
  );
}
