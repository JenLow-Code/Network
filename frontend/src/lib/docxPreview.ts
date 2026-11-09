/**
 * Small client-side, text-only DOCX preview.
 * Reads word/document.xml from a ZIP without uploading the file anywhere.
 * Does not promise to preserve Word styles, images or page layout.
 */
export async function textFromDocx(arrayBuffer:ArrayBuffer):Promise<string>{
 if(arrayBuffer.byteLength>3_000_000)throw new Error('Document too large');
 const v=new DataView(arrayBuffer);
 const bytes=new Uint8Array(arrayBuffer);
 const wordNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const u16=(n:number)=>v.getUint16(n,true);
 const u32=(n:number)=>v.getUint32(n,true);
 let end=-1;
 for(let i=v.byteLength-22;i>=Math.max(0,v.byteLength-65558);i--){
  if(u32(i)===0x06054b50){end=i;break;}
 }
 if(end<0)throw new Error('Not a ZIP archive');
 const entryCount=Math.min(u16(end+10),3000);
 let offset=u32(end+16);
 let xmlBytes:Uint8Array<ArrayBuffer>|null=null;
 const decoder=new TextDecoder('utf-8');
 for(let i=0;i<entryCount;i++){
  if(offset+46>v.byteLength||u32(offset)!==0x02014b50)break;
  const method=u16(offset+10),packed=u32(offset+20),unpacked=u32(offset+24);
  const filenameLength=u16(offset+28),extraLength=u16(offset+30),commentLength=u16(offset+32);
  const localOffset=u32(offset+42);
  const filename=decoder.decode(bytes.subarray(offset+46,offset+46+filenameLength));
  offset+=46+filenameLength+extraLength+commentLength;
  if(filename!=='word/document.xml')continue;
  if(packed>3_000_000||unpacked>8_000_000)throw new Error('Uncompressed content too large');
  if(localOffset+30>v.byteLength||u32(localOffset)!==0x04034b50)
    throw new Error('Invalid document content');
  const dataOffset=localOffset+30+u16(localOffset+26)+u16(localOffset+28);
  if(dataOffset+packed>v.byteLength)throw new Error('Invalid ZIP size');
  const compressed=bytes.subarray(dataOffset,dataOffset+packed);
  if(method===0){
   xmlBytes=Uint8Array.from(compressed) as Uint8Array<ArrayBuffer>;
  }else if(method===8){
   const stream=new Blob([compressed as unknown as BlobPart]).stream()
     .pipeThrough(new DecompressionStream('deflate-raw'));
   const output=await new Response(stream).arrayBuffer();
   if(output.byteLength>8_000_000)throw new Error('Content too large');
   xmlBytes=new Uint8Array(output);
  }else throw new Error('Compression not supported');
  break;
 }
 if(!xmlBytes)throw new Error('Word text not found');
 const xml=decoder.decode(xmlBytes);
 const dom=new DOMParser().parseFromString(xml,'application/xml');
 if(dom.querySelector('parsererror'))throw new Error('Invalid XML');
 const paragraphs=Array.from(dom.getElementsByTagNameNS(wordNS,'p'));
 const lines:string[]=[];
 for(const paragraph of paragraphs){
  const runs=Array.from(paragraph.getElementsByTagNameNS(wordNS,'t'));
  const line=runs.map(r=>r.textContent||'').join('');
  if(line.trim())lines.push(line);
  if(lines.length>=250)break;
 }
 return lines.join('\n\n').slice(0,24000);
}
