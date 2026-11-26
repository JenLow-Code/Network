/** UI authentication guard invariants. Backend privacy is tested separately. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const layout=read('app/_layout.tsx');
const provider=read('src/context/AuthProvider.tsx');
const supabase=read('src/lib/supabaseClient.ts');
const api=read('src/lib/api/client.ts');
const login=read('app/login.tsx');
const oauth=read('app/auth/callback.tsx');
// Fail closed when a developer adds a new screen and forgets to protect it.
const appDir=path.join(__dirname,'..','app');
function allScreens(dir,prefix=''){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const relative=prefix?prefix+'/'+entry.name:entry.name;
    if(entry.isDirectory())return allScreens(path.join(dir,entry.name),relative);
    return entry.isFile()&&entry.name.endsWith('.tsx')&&
      !entry.name.startsWith('_')&&!entry.name.startsWith('+')
      ?[relative.replace(/\.tsx$/,'')]:[];
  });
}
const list=layout.match(/const PRIVATE_SCREENS=\[([\s\S]*?)\] as const;/);
assert.ok(list,'Expo private screen registry is missing');
const protectedScreens=new Set([...list[1].matchAll(/'([^']+)'/g)].map(m=>m[1]));
const allowedPublic=new Set(['index','login','auth/callback']);
const uncovered=allScreens(appDir).filter(route=>
  !allowedPublic.has(route)&&!protectedScreens.has(route));
assert.deepEqual(uncovered,[],'Every file-based private route must be protected');

const checks=[
  ['Every private screen requires the unified API-verified identity',
    layout.includes('<Stack.Protected guard={!!user&&!validationError} redirectTo="/login">')&&
    protectedScreens.has('discover')&&protectedScreens.has('music-hub')],
  ['Supabase login alone can never authorize the UI',
    provider.includes('const token=await exchangeSupabaseBearer(candidate.access_token)')&&
    provider.includes("API_BASE+'/v1/auth/me'")&&
    provider.includes('if(!workerAccepted)')&&
    provider.includes('setSession(null)')],
  ['Server mapping must match the Supabase-verified account',
    provider.includes("result.user?.email?.toLowerCase()===data.user.email.toLowerCase()")&&
    provider.includes("result.user?.account_status==='active'")],
  ['Missing or rejected API identity redirects to Login rather than Discovery',
    layout.includes("if((!user||validationError)&&!isAuthRoute)")&&
    layout.includes("router.replace('/login')")&&
    login.includes('Réessayer la vérification')],
  ['Signed-in users cannot access posts anonymously through API fallback',
    api.includes("path.startsWith('/api/')?'required'")&&
    api.includes("'/v1/auth/supabase/exchange'")&&
    !api.includes('currentAccessToken() ?? (auth ===')],
  ['OAuth does not bypass the Worker verification',
    oauth.includes('await completeOAuthSession(data.session)')&&
    oauth.includes('if (attempted.current) return;')&&
    !oauth.includes('await revalidate()')&&
    !oauth.includes("else router.replace('/discover')")],
  ['Google PKCE authorization code is exchanged exactly once (never on re-render)',
    oauth.includes("const attempted = useRef(false)")&&
    oauth.includes("if (attempted.current) return;")&&
    oauth.includes("attempted.current = true;")&&
    oauth.includes("if (!initialized) return;")&&
    !oauth.includes("if(initialized&&validationError)")],
  ['OAuth validation passes explicit server-verified session rather than stale initial session',
    provider.includes('completeOAuthSession:verify')&&
    api.includes('export async function exchangeSupabaseBearer(supabaseBearer:string)')&&
    api.includes('lastBridgeFailure={code,status:response.status}')&&
    login.includes('Diagnostic serveur : {authFailure}')],
  ['Auth callback and login remain accessible',
    layout.includes("path==='/auth/callback'")&&layout.includes("path==='/login'")],
  ['Private screen hidden until validated',
    layout.includes('if(!initialized)return')&&layout.includes('opacity:locked?0:1')],
  ['Logged-out or worker-unverified visitors see no navigation menu',
    layout.includes('!desktop&&!!user&&!validationError?')&&
    layout.includes('desktop&&!!user&&!validationError?')],
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
  ['Explicit user activity and logout call the server session endpoints',
    provider.includes("api('/core/session/activity',{method:'POST',auth:'required'}")&&
    provider.includes("api('/core/session/revoke',{method:'POST',auth:'required'")],
  ['Browser and native session survives ordinary restarts',
    supabase.includes('persistSession: true')],
];
for(const [name,passes] of checks){
  if(passes)console.log('PASS',name);
  else console.error('FAIL',name);
}
assert.ok(checks.every(([,passes])=>passes),'Authentication guard regression');
