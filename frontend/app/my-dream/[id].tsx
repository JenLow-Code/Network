import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useState} from 'react';
import {Alert,Image,Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {Nav} from '@/components';
import {OfflineDreamImage} from '@/OfflineDreamImage';
import {useDreams} from '@/domain/dreamRepository';
import {canEditField,nextPhase} from '@/domain/dreamWorkspace';
export default function Workspace(){
 const {id}=useLocalSearchParams<{id:string}>();
 const {items,update,add,advance,complete,remove}=useDreams();
 const dream=items.find(x=>x.id===id);
 const [summary,setSummary]=useState(''),[image,setImage]=useState(''),[needs,setNeeds]=useState(''),[entry,setEntry]=useState(''),[finishText,setFinishText]=useState(''),[finishUrl,setFinishUrl]=useState(''),[mediaType,setMediaType]=useState<'audio'|'photo'|'video'|'text'>('text'),[mode,setMode]=useState<'summary'|'image'|'needs'|null>(null);
 if(!dream)return <SafeAreaView style={{flex:1}}><Text>Rêve introuvable</Text><Nav/></SafeAreaView>;
 const editable=dream!.phase==='Rêve',initiated=dream!.phase==='Initiation',growing=dream!.phase==='Croissance';
 function start(field:'summary'|'image'|'needs'){setMode(field);setSummary(dream!.summary);setImage(dream!.image);setNeeds(dream!.needs.join(', '));}
 function save(){if(mode==='summary')update(dream!.id,'summary',summary);if(mode==='image')update(dream!.id,'image',image);if(mode==='needs')update(dream!.id,'needs',needs.split(',').map(x=>x.trim()).filter(Boolean));setMode(null)}
 const button=(label:string,action:()=>void)=><Pressable onPress={action} style={{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:10,marginTop:8}}><Text style={{textAlign:'center',fontSize:12}}>{label}</Text></Pressable>;
 function field(field:'summary'|'image'|'needs',value:string){return <View style={{marginTop:13}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:15,fontWeight:'700'}}>{field==='summary'?'Mon but':field==='image'?'Image':"De ce que j’ai besoin"}</Text>{editable?<Pressable onPress={()=>start(field)}><Ionicons name="pencil" color="#D71D77" size={16}/></Pressable>:null}</View>
  {mode===field?<><TextInput multiline={field==='summary'} value={field==='summary'?summary:field==='image'?image:needs} onChangeText={field==='summary'?setSummary:field==='image'?setImage:setNeeds} style={{borderBottomWidth:1,borderColor:'#aaa',paddingVertical:10}}/>{button('✓ Enregistrer',save)}</>:<Text style={{fontSize:13,color:'#666',marginTop:9,lineHeight:21}}>{value||'Aucun contenu'}</Text>}</View>}
 function deleteDream(){Alert.alert('Supprimer ce rêve','Cette action supprimera ce rêve de cette démo.',[{text:'Annuler',style:'cancel'},{text:'Supprimer',style:'destructive',onPress:()=>{remove(dream!.id);router.replace('/my-dreams')}}])}
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:18,paddingBottom:35}}>
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={25}/></Pressable><Pressable onPress={deleteDream} accessibilityLabel="Supprimer mon rêve"><Ionicons name="trash-outline" color="#a65d63" size={21}/></Pressable></View>
 <Text style={{fontFamily:'Caveat_700Bold',fontSize:28,textAlign:'center',marginVertical:10}}>{dream!.title}</Text>
 <Text style={{fontSize:12,color:'#777',textAlign:'center',marginBottom:15}}>{dream!.phase} · Titre définitif</Text>
 <Pressable onPress={()=>router.push({pathname:'/my-dream-participants/[id]',params:{id:dream!.id}})} style={{alignSelf:'center',flexDirection:'row',gap:7,alignItems:'center',marginBottom:12,padding:8}}><Ionicons name="people-outline" size={18} color="#666"/><Text style={{fontSize:12,color:'#555'}}>Qui partage mon rêve ?</Text><Ionicons name="chevron-forward" size={16} color="#aaa"/></Pressable>
 <OfflineDreamImage uri={dream!.image} height={190}/>
 {field('summary',dream!.summary)}
 {field('image',dream!.image)}
 {field('needs',dream!.needs.join(' · '))}
 <Text style={{fontWeight:'700',fontSize:15,marginTop:24}}>{editable?'Mes inspirations et notes':initiated?'Ajouter au projet':growing?'Journal de croissance':'Mon témoignage'}</Text>
 {[...dream!.additions,...dream!.notes].map((n,i)=><Text key={i} style={{padding:10,backgroundColor:'#f5f5f5',borderRadius:7,marginTop:7,fontSize:12}}>{n}</Text>)}
 {dream!.testimony?<Text style={{marginTop:10,fontSize:13}}>{dream!.testimony.mediaType.toUpperCase()} · {dream!.testimony.comment} {dream!.testimony.mediaUrl||''}</Text>:null}
 {dream!.phase!=='Témoignage'?<>
  <TextInput multiline value={entry} onChangeText={setEntry} placeholder={growing?'Commentaire sur la progression…':initiated?'Ajouter un détail, un besoin ou une idée…':'Note ou idée à garder…'} style={{borderWidth:1,borderColor:'#ddd',borderRadius:9,padding:11,minHeight:72,marginTop:10}}/>
  {button('Ajouter',()=>{if(entry.trim()){add(dream!.id,entry.trim(),growing?'notes':'additions');setEntry('')}})}
 </>:null}
 {(editable||initiated)&&nextPhase(dream!.phase)?button('Passer à '+nextPhase(dream!.phase),()=>advance(dream!.id)):null}
 {growing?<View style={{borderTopWidth:1,borderColor:'#eee',marginTop:27,paddingTop:17}}>
  <Text style={{fontWeight:'700'}}>Clore ce rêve avec un témoignage</Text>
  <View style={{flexDirection:'row',gap:7,marginTop:11,flexWrap:'wrap'}}>{(['text','photo','audio','video'] as const).map(type=><Pressable key={type} onPress={()=>setMediaType(type)} style={{padding:9,borderRadius:9,backgroundColor:mediaType===type?'#f2e0e9':'#eee'}}><Text>{type}</Text></Pressable>)}</View>
  {mediaType!=='text'?<TextInput value={finishUrl} onChangeText={setFinishUrl} placeholder="Lien vers le média (démo)" style={{borderBottomWidth:1,borderColor:'#ddd',padding:11,marginTop:9}}/>:null}
  <TextInput multiline value={finishText} onChangeText={setFinishText} placeholder="Raconte ce qui a été accompli…" style={{borderWidth:1,borderColor:'#ddd',borderRadius:9,minHeight:90,padding:11,marginTop:13}}/>
  {button('Publier mon témoignage',()=>{if(finishText.trim()&&(mediaType==='text'||finishUrl.trim()))complete(dream!.id,finishText.trim(),mediaType,finishUrl.trim())})}
 </View>:null}
 <Text style={{marginTop:24,fontSize:10,color:'#aaa'}}>Fonctions locales de démonstration. Les droits des co-propriétaires et les médias réels seront validés côté serveur.</Text>
 </ScrollView><Nav/></SafeAreaView>;
}
