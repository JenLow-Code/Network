import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {api} from '@/lib/api/client';
import type {MusicProject} from '@/domain/musicWorkspace';
const pink='#CB245C';
type Proposal={id:string;status:string;description:string;proposer?:{displayName?:string}};
export function MusicOwnerProposals({project,patch}:{
  project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
}){
  const theme=useAppTheme();
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState<Proposal[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');
  useEffect(()=>{
    if(!project.publishedId){setItems([]);return;}
    let live=true;
    void api<{items:Proposal[]}>('/api/music/'+encodeURIComponent(project.publishedId)+
      '/proposals',{auth:'required'}).then(x=>{if(live)setItems(x.items||[]);})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:'Propositions non accessibles.');});
    return()=>{live=false;};
  },[project.publishedId]);
  const action=async(id:string,choice:'accept'|'reject'|'publish')=>{
    setBusy(id);setError('');
    try{
      await api('/api/music-proposals/'+encodeURIComponent(id)+'/'+choice,
        {method:'POST',auth:'required',body:{}});
      setItems(old=>old.map(p=>p.id===id?{...p,status:choice==='accept'?'accepted':
        choice==='reject'?'rejected':'published'}:p));
    }catch(e){setError(e instanceof Error?e.message:'Action impossible.');}
    finally{setBusy('');}
  };
  const btn=(title:string,cb:()=>void,disabled=false)=><Pressable
    disabled={disabled} onPress={cb} style={{borderWidth:1,borderColor:pink,
      paddingVertical:9,paddingHorizontal:12,borderRadius:9,opacity:disabled?0.4:1}}>
    <Text style={{color:pink,fontSize:12,fontWeight:'700'}}>{title}</Text>
  </Pressable>;
  const visible=items.filter(x=>!(project.archivedRemoteProposals||[]).includes(x.id));
  return <View style={{borderWidth:1,borderColor:theme.border,borderRadius:16,
    backgroundColor:theme.surface,padding:14,gap:10}}>
    <Pressable onPress={()=>setOpen(!open)} style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <Ionicons name="git-pull-request-outline" color={pink} size={21}/>
      <View style={{flex:1,gap:3}}>
        <Text style={{fontWeight:'700',fontSize:16,color:theme.foreground}}>Propositions reçues</Text>
        <Text style={{color:theme.muted,fontSize:11}}>
          {visible.length} proposition(s) en ligne
        </Text>
      </View>
      <Ionicons name={open?'chevron-up':'chevron-down'} color={theme.muted} size={19}/>
    </Pressable>
    {open?<View style={{gap:12}}>
      {!project.publishedId?<Text style={{fontSize:12,color:theme.muted}}>
        Les propositions externes apparaîtront quand le morceau sera publié.
      </Text>:null}
      {visible.map(p=><View key={p.id}
        style={{padding:11,borderRadius:11,backgroundColor:theme.background,gap:8}}>
        <Text style={{color:theme.foreground,fontWeight:'700',fontSize:13}}>
          {p.proposer?.displayName||'Musicien'} · {p.status}
        </Text>
        <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>{p.description}</Text>
        <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
          {p.status==='submitted'?<>
            {btn('Accepter',()=>{void action(p.id,'accept');},busy===p.id)}
            {btn('Refuser',()=>{void action(p.id,'reject');},busy===p.id)}
          </>:null}
          {p.status==='accepted'?btn('Publier son mix',()=>{void action(p.id,'publish');},busy===p.id):null}
          {btn('Archiver',()=>patch({
            archivedRemoteProposals:[...(project.archivedRemoteProposals||[]),p.id],
          }))}
        </View>
      </View>)}
      {!visible.length?<Text style={{fontSize:12,color:theme.muted}}>Aucune proposition visible.</Text>:null}
      {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
    </View>:null}
  </View>;
}
