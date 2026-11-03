import { NavLink, Outlet, Navigate, Link } from "react-router";
import {
  MessageCircle,
  Settings,
  Coffee,
  ArrowUpRight,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../contexts/session";
import { api } from "../../lib/api";
import { Avatar, Loading, ErrorState } from "../common";
import { industries } from "../../../shared/config";
export default function Shell() {
  const { ready, session, profile, loading, error } = useSession();
  const [open, setOpen] = useState(false);
  const admin = useQuery({
    queryKey: ["admin"],
    queryFn: () => api<{ admin: boolean }>("/admin"),
    enabled: !!profile,
  });
  if (!ready || loading) return <Loading />;
  if (!session) return <Navigate to="/join" replace />;
  if (error) return <ErrorState error={error} />;
  if (!profile) return <Loading />;
  if (!profile.onboarding_completed) return <Navigate to="/join" replace />;
  return (
    <div className="app-shell">
      <header className="mobile-header">
        <Link to="/" className="logo">
          peak<span>.</span>
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
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <Link to="/" className="logo">
          peak<span>.</span>
        </Link>
        <div className="sidebar-caption">YOUR INTERNET BREAK ROOM</div>
        <nav onClick={() => setOpen(false)}>
          <NavLink to="/app/lounge">
            <Coffee size={19} />
            Main Lounge
            <span className="nav-dot" />
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
          <span className="nav-label">YOUR CORNER</span>
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
              <small>Professionally available</small>
            </span>
            <Settings size={15} />
          </Link>
        </div>
      </aside>
      <main className="app-main">
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
