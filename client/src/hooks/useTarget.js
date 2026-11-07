import { useSearchParams } from 'react-router-dom';
// Admin "view as staff" support: ?userId=<id>&name=<name> is passed to every API call and kept in links.
export function useTarget() {
  const [sp] = useSearchParams();
  const userId = sp.get('userId') || undefined;
  const name = sp.get('name') || '';
  const q = userId ? `?userId=${userId}&name=${encodeURIComponent(name)}` : '';
  return { userId, name, q, params: userId ? { userId } : {} };
}
