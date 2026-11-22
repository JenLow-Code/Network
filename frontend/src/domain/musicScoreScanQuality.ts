/** Conservative visual cross-check for scanned scores.
 *
 * This is NOT optical music recognition. It detects groups of five horizontal
 * staff lines and prevents AI-generated note clusters from masquerading as a
 * full transcription. It never manufactures notes or changes the original.
 */
export type StaffImageData={
  width:number;height:number;data:Uint8ClampedArray|Uint8Array;
};
export type ScoreGeometry={
  staffCount:number;
  estimatedSystems:number;
  staffBands:{firstLine:number;lastLine:number}[];
  suggestedCrop:{x:number;y:number;width:number;height:number}|null;
};

export function detectScoreGeometry(image:StaffImageData):ScoreGeometry{
  const {width,height,data}=image;
  const empty:ScoreGeometry={
    staffCount:0,estimatedSystems:0,staffBands:[],suggestedCrop:null,
  };
  if(width<180||height<100||data.length<width*height*4)return empty;
  const left=Math.floor(width*.07),right=Math.floor(width*.93);
  const jump=Math.max(2,Math.floor(width/320));
  const matching:number[]=[];
  // A staff line runs across the interior of most of the music page.
  // An ordinary stem/word/photo does not fill this many columns.
  for(let y=0;y<height;y++){
    let dark=0,count=0;
    for(let x=left;x<right;x+=jump){
      const p=(y*width+x)*4;
      const lum=data[p]*.299+data[p+1]*.587+data[p+2]*.114;
      if(lum<170)dark++;
      count++;
    }
    if(count>0&&dark/count>=.68)matching.push(y);
  }
  const clusters:number[][]=[];
  for(const y of matching){
    if(clusters.length&&y-clusters[clusters.length-1][clusters[clusters.length-1].length-1]<=2)
      clusters[clusters.length-1].push(y);
    else clusters.push([y]);
  }
  const candidates=clusters.map(cluster=>
    Math.round(cluster.reduce((a,b)=>a+b,0)/cluster.length));
  const staffBands:ScoreGeometry['staffBands']=[];
  let lastUsed=-1;
  for(let i=0;i+4<candidates.length;i++){
    if(i<=lastUsed)continue;
    const five=candidates.slice(i,i+5);
    const intervals=five.slice(1).map((y,k)=>y-five[k]);
    const sorted=[...intervals].sort((a,b)=>a-b);
    const spacing=(sorted[1]+sorted[2])/2;
    if(spacing<4||spacing>26)continue;
    if(intervals.some(delta=>Math.abs(delta-spacing)>Math.max(2,spacing*.26)))
      continue;
    staffBands.push({firstLine:five[0],lastLine:five[4]});
    lastUsed=i+4;
  }
  if(staffBands.length===0)return empty;
  const gap=staffBands.length>1?
    Math.min(height*.18,Math.max(60,
      staffBands[1].firstLine-staffBands[0].firstLine)):height*.1;
  const first=staffBands[0],last=staffBands[staffBands.length-1];
  const top=Math.max(0,Math.floor(first.firstLine-Math.max(80,gap*1.24)));
  const bottom=Math.min(height,Math.ceil(last.lastLine+Math.max(45,gap*.55)));
  return {
    staffCount:staffBands.length,
    estimatedSystems:Math.ceil(staffBands.length/2),
    staffBands,
    suggestedCrop:{x:0,y:top,width,height:Math.max(1,bottom-top)},
  };
}

export type ScanNote={midi:number;startBeats:number;lengthBeats:number};
export type ScoreAudit={
  accepted:boolean;code:'ok'|'score_incomplete'|'score_empty'|'score_invalid';
  description:string;uniqueOnsets:number;spanBeats:number;
};
/** False-positive safety gate. This cannot prove a score is correct.
 * It can reject obviously truncated results such as 27 notes at just
 * three onsets for a source photograph containing four staves.
 */
export function auditRecognizedScore(
  notes:ScanNote[],numerator:number,geometry?:Pick<ScoreGeometry,'staffCount'|'estimatedSystems'>,
):ScoreAudit{
  if(!Array.isArray(notes)||notes.length===0)
    return {accepted:false,code:'score_empty',
      description:'Aucune note utilisable n’a été reconnue.',
      uniqueOnsets:0,spanBeats:0};
  const valid=notes.filter(n=>Number.isFinite(n.midi)&&
    Number.isFinite(n.startBeats)&&Number.isFinite(n.lengthBeats)&&
    n.midi>=21&&n.midi<=108&&n.startBeats>=0&&n.lengthBeats>0);
  if(valid.length!==notes.length)
    return {accepted:false,code:'score_invalid',
      description:'Certaines notes contiennent des hauteurs ou des durées invalides.',
      uniqueOnsets:0,spanBeats:0};
  const uniqueOnsets=new Set(valid.map(note=>Math.round(note.startBeats*100)/100)).size;
  const spanBeats=Math.max(...valid.map(note=>note.startBeats+note.lengthBeats));
  const beats=Math.max(1,Math.min(16,Math.round(numerator||4)));
  const systems=Math.max(0,Math.floor(geometry?.estimatedSystems||0));
  const sourcesHaveMultipleStaves=(geometry?.staffCount||0)>=4;
  // This is intentionally a lower bound. Two systems cannot fit entirely
  // into three short onsets in a single measure of 3/4.
  const sourceTooLong=sourcesHaveMultipleStaves&&systems>=2&&
    (spanBeats<beats*systems-.05||uniqueOnsets<systems*3);
  const implausibleCluster=valid.length>=12&&uniqueOnsets<=3;
  if(sourceTooLong||implausibleCluster){
    return {accepted:false,code:'score_incomplete',
      description:sourcesHaveMultipleStaves?
        `La photo contient au moins ${geometry!.staffCount} portées, mais les notes détectées ne couvrent qu’environ ${spanBeats.toFixed(1)} temps répartis sur ${uniqueOnsets} instants. Cette transcription est manifestement incomplète.`:
        'Le moteur a regroupé trop de notes sur quelques instants : la transcription est probablement incomplète.',
      uniqueOnsets,spanBeats};
  }
  return {accepted:true,code:'ok',description:
    'Brouillon à vérifier note par note : la structure générale semble plausible, mais l’exactitude musicale n’est pas garantie.',
    uniqueOnsets,spanBeats};
}
