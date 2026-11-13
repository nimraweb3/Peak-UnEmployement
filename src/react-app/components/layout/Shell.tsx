import { Brand } from "../../../shared/brand";
import { NavLink, Outlet, Navigate, Link, useLocation } from "react-router";
import {
  MessageCircle,
  Settings,
  Coffee,
  ArrowUpRight,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { ThemeControl } from "../../../shared/ThemeControl";
import { usePreferences } from "../../contexts/preferences";
import { Modal } from "../ui/dialog";
import { appDestination } from "../../lib/destination";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../contexts/session";
import { api } from "../../lib/api";
import { Avatar, Loading, ErrorState } from "../common";
import { industries } from "../../../shared/config";
export default function Shell() {
  const { ready, session, profile, loading, error } = useSession();
  const { theme, setTheme } = usePreferences();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.focus();
  }, [location.pathname]);
  const [open, setOpen] = useState(false);
  const admin = useQuery({
    queryKey: ["admin"],
    queryFn: () => api<{ admin: boolean }>("/admin"),
    enabled: !!profile,
  });
  if (!ready || loading) return <Loading />;
  if (!session)
    return (
      <Navigate
        to={
          "/join?returnTo=" +
          encodeURIComponent(appDestination(location.pathname))
        }
        replace
      />
    );
  if (error) return <ErrorState error={error} />;
  if (!profile) return <Loading />;
  if (!profile.onboarding_completed)
    return (
      <Navigate
        to={
          "/join?returnTo=" +
          encodeURIComponent(appDestination(location.pathname))
        }
        replace
      />
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to conversation
      </a>
      <header className="mobile-header">
        <Link to="/app/lounge" aria-label="Peak Unemployment lounge">
          <Brand />
        </Link>
        <button
          className="icon-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && (
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Your rooms"
          description="Choose a conversation."
        >
          <nav className="mobile-room-links">
            {[{ slug: "lounge", name: "Main Lounge" }, ...industries].map(
              (room) => (
                <NavLink
                  key={room.slug}
                  to={
                    room.slug === "lounge"
                      ? "/app/lounge"
                      : `/app/rooms/${room.slug}`
                  }
                  onClick={() => setOpen(false)}
                >
                  # {room.name}
                </NavLink>
              ),
            )}
            <NavLink to="/app/profile" onClick={() => setOpen(false)}>
              Your profile
            </NavLink>
            <NavLink to="/app/messages" onClick={() => setOpen(false)}>
              Messages & requests
            </NavLink>
            <ThemeControl value={theme} onChange={setTheme} />
          </nav>
        </Modal>
      )}
      <aside className="sidebar">
        <Link to="/app/lounge" aria-label="Peak Unemployment lounge">
          <Brand />
        </Link>
        <div className="sidebar-caption">PEOPLE BETWEEN JOBS</div>
        <nav onClick={() => setOpen(false)}>
          <NavLink to="/app/lounge">
            <Coffee size={19} />
            Main Lounge
          </NavLink>
          <span className="nav-label">FIND YOUR PEOPLE</span>
          {industries.map((room) => (
            <NavLink to={`/app/rooms/${room.slug}`} key={room.slug}>
              <span className="nav-symbol">{room.icon}</span>
              {room.name}
              {profile.industry_id === room.slug && (
                <span className="suggested-dot" title="Your industry" />
              )}
            </NavLink>
          ))}
          <span className="nav-label">YOUR ACCOUNT</span>
          <NavLink to="/app/messages">
            <MessageCircle size={19} />
            Private messages
          </NavLink>
          <NavLink to="/app/settings">
            <Settings size={19} />
            Settings
          </NavLink>
          {admin.data?.admin && (
            <NavLink to="/app/admin">
              <ShieldCheck size={19} />
              Moderation
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <ThemeControl value={theme} onChange={setTheme} />
          <Link to="/community-guidelines" className="sidebar-note">
            <ShieldCheck size={18} />
            <span>
              Keep it kind.
              <br />
              <small>We’re all figuring it out.</small>
            </span>
            <ArrowUpRight size={14} />
          </Link>
          <Link to="/app/profile" className="profile-link">
            <Avatar seed={profile.avatar_seed} name={profile.username} />
            <span>
              <strong>{profile.username}</strong>
              <small>Profile & preferences</small>
            </span>
            <Settings size={15} />
          </Link>
        </div>
      </aside>
      <main className="app-main" ref={main} tabIndex={-1} id="workspace">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        <NavLink to="/app/lounge">
          <Coffee size={20} />
          <span>Lounge</span>
        </NavLink>
        <button onClick={() => setOpen(true)}>
          <Menu size={20} />
          <span>Rooms</span>
        </button>
        <NavLink to="/app/messages">
          <MessageCircle size={20} />
          <span>Messages</span>
        </NavLink>
        <NavLink to="/app/settings">
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}
