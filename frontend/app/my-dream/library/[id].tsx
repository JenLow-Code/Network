import React, { useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import { appendDocumentVersion, isSafeDocumentUrl } from '@/domain/dreamDocumentLibrary';
import type { DreamBlock, DreamDocument, DreamDocumentVersion } from '@/domain/dreamWorkspace';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';

const MAX_LOCAL_FILE = 1_000_000;
const readableDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
};
const sizeLabel=(size?:number) => size ? (size / 1024).toFixed(0)+' Ko' : '';
function inform(title:string,detail:string) {
  if(Platform.OS==='web' && typeof window!=='undefined') window.alert(title+'\n'+detail);
  else Alert.alert(title,detail);
}
function openStoredDocument(version:DreamDocumentVersion) {
  if(version.source==='link'){
    if(isSafeDocumentUrl(version.uri))void Linking.openURL(version.uri).catch(()=>inform('Lien indisponible','Impossible d’ouvrir ce lien.'));
    return;
  }
  // A saved local file belongs to its author; never turn an arbitrary external URL into a download.
  if(Platform.OS==='web' && typeof document!=='undefined' && version.uri.startsWith('data:')){
    const a=document.createElement('a');
    a.href=version.uri;
    a.download=version.name;
    a.rel='noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    inform('Fichier local','Ce fichier est enregistré dans ce navigateur. Ouvre la bibliothèque depuis la version web pour le consulter.');
  }
}
function inspirationIcon(kind:DreamBlock['kind']): keyof typeof Ionicons.glyphMap {
  if(kind==='image'||kind==='gallery')return 'image-outline';
  if(kind==='audio'||kind==='music')return 'musical-notes-outline';
  if(kind==='video')return 'videocam-outline';
  if(kind==='pdf'||kind==='document')return 'document-text-outline';
  if(kind==='link'||kind==='bookmark')return 'link-outline';
  return 'sparkles-outline';
}
export default function DreamLibrary(){
  const {id}=useLocalSearchParams<{id:string}>();
  const theme=useAppTheme();
  const {items,patch}=useDreams();
  const dream=items.find(d=>d.id===id);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [addingLink,setAddingLink]=useState(false);
  const [linkName,setLinkName]=useState('');
  const [linkUrl,setLinkUrl]=useState('');
  const [search,setSearch]=useState('');
  const docs=dream?.documents||[];
  const paused=!!dream?.paused&&!!dream.pauseUntil&&dream.pauseUntil>=new Date().toISOString().slice(0,10);
  const editable=!!dream&&dream.phase!=='Témoignage'&&!paused;
  const saveDoc=(next:DreamDocument[])=>{if(dream&&editable)patch(dream.id,{documents:next});};
  const importFiles=()=>{
    if(!editable)return;
    if(Platform.OS!=='web' || typeof document==='undefined'){
      inform('Import de fichier','L’import natif sera disponible après l’ajout du sélecteur de documents iOS/Android. Tu peux déjà enregistrer un lien vers ton fichier.');
      return;
    }
    const chooser=document.createElement('input');
    chooser.type='file';
    chooser.multiple=true;
    chooser.accept='.pdf,.txt,.md,.doc,.docx,.odt,.rtf,.csv,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.mp3,.wav,.mp4,application/pdf,image/*,audio/*';
    chooser.onchange=async()=>{
      const files=Array.from(chooser.files||[]).slice(0,4);
      if(files.length===0)return;
      if(files.some(file=>file.size>MAX_LOCAL_FILE)){
        inform('Fichier trop volumineux','Pour ce stockage local, la limite est de 1 Mo par fichier. Enregistre plutôt un lien vers les documents plus volumineux.');
        return;
      }
      let next=docs;
      for(const file of files){
        try{
          const uri=await new Promise<string>((resolve,reject)=>{
            const reader=new FileReader();
            reader.onerror=()=>reject(new Error('read'));
            reader.onload=()=>typeof reader.result==='string'
              ?resolve(reader.result):reject(new Error('format'));
            reader.readAsDataURL(file);
          });
          next=appendDocumentVersion(next,file.name,{
            uri,source:'file',mimeType:file.type||undefined,size:file.size,
          });
        }catch{
          inform('Import impossible','Impossible de lire '+file.name);
          return;
        }
      }
      saveDoc(next);
    };
    chooser.click();
  };
  const saveLink=()=>{
    const name=linkName.trim(),uri=linkUrl.trim();
    if(!name){inform('Nom requis','Donne un nom à ce document.');return;}
    if(!isSafeDocumentUrl(uri)){inform('Adresse non valide','Utilise un lien commençant par https:// ou http://.');return;}
    saveDoc(appendDocumentVersion(docs,name,{uri,source:'link'}));
    setAddingLink(false);
    setLinkName('');setLinkUrl('');
  };
  const matching=docs.filter(doc=>doc.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .slice().reverse();
  const archive=(dream?.blocks||[]).filter(block=>block.content||block.media?.length);
  const legacyDocs=archive.filter(block=>['document','pdf'].includes(block.kind));
  // Checklists belong to the private Notes tab, not the inspiration archive.
  const inspirations=archive.filter(block=>!['document','pdf','todo'].includes(block.kind));
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      paddingHorizontal:18,paddingTop:10,paddingBottom:110,
      maxWidth:780,width:'100%',alignSelf:'center',minHeight:'100%',
    }}>
      <PageHeader/>
      <Text style={{fontFamily:'serif',fontSize:30,lineHeight:39,
        color:theme.foreground,marginBottom:7}}>
        Inspirations & documents
      </Text>
      <Text style={{color:theme.muted,fontSize:12,lineHeight:19,marginBottom:19}}>
        {dream?.title||'Rêve'} · Tes références et fichiers au même endroit.
      </Text>
      <Text style={{fontSize:11,color:theme.muted,marginBottom:16,lineHeight:18}}>
        Une seule bibliothèque pour tes documents et les inspirations de Semence.
      </Text>
        <View style={{gap:11}}>
          <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700',marginBottom:5}}>Documents</Text>
          {editable?<View style={{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:4}}>
            <Pressable accessibilityRole="button" onPress={importFiles}
              style={{flexDirection:'row',alignItems:'center',gap:7,
                paddingHorizontal:12,minHeight:42,borderRadius:10,
                backgroundColor:theme.dark?'#3A4540':'#EAF1EC'}}>
              <Ionicons name="document-attach-outline" color="#27845B" size={17}/>
              <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
                Importer un fichier
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={()=>setAddingLink(!addingLink)}
              style={{flexDirection:'row',alignItems:'center',gap:7,
                paddingHorizontal:12,minHeight:42,borderRadius:10,
                borderWidth:1,borderColor:theme.border}}>
              <Ionicons name="link-outline" size={17} color={theme.foreground}/>
              <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
                Ajouter un lien
              </Text>
            </Pressable>
          </View>:null}
          {addingLink&&editable?<View style={{borderWidth:1,borderColor:theme.border,
            borderRadius:11,padding:13,gap:10}}>
            <TextInput value={linkName} onChangeText={setLinkName}
              placeholder="Nom du document" placeholderTextColor={theme.muted}
              style={{borderWidth:1,borderColor:theme.border,borderRadius:8,
                padding:12,color:theme.foreground,fontSize:13}}/>
            <TextInput value={linkUrl} onChangeText={setLinkUrl}
              keyboardType="url" autoCapitalize="none"
              placeholder="https://…" placeholderTextColor={theme.muted}
              style={{borderWidth:1,borderColor:theme.border,borderRadius:8,
                padding:12,color:theme.foreground,fontSize:13}}/>
            <Pressable onPress={saveLink} accessibilityRole="button"
              style={{padding:12,backgroundColor:'#27845B',borderRadius:9,alignItems:'center'}}>
              <Text style={{fontSize:12,color:'#FFFFFF',fontWeight:'700'}}>Enregistrer le lien</Text>
            </Pressable>
          </View>:null}
          {docs.length>3?<TextInput value={search} onChangeText={setSearch}
            placeholder="Rechercher un document…" placeholderTextColor={theme.muted}
            style={{padding:12,borderRadius:9,borderWidth:1,
              borderColor:theme.border,color:theme.foreground}}/>:null}
          {matching.map(doc=>{
            const latest=doc.versions[doc.versions.length-1];
            const expandedHere=expanded===doc.id;
            return <View key={doc.id} style={{borderBottomWidth:1,
              borderColor:theme.border,paddingVertical:10,gap:9}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
                <View style={{width:40,height:45,borderRadius:9,
                  backgroundColor:theme.dark?'#2C363A':'#E7EEF1',
                  justifyContent:'center',alignItems:'center'}}>
                  <Ionicons name={latest?.source==='link'?'link-outline':'document-text-outline'}
                    size={22} color="#397F9E"/>
                </View>
                <Pressable onPress={()=>latest&&openStoredDocument(latest)}
                  accessibilityRole="button" style={{flex:1,gap:5}}>
                  <Text numberOfLines={2} style={{fontSize:14,
                    fontWeight:'700',color:theme.foreground}}>{doc.name}</Text>
                  <Text style={{fontSize:11,color:theme.muted}}>
                    Version {doc.versions.length} · {latest?readableDate(latest.addedAt):''}
                    {latest?.size?' · '+sizeLabel(latest.size):''}
                  </Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={'Voir les versions de '+doc.name}
                  onPress={()=>setExpanded(expandedHere?null:doc.id)}
                  style={{padding:10}}>
                  <Ionicons name={expandedHere?'chevron-up-outline':'chevron-down-outline'}
                    color={theme.muted} size={21}/>
                </Pressable>
              </View>
              {expandedHere?<View style={{paddingLeft:51,gap:7}}>
                {[...doc.versions].reverse().map((v,i)=><Pressable key={v.id}
                  onPress={()=>openStoredDocument(v)}
                  accessibilityRole="button"
                  style={{paddingVertical:9,flexDirection:'row',alignItems:'center',
                    gap:10,borderTopWidth:.5,borderColor:theme.border}}>
                  <Text style={{flex:1,fontSize:12,color:theme.foreground}}>
                    V{doc.versions.length-i} · {readableDate(v.addedAt)}
                    {v.size?' · '+sizeLabel(v.size):''}
                  </Text>
                  <Ionicons name={v.source==='link'?'open-outline':'download-outline'}
                    size={16} color="#397F9E"/>
                </Pressable>)}
                {editable?<Pressable onPress={()=>{
                  const remove=()=>saveDoc(docs.filter(d=>d.id!==doc.id));
                  if(Platform.OS==='web'&&typeof window!=='undefined'){
                    if(window.confirm('Supprimer toutes les versions de « '+doc.name+' » ?'))remove();
                  }else Alert.alert('Supprimer ce document ?',
                    'Toutes les versions seront supprimées de cet appareil.',
                    [{text:'Annuler',style:'cancel'},{text:'Supprimer',style:'destructive',onPress:remove}]);
                }} accessibilityRole="button" style={{paddingVertical:10}}>
                  <Text style={{fontSize:11,color:'#B55164'}}>Supprimer toutes les versions</Text>
                </Pressable>:null}
              </View>:null}
            </View>;
          })}
          {docs.length===0?<View style={{paddingVertical:25,alignItems:'center',gap:9}}>
            <Ionicons name="folder-open-outline" size={31} color="#397F9E"/>
            <Text style={{fontSize:13,color:theme.foreground,fontWeight:'600'}}>
              Aucun document pour le moment
            </Text>
            <Text style={{fontSize:12,color:theme.muted,textAlign:'center',
              lineHeight:19,maxWidth:330}}>
              Garde ici tes partitions, paroles, contrats, plans ou références.
            </Text>
          </View>:null}
          {legacyDocs.length>0?<View style={{gap:9,marginTop:10}}>
            <Text style={{fontSize:12,color:theme.muted,fontWeight:'700'}}>
              Documents de la Semence
            </Text>
            {legacyDocs.map(block=><Pressable key={block.id}
              onPress={()=>{
                if(isSafeDocumentUrl(block.content))void Linking.openURL(block.content).catch(()=>{});
              }}
              style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8}}>
              <Ionicons name="document-outline" size={21} color="#B88962"/>
              <Text numberOfLines={2} style={{fontSize:12,color:theme.foreground,flex:1}}>
                {block.title||block.content}
              </Text>
              <Ionicons name="open-outline" size={16} color={theme.muted}/>
            </Pressable>)}
          </View>:null}
          <Text style={{fontSize:11,color:theme.muted,lineHeight:18,marginTop:15}}>
            Enregistrer le même nom ajoute automatiquement une version. Les fichiers importés
            sont conservés localement sur cet appareil (1 Mo maximum par fichier).
            Ils ne sont pas encore synchronisés entre tes appareils.
          </Text>
        </View>
        <View style={{gap:11,marginTop:22}}>
          <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700',marginBottom:4}}>Inspirations</Text>
          <Text style={{fontSize:11,color:theme.muted,lineHeight:19,marginBottom:4}}>
            Les inspirations de Semence sont conservées comme référence.
            Elles se modifient uniquement dans la Semence lorsqu’elle est active.
          </Text>
          {inspirations.length===0?<View style={{paddingVertical:25,alignItems:'center',gap:9}}>
            <Ionicons name="images-outline" size={29} color={theme.muted}/>
            <Text style={{color:theme.muted,fontSize:12,textAlign:'center'}}>
              Aucune inspiration conservée pour ce rêve.
            </Text>
          </View>:null}
          {inspirations.map(block=>{
            const media=block.media?.[0]||block.content;
            const visual=['image','gallery'].includes(block.kind)&&/^(data:|https?:|file:)/.test(media);
            const remote=/^https?:\/\//i.test(block.content);
            return <Pressable key={block.id}
              disabled={!remote}
              onPress={()=>{if(remote)void Linking.openURL(block.content).catch(()=>{});}}
              style={{padding:13,borderWidth:1,borderColor:theme.border,
                borderRadius:11,flexDirection:'row',gap:12,alignItems:'center'}}>
              {visual?<Image source={{uri:media}} resizeMode="cover"
                style={{width:64,height:64,borderRadius:8}}/>:
                <View style={{width:46,height:48,alignItems:'center',justifyContent:'center',
                  backgroundColor:theme.surface,borderRadius:9}}>
                  <Ionicons name={inspirationIcon(block.kind)} color="#B88962" size={22}/>
                </View>}
              <View style={{flex:1,gap:5}}>
                <Text numberOfLines={2} style={{fontSize:14,
                  fontWeight:'600',color:theme.foreground}}>
                  {block.title||block.content.slice(0,100)||'Inspiration'}
                </Text>
                {!!block.title&&!!block.content?<Text numberOfLines={2}
                  style={{fontSize:12,color:theme.muted,lineHeight:18}}>
                  {block.content.startsWith('data:')?'Média conservé':block.content}
                </Text>:null}
              </View>
              {remote?<Ionicons name="open-outline" size={18} color={theme.muted}/>:null}
            </Pressable>;
          })}
        </View>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
