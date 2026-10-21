import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter, useRouteError } from "react-router";
import "./styles.css";
import { PublicApp } from "./public/PublicApp";

const AdminApp = lazy(() => import("./admin/AdminApp"));

// A data router enables navigation blocking (the editor's "unsaved changes" guard).
/** Shown if something unexpected breaks while rendering (instead of a blank or technical page). */
function CrashScreen() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="grid min-h-svh place-items-center bg-paper p-6 text-center">
      <div className="max-w-md">
        <h1 className="display text-4xl">Something went wrong</h1>
        <p className="mt-3 text-ink-2">Sorry — this page hit an unexpected problem. Reloading usually fixes it. If you were editing, your last saved draft is safe.</p>
        <button type="button" onClick={() => location.reload()} className="mt-6 rounded-full bg-ink px-6 py-3 font-semibold text-paper">
          Reload
        </button>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/admin/*",
    errorElement: <CrashScreen />,
    element: (
      <Suspense fallback={<div className="grid min-h-svh place-items-center text-sm text-muted">Loading…</div>}>
        <AdminApp />
      </Suspense>
    ),
  },
  { path: "*", element: <PublicApp />, errorElement: <CrashScreen /> },
]);

const root = document.getElementById("root")!;
// The Worker places a server-rendered snapshot inside #root for crawlers / no-JS visitors.
// The app takes over from here.
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
