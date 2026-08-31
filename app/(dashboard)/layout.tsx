import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, Upload, Settings } from "lucide-react";

/** Ported from .sidebar / .topbar in the design mockup (screen 01). */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-0">
      <aside className="flex w-16 flex-col items-center gap-5 border-r border-border bg-bg-2 py-4">
        <div className="h-8 w-8 rounded-sm bg-primary" />
        <nav className="flex flex-col gap-2">
          <SideIcon href="/dashboard" icon={<LayoutGrid size={16} />} label="Bibliothèque" />
          <SideIcon href="/dashboard/upload" icon={<Upload size={16} />} label="Nouvelle vidéo" />
          <SideIcon href="/dashboard/settings" icon={<Settings size={16} />} label="Paramètres" />
        </nav>
        <div className="mt-auto">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function SideIcon({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-sm text-t-3 transition-colors hover:bg-primary-dim hover:text-primary-light"
    >
      {icon}
    </Link>
  );
}
