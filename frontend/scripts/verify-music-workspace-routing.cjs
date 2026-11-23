/**
 * Regression guard for the exact JenLow Music UX contract:
 * - Preserve the sample collaboration AND the sample discovery cassette;
 * - all Mes morceaux tiles open a three-tab workspace;
 * - Pour moi cassettes navigate to a separate, music-focused page.
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
const listener=read('src/components/music/MusicListeningDetail.tsx');
const listenPage=read('app/music-listen/[id].tsx');
const layout=read('app/_layout.tsx');
const nav=read('src/components/navigation/Nav.tsx');

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
  ['Pour moi cassette and Infos navigate to their own full music page',
    home.includes("pathname:'/music-listen/[id]'")&&
    home.includes("onPress={() => openForMe(song.id)}")&&
    home.includes("onLearnMore={() => openForMe(song.id)}")&&
    home.includes("onPress={() => openForMe(p.trackPublicationId)}")&&
    !home.includes('<MusicListeningDetail')],
  ['Dedicated page renders the compact player with Discovery author header',
    listenPage.includes('<DetailAuthorHeader item={song}')&&
    listenPage.includes('<MusicListeningDetail song={song}')&&
    listenPage.includes('<ScrollView key={id}')],
  ['New listening route requires the same verified login as every private screen',
    layout.includes("'music-listen/[id]'")&&
    layout.includes('<Stack.Protected guard={!!user} redirectTo="/login">')],
  ['Music navigation remains active within the listening page',
    nav.includes("path.startsWith('/music-listen/')")],
  ['Listening view preserves the same full Discover More sections as Discovery',
    listener.includes('<MusicMoreDetails item={song}/>')&&
    detail.includes('<MusicMoreDetails item={item}/>')&&
    more.includes('À propos du morceau')&&
    more.includes('Talents recherchés')&&
    more.includes('Paroles complètes')&&
    more.includes('Partitions')],
  ['Desktop uses a compact cassette and seek line, with actions on the right',
    listener.includes('<CassetteArtwork width={mediaWidth} height={mediaHeight}')&&
    listener.includes('<MusicWaveform key={song.id}')&&
    listener.includes("flexDirection:mobile?'column':'row'")&&
    listener.includes('Collaborer sur ce morceau')],
  ['On mobile users can swipe directly to the next music project',
    listener.includes('PanResponder.create')&&
    listener.includes('onPanResponderRelease')&&
    listener.includes('onSelect(next.id)')&&
    listener.includes('onSelect(previous.id)')],
  ['Continue discovering shows other real or read-only fixture music projects',
    listener.includes('Continuer à découvrir')&&
    listener.includes('related.slice(0,12).map')&&
    listenPage.includes('preview?.catalog')&&
    demoData.includes('catalog:data.songs.filter(isFictionalSong).map(toDemoPublication)')],
  ['No extra summary panel or duplicated audio player',
    !home.includes('<MusicWaveform key={expandedSong.id}')&&
    !home.includes('borderRadius:15,backgroundColor:theme.surface,gap:14,maxWidth:780')],
  ['Bottom cassette Info uses the focused page, not a side panel',
    home.includes("onLearnMore={() => openForMe(song.id)}")&&
    !home.includes('expandedForMe')],
  ['Real discovery offers a real collaboration action, never for demos',
    listener.includes("pathname:'/music-proposal/[id]'")&&
    listener.includes("previewOnly?<View")],
  ['Real cassette details retain authorized contact through the dedicated page',
    listener.includes("Contacter l’artiste")&&
    listenPage.includes("api<{conversationId:string}>('/api/conversations'")&&
    listenPage.includes("method:'POST',auth:'required',body:{handle}")],
  ['Legacy player links still check actual authenticated membership',
    detail.includes("+'/conversation'")&&detail.includes("auth:'required'")],
];
let failures=0;
for(const [label,passes] of checks){
  if(passes)console.log('PASS',label);
  else{console.error('FAIL',label);failures++;}
}
if(failures)process.exitCode=1;
