import { lazy, Suspense, Component, type ReactNode } from "react";

import { Routes, Route, Link } from "react-router";

import { Loading, ErrorState } from "./components/common";

import { PageMetadata } from "./components/PageMetadata";

import Landing from "./pages/Landing";
import { RoomEntry } from "./components/layout/RoomEntry";

const UserProfile = lazy(() => import("./pages/UserProfile"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/Auth").then(m=>({default:m.AuthCallback})));
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
          <Route path="/u/:username" element={<UserProfile/>}/>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/app" element={<Shell />}>
            <Route index element={<RoomEntry />} />

            <Route path="lounge" element={<Room />} />

            <Route path="rooms/:slug" element={<Room />} />

            <Route path="messages" element={<Messages />} />

            <Route path="messages/:conversationId" element={<Messages />} />

            <Route path="profile" element={<MyProfile />} />

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

                <h1>Looks like this page is between jobs too.</h1>

                <p>Head back to the lounge to read or join the conversation.</p>

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
