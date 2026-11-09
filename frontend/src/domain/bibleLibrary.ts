import AsyncStorage from '@react-native-async-storage/async-storage';

/** Downloadable, public-domain French Louis Segond 1910 Bible.
 * Source data: https://github.com/midvash/bible-data/tree/main/versions/fr/lsg
 * Licence reference: https://ebible.org/fraLSG/copyright.htm
 * Data is compacted to per-book verse arrays to keep native AsyncStorage within its limits.
 */
export const BIBLE_EDITION = 'Louis Segond 1910';
export const BIBLE_EDITION_CODE = 'LSG1910';
const STORAGE_PREFIX = 'jenlow.bible.fr.lsg1910.v1.';
const INSTALLED = STORAGE_PREFIX + 'installed';
const BASE = 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/fr/lsg/books/';
export const BIBLE_BOOKS = [
  ['Gen','Genèse'],['Exod','Exode'],['Lev','Lévitique'],['Num','Nombres'],
  ['Deut','Deutéronome'],['Josh','Josué'],['Judg','Juges'],['Ruth','Ruth'],
  ['1Sam','1 Samuel'],['2Sam','2 Samuel'],['1Kgs','1 Rois'],['2Kgs','2 Rois'],
  ['1Chr','1 Chroniques'],['2Chr','2 Chroniques'],['Ezra','Esdras'],['Neh','Néhémie'],
  ['Esth','Esther'],['Job','Job'],['Ps','Psaumes'],['Prov','Proverbes'],
  ['Eccl','Ecclésiaste'],['Song','Cantique des cantiques'],['Isa','Ésaïe'],
  ['Jer','Jérémie'],['Lam','Lamentations'],['Ezek','Ézéchiel'],['Dan','Daniel'],
  ['Hos','Osée'],['Joel','Joël'],['Amos','Amos'],['Obad','Abdias'],['Jonah','Jonas'],
  ['Mic','Michée'],['Nah','Nahum'],['Hab','Habacuc'],['Zeph','Sophonie'],
  ['Hag','Aggée'],['Zech','Zacharie'],['Mal','Malachie'],['Matt','Matthieu'],
  ['Mark','Marc'],['Luke','Luc'],['John','Jean'],['Acts','Actes'],
  ['Rom','Romains'],['1Cor','1 Corinthiens'],['2Cor','2 Corinthiens'],
  ['Gal','Galates'],['Eph','Éphésiens'],['Phil','Philippiens'],['Col','Colossiens'],
  ['1Thess','1 Thessaloniciens'],['2Thess','2 Thessaloniciens'],
  ['1Tim','1 Timothée'],['2Tim','2 Timothée'],['Titus','Tite'],['Phlm','Philémon'],
  ['Heb','Hébreux'],['Jas','Jacques'],['1Pet','1 Pierre'],['2Pet','2 Pierre'],
  ['1John','1 Jean'],['2John','2 Jean'],['3John','3 Jean'],['Jude','Jude'],
  ['Rev','Apocalypse'],
] as const;
export type BibleBookCode = (typeof BIBLE_BOOKS)[number][0];
export type BiblePassage = {bookCode:BibleBookCode;bookName:string;chapter:number;verse:number;text:string};
export type StoredBibleBook = {book:BibleBookCode;chapters:Record<string,string[]>};
const key=(book:BibleBookCode)=>STORAGE_PREFIX+book;
const normalize=(s:string)=>s.replace(/''/g,"'").trim();
type SourceBible = {
 book:string; chapters:{chapter:number;verses:{number:number;text:string}[]}[];
};
const inFlight=new Map<BibleBookCode,Promise<StoredBibleBook>>();
export const bibleBookName=(code:BibleBookCode):string=>
 BIBLE_BOOKS.find(b=>b[0]===code)?.[1]||code;

