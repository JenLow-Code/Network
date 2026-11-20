/** ISO 639-1 languages, with a freeform fallback for regional and historical
 * languages not covered by the two-letter language set. */
const CODES = ('aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu').split(' ');
const FEATURED = ['Français','English','Português','Deutsch','Español','Italiano'];
export function musicLanguageOptions():string[]{
  let displayNames: {of:(value:string)=>string|undefined}|undefined;
  try {
    const LanguageNames=(Intl as unknown as {DisplayNames?:new(
      locales:string[],options:{type:'language'})=>{of:(value:string)=>string|undefined}
    }).DisplayNames;
    if(LanguageNames)displayNames=new LanguageNames(['fr'],{type:'language'});
  } catch {/* Fall back to ISO code when this runtime has no Intl.DisplayNames. */}
  const options=[...FEATURED,...CODES.map(code=>{
    try{return displayNames?.of(code)||code.toUpperCase();}
    catch{return code.toUpperCase();}
  })];
  const unique=new Map<string,string>();
  options.forEach(label=>{const key=label.toLocaleLowerCase('fr');if(!unique.has(key))unique.set(key,label);});
  return [...FEATURED,...[...unique.values()].filter(label=>
    !FEATURED.some(f=>f.toLocaleLowerCase('fr')===label.toLocaleLowerCase('fr')))
    .sort((a,b)=>a.localeCompare(b,'fr'))];
}
