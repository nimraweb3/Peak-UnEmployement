import { lazy, Suspense, Component, type ReactNode } from "react";

import { Routes, Route, Navigate, Link } from "react-router";

import { Loading, ErrorState } from "./components/common";

import { PageMetadata } from "./components/PageMetadata";

import Landing from "./pages/Landing";

const Join = lazy(() => import("./pages/Join"));

const Shell = lazy(() => import("./components/layout/Shell"));

const Room = lazy(() => import("./pages/Room"));

const Messages = lazy(() => import("./pages/Messages"));

const Settings = lazy(() => import("./pages/Settings"));

const Legal = lazy(() => import("./pages/Legal"));

const Recover = lazy(() => import("./pages/Recover"));

const Admin = lazy(() => import("./pages/Admin"));

class Boundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    return this.state.error ? (
      <ErrorState
        error={new Error("Something went wrong. Please reload to try again.")}
        retry={() => location.reload()}
      />
    ) : (
      this.props.children
    );
  }
}

export default function App() {
  return (
    <Boundary>
      <PageMetadata />

      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route path="/rooms/:slug" element={<Landing />} />

          <Route path="/join" element={<Join />} />

          <Route path="/recover" element={<Recover />} />

          <Route path="/app" element={<Shell />}>
            <Route index element={<Navigate to="lounge" replace />} />

            <Route path="lounge" element={<Room />} />

            <Route path="rooms/:slug" element={<Room />} />

            <Route path="messages" element={<Messages />} />

            <Route path="messages/:conversationId" element={<Messages />} />

            <Route path="profile" element={<Settings />} />

            <Route path="settings" element={<Settings />} />

            <Route path="admin" element={<Admin />} />
          </Route>

          {["community-guidelines", "privacy", "terms"].map((path) => (
            <Route path={`/${path}`} key={path} element={<Legal />} />
          ))}

          <Route
            path="*"
            element={
              <main className="state not-found">
                <span className="logo">
                  404<span>.</span>
                </span>

                <h1>This page doesn’t exist.</h1>

                <p>The conversation is back this way.</p>

                <Link className="button button-primary" to="/">
                  Back to the lounge
                </Link>
              </main>
            }
          />
        </Routes>
      </Suspense>
    </Boundary>
  );
}
