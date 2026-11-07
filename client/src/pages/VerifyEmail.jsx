import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Spinner } from '../components/ui';
import api, { errMsg } from '../api';
export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; ran.current = true; // avoid double call in React strict mode
    api.post('/auth/verify-email', { token }).then((r) => setState({ ok: true, msg: r.data.message })).catch((e) => setState({ ok: false, msg: errMsg(e) }));
  }, [token]);
  return (
    <AuthShell title="Email verification" sub="" footer={<Link to="/login" className="font-semibold text-indigo-600">Go to log in</Link>}>
      {state.loading ? <Spinner /> : <div className={`rounded-xl p-4 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300'}`}>{state.msg}</div>}
    </AuthShell>
  );
}
