import { Link } from "react-router";
import { ProfileEditor } from "../components/profile/ProfileEditor";
import { useSession } from "../contexts/session";
export default function MyProfile() {
  const { profile } = useSession();
  return (
    <div className="content-page settings-page">
      <header className="page-heading">
        <span className="eyebrow">YOUR CORNER OF THE COMMUNITY</span>
        <h1>Your profile.</h1>
        <p>A name people recognize. Only the details you want to share.</p>
        {profile && (
          <Link className="text-link" to={`/u/${profile.username}`}>
            View your profile →
          </Link>
        )}
      </header>
      <ProfileEditor />
    </div>
  );
}
