/** Security invariants for the global session gate (source-level smoke test).
 * Live auth is independently exercised by middleware/test/privacy-gate.test.ts.
 */
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=p=>readFileSync(join(__dirname,'..',p),'utf8');
const layout=read('app/_layout.tsx');
const provider=read('src/context/AuthProvider.tsx');
const api=read('src/lib/api/client.ts');
const supabase=read('src/lib/supabaseClient.ts');
const tests=[
  ['Global route guard, not just the Discover page',layout.includes('const locked=!user&&!isAuthRoute')&&
    layout.includes("router.replace('/login')")],
  ['Auth callback remains available for Google',layout.includes("path==='/auth/callback'")],
  ['Loading auth cannot expose the app',layout.includes('if(!initialized)return')&&
    layout.includes('opacity:locked?0:1')],
  ['No navigation bar for signed-out viewers',layout.includes('!desktop&&!!user?')&&
    layout.includes('desktop&&!!user?')],
  ['Session restored only after Supabase server validation',
    provider.includes("client().auth.getUser()")&&provider.includes('setSession(candidate)')],
  ['Seven-day inactivity requires a fresh login',
    /INACTIVITY_TIMEOUT_MS=7\*24\*60\*60\*1000/.test(provider)&&
    provider.includes("ACTIVITY_KEY+uid")],
  ['Two-hour validation cycle',provider.includes('SESSION_VALIDATION_MS=2*60*60*1000')],
  ['Automatic token refresh does not count as activity',
    provider.includes("event==='TOKEN_REFRESHED'")&&
    provider.includes('Token rotation is not user activity')],
  ['Silent Supabase API token exchange, never a direct anonymous read',
    api.includes("'/v1/auth/supabase/exchange'")&&
    api.includes("Authorization:'Bearer '+data.session.access_token")],
  ['Supabase native and browser refresh remain enabled',
    supabase.includes('autoRefreshToken: true')&&supabase.includes('persistSession: true')],
];
tests.forEach(([label,ok])=>{
  if(ok)console.log('PASS',label);
  else console.error('FAIL',label);
});
assert.ok(tests.every(([,ok])=>ok),'auth privacy invariants failed');
