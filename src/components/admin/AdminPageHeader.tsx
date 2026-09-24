export function AdminPageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-line bg-ground/95 px-6 backdrop-blur">
      <h1 className="font-display text-2xl">{title}</h1>
      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </div>
  );
}
