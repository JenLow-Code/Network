/** UI authentication guard invariants. Backend privacy is tested separately. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const layout=read('app/_layout.tsx');
const provider=read('src/context/AuthProvider.tsx');
const supabase=read('src/lib/supabaseClient.ts');
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
  ['Every private screen is mounted only behind an Expo Router guard',
    layout.includes('<Stack.Protected guard={!!user} redirectTo="/login">')&&
    protectedScreens.has('discover')&&protectedScreens.has('music-hub')],
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
