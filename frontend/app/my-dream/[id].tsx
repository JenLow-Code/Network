import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useState} from 'react';
import {Alert,Image,Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {Nav} from '@/components';
import {PHASE_LABELS} from '@/discoveryData';
import {pickDreamImage} from '@/pickDreamImage';
import {useDreams} from '@/domain/dreamRepository';
import {canEditField,nextPhase} from '@/domain/dreamWorkspace';
export default function Workspace(){
 const {id}=useLocalSearchParams<{id:string}>();
 const {items,update,add,advance,complete,remove}=useDreams();
 const dream=items.find(x=>x.id===id);
 const [participantsOpen,setParticipantsOpen]=useState(false),[editingImage,setEditingImage]=useState(false);
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
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={25}/></Pressable><Pressable onPress={()=>setEditingImage(v=>!v)} accessibilityLabel="Changer l’image"><Ionicons name="image-outline" color="#252525" size={23}/></Pressable></View>
 <Text style={{fontWeight:'700',fontSize:23,textAlign:'center',marginVertical:10}}>{dream!.title}</Text>
 <Text style={{fontSize:12,color:'#777',textAlign:'center',marginBottom:15}}>{PHASE_LABELS[dream!.phase]} · Titre définitif</Text>
 <Pressable onPress={()=>setParticipantsOpen(v=>!v)} style={{alignSelf:'center',flexDirection:'row',gap:7,alignItems:'center',marginBottom:12,padding:8}}><Ionicons name="people-outline" size={18} color="#666"/><Text style={{fontSize:12,color:'#555'}}>Qui partage mon rêve ?</Text><Ionicons name={participantsOpen?'chevron-up':'chevron-down'} size={16} color="#aaa"/></Pressable>{participantsOpen?<View style={{padding:12,backgroundColor:'#f7f7f7',borderRadius:9}}><Text style={{fontSize:12}}>Participants : {dream!.ownerIds.join(', ')}</Text><Text style={{fontSize:11,color:'#888',marginTop:5}}>Invitations à connecter ultérieurement</Text></View>:null}
 <View style={{height:220,borderRadius:15,overflow:'hidden',backgroundColor:'#ececec',justifyContent:'flex-end'}}><Image source={{uri:dream!.image}} resizeMode="cover" style={{position:'absolute',width:'100%',height:'100%',opacity:.7}}/><View style={{padding:16,backgroundColor:'rgba(255,255,255,.78)'}}><Text style={{fontFamily:'Caveat_700Bold',fontSize:23,color:'#222'}}>{dream!.title}</Text><Text style={{fontSize:12,color:'#555'}}>{PHASE_LABELS[dream!.phase]}</Text></View></View>
 {editingImage?<View style={{padding:12,borderWidth:1,borderColor:'#ddd',borderRadius:10,marginTop:12}}><Pressable onPress={()=>pickDreamImage(uri=>{update(dream!.id,'image',uri);setEditingImage(false)},message=>Alert.alert('Image',message))} style={{padding:11,borderWidth:1,borderColor:'#ccc',borderRadius:8}}><Text style={{textAlign:'center',fontWeight:'700'}}>Importer une image</Text></Pressable><Text style={{fontSize:12,marginTop:10}}>Ou choisir une image intégrée</Text><View style={{flexDirection:'row',gap:8,marginTop:9}}>{['https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800','https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800'].map(url=><Pressable key={url} onPress={()=>{update(dream!.id,'image',url);setEditingImage(false)}}><Image source={{uri:url}} style={{height:72,width:110,borderRadius:8}}/></Pressable>)}</View><Text style={{fontSize:11,color:'#888',marginTop:7}}>Import local depuis le navigateur (max. 2 Mo). Sur mobile natif, images intégrées pour le moment.</Text></View>:null}
 <Text style={{fontSize:15,fontWeight:'700',marginTop:14}}>Mon but</Text>
 <TextInput multiline value={dream!.summary} onChangeText={v=>update(dream!.id,'summary',v)} style={{borderWidth:1,borderColor:'#ddd',borderRadius:9,padding:11,marginTop:7,minHeight:72}}/>
 <Text style={{fontWeight:'700',fontSize:15,marginTop:18}}>Ma motivation</Text><TextInput multiline value={dream!.motivation||''} onChangeText={v=>update(dream!.id,'motivation',v)} placeholder="Pourquoi ce rêve compte pour moi…" style={{borderWidth:1,borderColor:'#ddd',borderRadius:9,padding:11,marginTop:8,minHeight:65}}/>
 {initiated?<><Text style={{fontWeight:'700',fontSize:15,marginTop:17}}>Date objectif</Text><TextInput value={dream!.goalDate||''} onChangeText={v=>update(dream!.id,'goalDate',v)} placeholder="AAAA-MM-JJ" style={{borderWidth:1,borderColor:'#ddd',borderRadius:9,padding:11,marginTop:8}}/></>:null}

 <Text style={{fontWeight:'700',fontSize:15,marginTop:17}}>De ce que j’ai besoin</Text>
 {dream!.needs.map(n=><Pressable key={n} onPress={()=>{const resolved=dream!.resolvedNeeds||[];update(dream!.id,'resolvedNeeds',resolved.includes(n)?resolved.filter(v=>v!==n):[...resolved,n])}} style={{flexDirection:'row',gap:8,alignItems:'center',padding:9,marginTop:5,backgroundColor:(dream!.resolvedNeeds||[]).includes(n)?'#E5F5EC':'#FFF2E9',borderRadius:8}}><Ionicons name={(dream!.resolvedNeeds||[]).includes(n)?'checkmark-circle':'ellipse-outline'} size={20} color={(dream!.resolvedNeeds||[]).includes(n)?'#388D62':'#D58A41'}/><Text>{n}</Text></Pressable>)}
 <Text style={{fontWeight:'700',fontSize:15,marginTop:24}}>{editable?'Mes inspirations et notes':initiated?'Ajouter au projet':growing?'Journal de croissance':'Mon témoignage'}</Text>
 {[...dream!.additions,...dream!.notes].map((n,i)=><View key={i} style={{flexDirection:'row',alignItems:'center',gap:9,marginTop:9}}><Ionicons name={growing?'leaf-outline':'document-text-outline'} size={19} color={growing?'#4F967F':'#888'}/><Text style={{flex:1,padding:10,backgroundColor:'#f5f5f5',borderRadius:7,fontSize:12}}>{n}</Text></View>)}
 {dream!.testimony?<Text style={{marginTop:10,fontSize:13}}>{dream!.testimony.mediaType.toUpperCase()} · {dream!.testimony.comment} {dream!.testimony.mediaUrl||''}</Text>:null}
 {dream!.phase!=='Témoignage'?<>
  <TextInput multiline value={entry} onChangeText={setEntry} placeholder={growing?'Commentaire sur la progression…':initiated?'Ajouter un détail, un besoin ou une idée…':'Note ou idée à garder…'} style={{borderWidth:1,borderColor:'#ddd',borderRadius:9,padding:11,minHeight:72,marginTop:10}}/>
  {button('Ajouter',()=>{if(entry.trim()){add(dream!.id,entry.trim(),growing?'notes':'additions');setEntry('')}})}
 </>:null}
 {editable?button('Planter cette semence',()=>advance(dream!.id)):null}
 {initiated?button('Chercher des talents',()=>router.push('/discover?filter=Talents')):null}
 {initiated?button('Faire grandir cette plante',()=>advance(dream!.id)):null}
 {(editable||initiated||growing)?button(editable?'Arracher cette semence':initiated?'Arracher ce germe':'Arracher cette plante',deleteDream):null}
 {growing?button(dream!.paused?'Réveiller cette plante':'C’est l’hiver pour cette plante',()=>{if(dream!.paused)update(dream!.id,'paused',false);else Alert.alert('Mettre en hiver','La plante ne sera plus montrée publiquement lors de la synchronisation.',[{text:'Annuler',style:'cancel'},{text:'Confirmer',onPress:()=>update(dream!.id,'paused',true)}])}):null}
 {growing?<View style={{borderTopWidth:1,borderColor:'#eee',marginTop:27,paddingTop:17}}>
  <Text style={{fontWeight:'700'}}>Mon journal de croissance</Text>
  {button('Admirer les fleurs de cette plante',()=>router.push({pathname:'/my-dream/flower/[id]',params:{id:dream!.id}}))}
 </View>:null}
 <Text style={{marginTop:24,fontSize:10,color:'#aaa'}}>Fonctions locales de démonstration. Les droits des co-propriétaires et les médias réels seront validés côté serveur.</Text>
 </ScrollView><Nav/></SafeAreaView>;
}
