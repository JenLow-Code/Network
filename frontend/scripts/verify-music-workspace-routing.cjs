/**
 * Regression guard: private and accepted collaborative music belongs in the
 * shared working folder, not in the public cassette/player detail route.
 * This is intentionally a source-level routing invariant; the live API still
 * enforces the actual membership check.
 */
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const base=join(__dirname,'..');
const read=path=>readFileSync(join(base,path),'utf8');
const home=read('app/music-hub.tsx');
const detail=read('app/music/[id].tsx');
const shared=read('app/music-collaboration/[id].tsx');
const owned=read('src/components/music/MusicSongCard.tsx');

const personalBlock=home.split('const openMyPiece = ')[1]?.split('const openForMeProposal')[0]||'';
const checks=[
  ['No fictional accepted collaboration in Mes morceaux',
    !home.includes('demoPreview')&&!home.includes('acceptedWithDemo')],
  ['Personal tiles invoke openMyPiece',
    home.includes('onPress={() => openMyPiece(piece.primary)}')],
  ['Personal shared tiles route into the shared music workspace',
    personalBlock.includes("pathname:'/music-collaboration/[id]'")],
  ['Personal owned tiles route into their editable workspace',
    personalBlock.includes("pathname:'/music-workspace/[id]'")&&
    owned.includes("pathname: '/music-workspace/[id]'")],
  ['No fallback from personal tile to the publication player',
    !personalBlock.includes("pathname:'/music/[id]'")],
  ['Only discovery opportunities navigate to the public music player',
    home.includes('const openForMeProposal =')],
  ['Old player links recheck membership on the authenticated API',
    detail.includes("+'/conversation'")&&detail.includes("auth:'required'")],
  ['Accepted viewer is redirected from player to shared workspace',
    detail.includes("router.replace({pathname:'/music-collaboration/[id]'")],
  ['Shared workspace exposes the same tabs as an owned workspace',
    shared.includes('<MusicWorkspaceTabs')&&
    read('app/music-workspace/[id].tsx').includes('<MusicWorkspaceTabs')],
];
let failures=0;
for(const [name,ok] of checks){
  if(ok)console.log('PASS',name);
  else {console.error('FAIL',name);failures++;}
}
if(failures)process.exitCode=1;
