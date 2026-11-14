import { Navigate } from "react-router";
import { appDestination } from "../../lib/destination";
export function RoomEntry() {
  let path = "/app/lounge";
  try {
    const last = localStorage.getItem("pu-last-room");
    if (last && last !== "lounge") path = appDestination(`/rooms/${last}`);
  } catch { /* Continue to the lounge when storage is unavailable. */ }
  return <Navigate to={path} replace />;
}
