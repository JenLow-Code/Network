import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {DreamPublication} from './discoveryData';
import {DetailLayout} from './DetailLayout';
import {DetailIntro} from './DetailIntro';
import {DreamPhaseIcon} from './DreamPhaseIcon';
import {DetailPanel} from './PublicationDetail';
import {useApp} from './context';
export function DreamReferenceLayout({item}:{item:DreamPublication}){
 const app=useApp();
 const sameDream=()=>app.joinDream(item.id);
 return <DetailLayout item={item} featured={<DetailIntro title="Mon but" compact artwork={<DreamPhaseIcon phase={item.phase} size={46}/>}>
  <Text style={{fontSize:14,lineHeight:21,color:'#333',marginTop:4}}>{item.summary}</Text>
  {item.phase==='Rêve'?<Pressable onPress={sameDream} accessibilityLabel="Moi aussi" style={{flexDirection:'row',gap:6,alignItems:'center',marginTop:9,alignSelf:'flex-start'}}><Ionicons name={app.myDreamIds.includes(item.id)?'checkmark-circle':'add-circle-outline'} size={18} color={app.myDreamIds.includes(item.id)?'#CB245C':'#444'}/><Text style={{fontSize:12,color:app.myDreamIds.includes(item.id)?'#CB245C':'#444'}}>Moi aussi</Text></Pressable>:null}
 </DetailIntro>}>
  <DetailPanel title="Ma motivation" foldable defaultOpen={false}><Text style={{fontSize:13,lineHeight:20,color:'#333'}}>{item.motivation||'Ce rêve me tient à cœur.'}</Text></DetailPanel>
  <DetailPanel title="Les talents nécessaires" foldable defaultOpen={false}><Text style={{fontSize:13,color:'#333'}}>{item.needs.join(' · ')}</Text></DetailPanel>
  {item.phase==='Initiation'?<DetailPanel title="Date objectif" foldable defaultOpen={false}><Text>{item.goalDate||'À définir'}</Text></DetailPanel>:null}
  {item.phase==='Croissance'?<DetailPanel title="Journal de croissance" foldable defaultOpen={false}>{(item.logs||[]).map((log,i)=><Text key={i} style={{marginVertical:4,color:'#333'}}>🌿 {log}</Text>)}</DetailPanel>:null}
 </DetailLayout>;
}
