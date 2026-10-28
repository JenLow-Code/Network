import {Platform} from 'react-native';
import type {DreamMedia} from '@/domain/dreamWorkspace';

export function pickFlowerMedia(onSelected:(files:DreamMedia[])=>void,onError:(message:string)=>void){
 if(Platform.OS!=='web'){
  onError('La sélection des fichiers sur Android/iOS sera disponible avec le module média natif.');
  return;
 }
 const chooser=document.createElement('input');
 chooser.type='file';
 chooser.multiple=true;
 chooser.accept='image/*,audio/*,video/*,application/pdf';
 chooser.onchange=async()=>{
  const selected=Array.from(chooser.files||[]).slice(0,5);
  if(selected.some(f=>f.size>2_000_000)){onError('Chaque fichier doit faire moins de 2 Mo dans cette démonstration locale.');return}
  const items:DreamMedia[]=[];
  for(const file of selected){
   try{
    const uri=await new Promise<string>((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('format'));
     reader.onerror=()=>reject(new Error('lecture'));
     reader.readAsDataURL(file);
    });
    const kind=file.type.startsWith('image/')?'photo':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'document';
    items.push({name:file.name,uri,kind});
   }catch{onError('Impossible de lire '+file.name);return}
  }
  onSelected(items);
 };
 chooser.click();
}
