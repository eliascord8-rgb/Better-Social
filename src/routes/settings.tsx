import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation as useConvexMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import * as React from 'react';
export const Route = createFileRoute('/settings')({ component: () => {
  const userId = localStorage.getItem('bq_user_id') as any;
  const navigate = useNavigate();
  if (!userId) { navigate({ to: '/' }); return null; }
  const { data: user } = useSuspenseQuery(convexQuery(api.users.getMe, { userId }));
  const updateProfile = useConvexMutation(api.users.updateProfile);
  const [profilePicture, setProfilePicture] = React.useState(user?.profilePicture || '');
  const [password, setPassword] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const handleSave = async (e: any) => {
    e.preventDefault(); setIsSaving(true);
    try { await updateProfile({ userId, profilePicture, password: password || undefined }); setMsg('Saved!'); setPassword(''); }
    catch (err: any) { setMsg('Error: ' + err.message); }
    finally { setIsSaving(false); }
  };
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">SETTINGS</h1><button onClick={()=>navigate({to:'/dashboard'})} className="text-xs bg-neutral-800 px-3 py-1 rounded">BACK</button></div>
        <form onSubmit={handleSave} className="bg-neutral-900 p-6 rounded-2xl space-y-4">
          {msg && <div className="text-center text-xs font-bold text-indigo-400">{msg}</div>}
          <img src={profilePicture || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-20 h-20 rounded-xl mx-auto object-cover" />
          <input value={profilePicture} onChange={(e)=>setProfilePicture(e.target.value)} placeholder="Avatar URL" className="w-full bg-black border border-neutral-800 p-2 rounded text-sm"/>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="New Password" className="w-full bg-black border border-neutral-800 p-2 rounded text-sm"/>
          <button disabled={isSaving} className="w-full bg-white text-black py-2 rounded font-bold">{isSaving ? '...' : 'SAVE'}</button>
        </form>
      </div>
    </div>
  );
}});
