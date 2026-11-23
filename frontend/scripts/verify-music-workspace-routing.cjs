/**
 * Regression guard for the exact JenLow Music UX contract:
 * - Preserve the sample collaboration AND the sample discovery cassette;
 * - all Mes morceaux tiles open a three-tab workspace;
 * - Pour moi cassettes unfold their details below the shelf.
 * Demo fixtures remain read-only and must never gain real permissions.
 */
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const base=join(__dirname,'..');
const read=path=>readFileSync(join(base,path),'utf8');
const home=read('app/music-hub.tsx');
const shared=read('app/music-collaboration/[id].tsx');
const detail=read('app/music/[id].tsx');
const owned=read('src/components/music/MusicSongCard.tsx');
const capture=read('src/components/music/MusicCaptureExperience.tsx');
const demoData=read('src/lib/api/musicPreview.ts');
const more=read('src/components/music/MusicMoreDetails.tsx');

const personalBlock=home.split('const openMyPiece = ')[1]?.split('const sectionTitle = ')[0]||'';
const checks=[
  ['Keep the demonstration collaboration under Mes morceaux',
    home.includes('acceptedWithDemo.forEach')&&
    home.includes('demoPreview?.collaborations')],
  ['Keep the demonstration cassette under Pour moi',
    home.includes('demoPreview?.songs')&&
    home.includes('demo={!!song.isDemo}')],
  ['Keep demo examples sourced from the isolated read-only API',
    demoData.includes('DEMO_API_BASE')&&
    !home.includes("setAccepted(true)")],
  ['Personal tiles invoke openMyPiece',
    home.includes('onPress={() => openMyPiece(piece.primary)}')],
  ['Both real and demo shared tiles open the workspace, never the player',
    personalBlock.includes("pathname:'/music-collaboration/[id]'")&&
    !personalBlock.includes("pathname:'/music/[id]'")],
  ['Owned workspaces preserve Capture, Create and Collaborate',
    personalBlock.includes("pathname:'/music-workspace/[id]'")&&
    owned.includes("pathname: '/music-workspace/[id]'")],
  ['Demo shared projects render the same three tabs without calling real APIs',
    shared.includes('if(demoId)')&&
    shared.includes('fetchDemoMusicPreview()')&&
    shared.includes('<MusicWorkspaceTabs')],
  ['Collaborative Capture identifies who added a resource',
    capture.includes('Modifié par')&&shared.includes('Modifié par')],
  ['Collaborate shows the participant roster',
    shared.includes('collaborators.map(person')&&
    read('src/components/music/MusicCollaborateExperience.tsx').includes('collaborators.length')],
  ['For-me cassette toggles an expanded detail below its shelf',
    home.includes('const toggleForMe=')&&
    home.includes('expandedForMe')&&
    home.includes("onPress={() => toggleForMe(song.id)}")&&
    home.includes('A cassette unfolds HERE, underneath the row')],
  ['Cassette inline view renders the same complete Discover More details as the drawer',
    home.includes('<MusicMoreDetails item={expandedSong}/>')&&
    detail.includes('<MusicMoreDetails item={item}/>')&&
    more.includes('À propos du morceau')&&
    more.includes('Talents recherchés')&&
    more.includes('Paroles complètes')&&
    more.includes('Partitions')],
  ['Cassette details display inline without a second summary card or extra player',
    !home.includes('<MusicWaveform key={expandedSong.id}')&&
    !home.includes('borderRadius:15,backgroundColor:theme.surface,gap:14,maxWidth:780')],
  ['Bottom cassette info button does not navigate to side/public detail',
    home.includes("onLearnMore={() => toggleForMe(song.id)}")],
  ['Real discovery provides a direct collaboration action',
    home.includes("pathname:'/music-proposal/[id]'")],
  ['Real cassette details offer authorized direct contact without leaving until requested',
    home.includes("Contacter l’auteur")&&
    home.includes("api<{conversationId:string}>('/api/conversations'")&&
    home.includes("method:'POST',auth:'required',body:{handle}")],
  ['Legacy player links still check actual authenticated membership',
    detail.includes("+'/conversation'")&&detail.includes("auth:'required'")],
];
let failures=0;
for(const [label,passes] of checks){
  if(passes)console.log('PASS',label);
  else{console.error('FAIL',label);failures++;}
}
if(failures)process.exitCode=1;
