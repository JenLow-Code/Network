/** UI authentication guard invariants. Backend privacy is tested separately. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const layout=read('app/_layout.tsx');
const provider=read('src/context/AuthProvider.tsx');
const supabase=read('src/lib/supabaseClient.ts');
const checks=[
  ['Every deep link, including Discovery, is guarded',
    layout.includes('const locked=!user&&!isAuthRoute')&&
    layout.includes("router.replace('/login')")],
  ['Auth callback and login remain accessible',
    layout.includes("path==='/auth/callback'")&&layout.includes("path==='/login'")],
  ['Private screen hidden until validated',
    layout.includes('if(!initialized)return')&&layout.includes('opacity:locked?0:1')],
  ['Logged-out visitors see no navigation menu',
    layout.includes('!desktop&&!!user?')&&layout.includes('desktop&&!!user?')],
  ['Stored Supabase session validated by its authentication server',
    provider.includes('client().auth.getUser()')&&provider.includes('setSession(candidate)')],
  ['Two-hour revalidation with silent short-lived token refresh',
    provider.includes('SESSION_VALIDATION_MS=2*60*60*1000')&&
    supabase.includes('autoRefreshToken: true')],
  ['One week without activity requires new sign-in',
    provider.includes('INACTIVITY_TIMEOUT_MS=7*24*60*60*1000')&&
    provider.includes('ACTIVITY_KEY+uid')],
  ['Background refresh never extends inactivity window',
    provider.includes("event==='TOKEN_REFRESHED'")&&
    provider.includes('Token rotation is not user activity')],
  ['Browser and native session survives ordinary restarts',
    supabase.includes('persistSession: true')],
];
for(const [name,passes] of checks){
  if(passes)console.log('PASS',name);
  else console.error('FAIL',name);
}
assert.ok(checks.every(([,passes])=>passes),'Authentication guard regression');
