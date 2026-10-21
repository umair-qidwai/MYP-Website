import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./styles.css";
import { PublicApp } from "./public/PublicApp";

const AdminApp = lazy(() => import("./admin/AdminApp"));

const root = document.getElementById("root")!;
// The Worker places a server-rendered snapshot inside #root for crawlers / no-JS visitors.
// The app takes over from here.
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="grid min-h-svh place-items-center text-sm text-muted">Loading…</div>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<PublicApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
