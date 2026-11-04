import { useLocation } from "react-router";
import { LegalPage } from "../../shared/public-legal";
export default function Legal() {
  return <LegalPage path={useLocation().pathname} />;
}
