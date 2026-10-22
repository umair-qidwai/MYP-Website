import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Navigation,
  Newspaper,
  NotebookPen,
  Settings,
  Shuffle,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { AuthProvider, useAuth } from "./auth";
import { Spinner, ToastProvider, cx } from "./ui";
import { LoginPage, SetPasswordPage } from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const PagesList = lazy(() => import("./pages/PagesList"));
const PageEditor = lazy(() => import("./pages/PageEditor"));
const EntriesList = lazy(() => import("./pages/EntriesList"));
const EntryEditor = lazy(() => import("./pages/EntryEditor"));
const MediaLibrary = lazy(() => import("./pages/MediaLibrary"));
const NavigationEditor = lazy(() => import("./pages/NavigationEditor"));
const SiteSettings = lazy(() => import("./pages/SiteSettings"));
const UsersPage = lazy(() => import("./pages/Users"));
const Submissions = lazy(() => import("./pages/Submissions"));
const Redirects = lazy(() => import("./pages/Redirects"));
const Activity = lazy(() => import("./pages/Activity"));
const Account = lazy(() => import("./pages/Account"));

export default function AdminApp() {
  useEffect(() => {
    document.title = "Website editor · MY Project USA";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  }, []);
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-svh bg-[#f6f5f2] font-sans text-ink [font-size:15px]">
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="set-password" element={<SetPasswordPage />} />
            <Route path="*" element={<Protected />} />
          </Routes>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  const admin = user.role === "admin";
  return (
    <Shell>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="pages" element={<PagesList />} />
          <Route path="pages/:id" element={<PageEditor />} />
          <Route path="collections/:collection" element={<EntriesList />} />
          <Route path="collections/:collection/:id" element={<EntryEditor />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="navigation" element={admin ? <NavigationEditor /> : <NoAccess />} />
          <Route path="settings" element={<SiteSettings />} />
          <Route path="users" element={admin ? <UsersPage /> : <NoAccess />} />
          <Route path="submissions" element={admin ? <Submissions /> : <NoAccess />} />
          <Route path="redirects" element={admin ? <Redirects /> : <NoAccess />} />
          <Route path="activity" element={admin ? <Activity /> : <NoAccess />} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<Navigate to="/admin/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}

function NoAccess() {
  return (
    <div className="rounded-xl bg-white p-10 text-center ring-1 ring-black/[0.07]">
      <p className="font-semibold">Only administrators can open this section.</p>
      <p className="mt-1 text-muted">Ask an administrator if you need access.</p>
    </div>
  );
}

type NavDef = { to: string; label: string; icon: typeof FileText; admin?: boolean; end?: boolean };
const SECTIONS: { title: string; items: NavDef[] }[] = [
  { title: "", items: [{ to: "/admin/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  {
    title: "Content",
    items: [
      { to: "/admin/pages", label: "Pages", icon: FileText },
      { to: "/admin/collections/events", label: "Events", icon: CalendarDays },
      { to: "/admin/collections/articles", label: "Articles", icon: NotebookPen },
      { to: "/admin/collections/news", label: "News coverage", icon: Newspaper },
      { to: "/admin/collections/reports", label: "Reports", icon: FolderOpen },
      { to: "/admin/media", label: "Images & files", icon: ImageIcon },
    ],
  },
  {
    title: "Website",
    items: [
      { to: "/admin/navigation", label: "Menu", icon: Navigation, admin: true },
      { to: "/admin/settings", label: "Site settings", icon: Settings },
      { to: "/admin/submissions", label: "Form submissions", icon: Inbox, admin: true },
      { to: "/admin/redirects", label: "Redirects", icon: Shuffle, admin: true },
    ],
  },
  {
    title: "Team",
    items: [
      { to: "/admin/users", label: "People & access", icon: Users, admin: true },
      { to: "/admin/activity", label: "Activity log", icon: History, admin: true },
      { to: "/admin/account", label: "My account", icon: UserCog },
    ],
  },
];

function Shell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [location.pathname]);

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <img src="/static/brand/logo.png" alt="" width={36} height={36} className="size-9 object-contain" />
        <div className="leading-tight">
          <p className="text-[0.93rem] font-bold">MY Project USA</p>
          <p className="text-[0.75rem] text-muted">Website editor</p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {SECTIONS.map((s) => {
          const items = s.items.filter((i) => !i.admin || user?.role === "admin");
          if (!items.length) return null;
          return (
            <div key={s.title || "main"}>
              {s.title && <p className="mb-1.5 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">{s.title}</p>}
              <ul className="space-y-0.5">
                {items.map((i) => (
                  <li key={i.to}>
                    <NavLink
                      to={i.to}
                      end={i.end}
                      className={({ isActive }) =>
                        cx(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-[0.9rem] font-medium transition-colors",
                          isActive ? "bg-white text-plum shadow-sm ring-1 ring-black/[0.06]" : "text-ink-2 hover:bg-black/[0.04]",
                        )
                      }
                    >
                      <i.icon className="size-[1.05rem]" aria-hidden />
                      {i.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="border-t border-black/[0.07] p-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[0.88rem] text-ink-2 hover:bg-black/[0.04]"
        >
          <ExternalLink className="size-4" aria-hidden /> View website
        </a>
        <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[0.85rem] font-semibold">{user?.name}</p>
            <p className="truncate text-[0.75rem] text-muted">
              {user?.role === "admin" ? "Administrator" : user?.canPublish ? "Editor · can publish" : "Editor"}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate("/admin/login");
            }}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-black/[0.06]"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r border-black/[0.07] bg-[#efede8] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-[#efede8] shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 grid size-9 place-items-center rounded-lg hover:bg-black/5"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/[0.07] bg-[#f6f5f2]/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-lg ring-1 ring-black/10" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <p className="font-semibold">Website editor</p>
        </div>
        <main className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