function validBook(v:unknown):v is StoredBibleBook {
 if(!v||typeof v!=='object')return false;
 const b=v as StoredBibleBook;
 return typeof b.book==='string'&&!!b.chapters&&typeof b.chapters==='object';
}
export async function cachedBibleBook(book:BibleBookCode):Promise<StoredBibleBook|null>{
 try{
  const raw=await AsyncStorage.getItem(key(book));
  if(!raw)return null;
  const v:unknown=JSON.parse(raw);
  return validBook(v)?v:null;
 }catch{return null;}
}
async function fetchBibleBook(book:BibleBookCode):Promise<StoredBibleBook>{
 const response=await fetch(BASE+book+'.json');
 if(!response.ok)throw new Error('Bible indisponible : '+response.status);
 const data=await response.json() as SourceBible;
 if(data.book!==book||!Array.isArray(data.chapters)||!data.chapters.length)
   throw new Error('Format biblique incompatible');
 const chapters:Record<string,string[]>={};
 for(const chapter of data.chapters){
  if(!Number.isInteger(chapter.chapter)||!Array.isArray(chapter.verses))continue;
  const verses:string[]=[];
  for(const verse of chapter.verses){
   if(!Number.isInteger(verse.number)||verse.number<1||verse.number>200||typeof verse.text!=='string')continue;
   verses[verse.number-1]=normalize(verse.text);
  }
  chapters[String(chapter.chapter)]=Array.from({length:verses.length},(_,index)=>verses[index]||'');
 }
 if(!Object.keys(chapters).length)throw new Error('Livre vide');
 const result:StoredBibleBook={book,chapters};
 // Reading a book automatically caches it; download-all explicitly fills every book.
 await AsyncStorage.setItem(key(book),JSON.stringify(result));
 return result;
}
export async function getBibleBook(book:BibleBookCode):Promise<StoredBibleBook>{
 const existing=await cachedBibleBook(book);
 if(existing)return existing;
 const running=inFlight.get(book);
 if(running)return running;
 const promise=fetchBibleBook(book).finally(()=>inFlight.delete(book));
 inFlight.set(book,promise);
 return promise;
}
export async function bibleDownloadState():Promise<{complete:boolean;cached:number}> {
 const keys=await AsyncStorage.getAllKeys();
 const available=new Set(keys);
 const cached=BIBLE_BOOKS.filter(b=>available.has(key(b[0]))).length;
 const complete=(await AsyncStorage.getItem(INSTALLED))==='yes'&&cached===BIBLE_BOOKS.length;
 return {complete,cached};
}
export async function downloadBible(onProgress?:(loaded:number,total:number)=>void):Promise<void>{
 // Fetch in small groups; each book is stored separately. Resume interrupted downloads.
 let next=0,completed=0;
 const worker=async()=>{
  while(next<BIBLE_BOOKS.length){
   const book=BIBLE_BOOKS[next++][0];
   await getBibleBook(book);
   completed++;
   onProgress?.(completed,BIBLE_BOOKS.length);
  }
 };
 await Promise.all(Array.from({length:4},worker));
 await AsyncStorage.setItem(INSTALLED,'yes');
}
export async function removeDownloadedBible(){
 await AsyncStorage.multiRemove([...BIBLE_BOOKS.map(b=>key(b[0])),INSTALLED]);
}
export async function searchDownloadedBible(query:string,max=30):Promise<BiblePassage[]>{
 const needle=normalize(query).toLocaleLowerCase('fr-FR');
 if(needle.length<3)return [];
 const results:BiblePassage[]=[];
 for(const [code,name] of BIBLE_BOOKS){
  const book=await cachedBibleBook(code);
  if(!book)continue;
  for(const [chapter,verses] of Object.entries(book.chapters)){
   for(let i=0;i<verses.length;i++){
    if(verses[i]?.toLocaleLowerCase('fr-FR').includes(needle))
      results.push({bookCode:code,bookName:name,chapter:Number(chapter),verse:i+1,text:verses[i]});
    if(results.length>=max)return results;
   }
  }
 }
 return results;
}
export function bibleReference(p:BiblePassage):string{
 return p.bookName+' '+p.chapter+':'+p.verse;
}
