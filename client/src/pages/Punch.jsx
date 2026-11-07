import PunchCard from '../components/PunchCard';
import { PageHeader } from '../components/ui';
export default function Punch() {
  return (<><PageHeader title="Today's attendance" sub="Check in when you arrive and check out when you leave." /><div className="max-w-3xl"><PunchCard /></div></>);
}
