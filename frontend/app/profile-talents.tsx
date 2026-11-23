import { Text, TextInput } from '@/i18n/LocalizedText';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceCanvas, workspaceLayout } from '@/theme/workspaceLayout';
import { ProfileTalentTile } from '@/components/talent/ProfileTalentTile';
import { DREAM_TALENT_CHOICES } from '@/components/dream/dreamTalentCatalog';
import { TranslatorLanguageFields } from '@/components/talent/TranslatorLanguageFields';
import type { TalentIllustration } from '@/components/talent/TalentArt';

type Talent = { name: string; level: number; interests: string[]; description?: string; sourceLanguage?: string; targetLanguage?: string };
const initial: Talent[] = [
  { name: 'Batterie', level: 2, interests: ['Tandem', 'Enseigner'] },
  { name: 'Chant', level: 1, interests: ['Tandem', 'Apprendre'] },
  { name: 'Piano', level: 3, interests: ['Tandem', 'Enseigner'] },
];
const levels = [
  { name: 'Grand débutant', color: '#287D58' },
  { name: 'Quelques notions', color: '#2ECA65' },
  { name: 'Intermédiaire', color: '#EAC000' },
  { name: 'Avancé', color: '#F38A24' },
  { name: 'Professionnel', color: '#CB245C' },
];
const interests = ['Tandem', 'Enseigner', 'Apprendre'];
const TALENT_NAMES=[...new Set([
  'Batterie','Chant','Piano',...DREAM_TALENT_CHOICES.map(item=>item.title),
])];
const talentArt = (name: string): TalentIllustration | undefined => {
 const s=name.toLocaleLowerCase('fr');
 if(s.includes('batt'))return 'drums';
 if(s.includes('chant')||s.includes('voix'))return 'singing';
 if(s.includes('piano'))return 'piano';
 if(s.includes('photo'))return 'camera';
 if(s.includes('guit'))return 'acoustic-guitar';
 if(s.includes('violon'))return 'violin';
 if(s.includes('basse'))return 'bass';
 if(s.includes('saxo'))return 'saxophone';
 if(s.includes('tromp'))return 'trumpet';
 if(s.includes('violoncelle'))return 'cello';
 if(s.includes('ukul'))return 'ukulele';
 return undefined;
};

export default function ProfileTalents() {
  const app=useApp(),theme=useAppTheme();
  const {width}=useWindowDimensions();
  const ws=workspaceLayout(width);
  const [talents, setTalents] = useState<Talent[]>(initial);
  const [loaded, setLoaded] = useState(false);
  const [newTalent, setNewTalent] = useState('');
  const [newLevel,setNewLevel]=useState(-1);
  const [newDescription,setNewDescription]=useState('');
  const [newInterests,setNewInterests]=useState<string[]>([]);
  const [newSourceLanguage,setNewSourceLanguage] = useState('');
  const [newTargetLanguage,setNewTargetLanguage] = useState('');
  const [addLanguageError,setAddLanguageError] = useState(false);
  const [addTalentOpen,setAddTalentOpen]=useState(false);
  const [talentPickerOpen,setTalentPickerOpen]=useState(false);
  const [selectedTalent, setSelectedTalent] = useState<number | null>(null);
  const storage = 'jenlow.profile.talents.' + (app.email || 'guest').toLowerCase();
  useEffect(() => {
    let active = true;
    setLoaded(false);
    void AsyncStorage.getItem(storage)
      .then(raw => {
        if (!active) return;
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) setTalents(list);
          } catch {
            setTalents(initial);
          }
        } else setTalents(initial);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [storage]);
  useEffect(() => {
    if (loaded) void AsyncStorage.setItem(storage, JSON.stringify(talents)).catch(() => {});
  }, [storage, loaded, talents]);
  const updateTalent = (index: number, patch: Partial<Talent>) =>
    setTalents(items => items.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  // Use the same visible and accessible level selector when creating or editing.
  const levelPicker=(value:number,onChange:(next:number)=>void)=>
    <View style={{gap:11}}>
      <View style={{flexDirection:'row',alignItems:'center',
        justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
        <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>Mon niveau</Text>
        <Text style={{fontSize:12,color:theme.muted}}>
          {levels[value]?.name||'À définir'}
        </Text>
      </View>
      <View accessibilityRole="radiogroup" style={{flexDirection:'row',
        justifyContent:'space-around',alignItems:'center',gap:9,
        paddingVertical:9,paddingHorizontal:5,
        borderWidth:1,borderColor:theme.border,borderRadius:10}}>
        {levels.map((l,i)=><Pressable key={l.name}
          accessibilityRole="radio"
          accessibilityLabel={l.name+' (niveau '+(i+1)+' sur 5)'}
          accessibilityState={{selected:i===value}}
          onPress={()=>onChange(i)}
          style={{width:42,height:36,alignItems:'center',justifyContent:'center'}}>
          <View style={{width:27,height:27,borderRadius:14,
            backgroundColor:i<=value?l.color:theme.border,
            borderWidth:i===value?2:0,borderColor:theme.foreground,
            alignItems:'center',justifyContent:'center'}}>
            {i===value?<Ionicons name="checkmark" size={14}
              color={i===2?'#171717':'#FFFFFF'}/>:null}
          </View>
        </Pressable>)}
      </View>
    </View>;
  // Tiles use the exact width inside the shared workspace canvas,
  // including the desktop back-arrow rail and right navigation column.
  const canvasWidth=Math.max(0,Math.min(ws.maxWidth??width,width-(ws.desktop?236:0)));
  const areaWidth=Math.max(0,canvasWidth-ws.contentGutter-ws.gutter);
  const columns=areaWidth<350?2:areaWidth<850?3:4;
  const cardWidth=Math.floor((areaWidth-10*(columns-1))/columns);
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView contentContainerStyle={{...workspaceCanvas(width),
      paddingTop:12,paddingBottom:80}}>
      <PageHeader title="Mes talents" onBack={()=>router.replace('/profile')}/>
      <View style={{marginTop:ws.desktop?30:22}}>
        <Text style={{ fontSize: 12, color: theme.muted, lineHeight: 18 }}>
          Choisis ton niveau et ce que tu souhaites partager. Les talents seront visibles dans
          Découvrir lorsque les profils seront publiés.
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:16}}>
          {talents.map((t,index)=><ProfileTalentTile key={index} title={t.name} level={levels[t.level]?.name||'À définir'}
            subtitle={t.name.toLocaleLowerCase('fr')==='traducteur'&&t.sourceLanguage&&t.targetLanguage
              ?t.sourceLanguage+' → '+t.targetLanguage:undefined}
            art={talentArt(t.name)} width={cardWidth} onPress={()=>setSelectedTalent(index)}/>)}
          <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un talent" onPress={()=>setAddTalentOpen(true)}
            style={{width:cardWidth,height:cardWidth,borderRadius:10,borderWidth:1.5,
              borderStyle:'dashed',borderColor:'#27845B',backgroundColor:theme.surface,
              alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="add" size={27} color="#27845B"/>
          </Pressable>
        </View>
      </View>
    </ScrollView>
      <Modal visible={addTalentOpen} transparent animationType="fade"
        onRequestClose={()=>setAddTalentOpen(false)}>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,.56)',justifyContent:'center',padding:19}}>
          <Pressable onPress={()=>setAddTalentOpen(false)}
            style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
          <ScrollView keyboardShouldPersistTaps="handled"
            style={{backgroundColor:theme.surface,maxWidth:430,width:'100%',
              alignSelf:'center',maxHeight:'88%',borderRadius:15}}
            contentContainerStyle={{padding:21,gap:15}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
              <Text style={{fontSize:20,fontWeight:'700',color:theme.foreground}}>Ajouter un talent</Text>
              <Pressable onPress={()=>setAddTalentOpen(false)} accessibilityLabel="Fermer">
                <Ionicons name="close-outline" size={23} color={theme.foreground}/>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button"
              accessibilityLabel="Choisir un talent dans la liste"
              accessibilityState={{expanded:talentPickerOpen}}
              onPress={()=>setTalentPickerOpen(value=>!value)}
              style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                minHeight:45,paddingHorizontal:13,borderWidth:1,
                borderColor:theme.border,borderRadius:10}}>
              <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>
                {TALENT_NAMES.includes(newTalent)?newTalent:'Choisir un talent'}
              </Text>
              <Ionicons name={talentPickerOpen?'chevron-up':'chevron-down'} size={18}
                color={theme.muted}/>
            </Pressable>
            {talentPickerOpen?<ScrollView nestedScrollEnabled
              keyboardShouldPersistTaps="handled" style={{maxHeight:190}}
              contentContainerStyle={{gap:2}}>
              {TALENT_NAMES.map(name=><Pressable key={name}
                onPress={()=>{setNewTalent(name);setTalentPickerOpen(false);
                  setAddLanguageError(false);}}
                accessibilityRole="button" accessibilityLabel={'Sélectionner '+name}
                accessibilityState={{selected:newTalent===name}}
                style={{minHeight:40,flexDirection:'row',alignItems:'center',
                  paddingHorizontal:12,borderRadius:8,
                  backgroundColor:newTalent===name?
                    (theme.dark?'#452B36':'#FAEDF2'):'transparent'}}>
                <Text style={{flex:1,fontSize:13,color:theme.foreground}}>{name}</Text>
                {newTalent===name?<Ionicons name="checkmark" color="#CB245C" size={17}/>:null}
              </Pressable>)}
            </ScrollView>:null}
            <Text style={{fontSize:11,color:theme.muted}}>
              Ou écris un talent personnalisé :
            </Text>
            <TextInput value={newTalent} onChangeText={setNewTalent} maxLength={70}
              placeholder="Ex. Guitare, photographie, chant…"
              style={{borderWidth:1,borderColor:theme.border,borderRadius:10,
                padding:13,color:theme.foreground,fontSize:14}}/>
            {newTalent.trim().toLocaleLowerCase('fr')==='traducteur'?<TranslatorLanguageFields
              sourceLanguage={newSourceLanguage} targetLanguage={newTargetLanguage}
              onChangeSource={v=>{setNewSourceLanguage(v);setAddLanguageError(false);}}
              onChangeTarget={v=>{setNewTargetLanguage(v);setAddLanguageError(false);}}/>:null}
            {addLanguageError?<Text style={{color:'#C34D65',fontSize:12}}>
              Indique les deux langues de traduction.
            </Text>:null}
            {levelPicker(newLevel,setNewLevel)}
            <View style={{gap:7}}>
              <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>
                Ma présentation
              </Text>
              <TextInput multiline value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Ce que je peux partager, mon expérience…"
                style={{minHeight:84,borderWidth:1,borderColor:theme.border,
                  borderRadius:10,padding:12,color:theme.foreground,
                  fontSize:13,textAlignVertical:'top'}}/>
            </View>
            <View style={{gap:9}}>
              <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>
                Je souhaite
              </Text>
              <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
                {interests.map(interest=><Pressable key={interest}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked:newInterests.includes(interest)}}
                  onPress={()=>setNewInterests(items=>items.includes(interest)
                    ?items.filter(item=>item!==interest):[...items,interest])}
                  style={{paddingVertical:9,paddingHorizontal:11,borderWidth:1,
                    borderColor:newInterests.includes(interest)?'#CB245C':theme.border,
                    borderRadius:9,backgroundColor:newInterests.includes(interest)
                      ?(theme.dark?'rgba(203,36,92,.2)':'#FAEDF2'):'transparent'}}>
                  <Text style={{color:theme.foreground,fontSize:12}}>{interest}</Text>
                </Pressable>)}
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={()=>{
              if(!newTalent.trim())return;
              const translator=newTalent.trim().toLocaleLowerCase('fr')==='traducteur';
              if(translator&&(!newSourceLanguage.trim()||!newTargetLanguage.trim())){
                setAddLanguageError(true);return;
              }
              setTalents(items=>[...items,{
                name:translator?'Traducteur':newTalent.trim(),
                level:newLevel,
                description:newDescription.trim(),
                interests:newInterests,
                sourceLanguage:translator?newSourceLanguage.trim():undefined,
                targetLanguage:translator?newTargetLanguage.trim():undefined,
              }]);
              setNewTalent('');setNewLevel(-1);setNewDescription('');setNewInterests([]);
              setNewSourceLanguage('');setNewTargetLanguage('');
              setAddLanguageError(false);setAddTalentOpen(false);setTalentPickerOpen(false);
            }} style={{backgroundColor:'#242322',borderRadius:10,padding:14,alignItems:'center'}}>
              <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>Ajouter à mon profil</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
      <Modal visible={selectedTalent!==null} transparent animationType="fade" onRequestClose={()=>setSelectedTalent(null)}>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',padding:18}}>
          <ScrollView style={{backgroundColor:theme.surface,borderRadius:14,maxWidth:470,width:'100%',alignSelf:'center',maxHeight:'85%'}} contentContainerStyle={{padding:20,gap:14}}>
            <Pressable onPress={()=>setSelectedTalent(null)} style={{alignSelf:'flex-end',padding:6}}><Ionicons name="close" size={23} color={theme.foreground}/></Pressable>
            {selectedTalent!==null&&talents[selectedTalent] ? <>
              <Text style={{fontSize:24,fontWeight:'700',color:theme.foreground,textAlign:'center'}}>{talents[selectedTalent].name}</Text>
              {talents[selectedTalent].name.toLocaleLowerCase('fr')==='traducteur'?<TranslatorLanguageFields
                sourceLanguage={talents[selectedTalent].sourceLanguage||''}
                targetLanguage={talents[selectedTalent].targetLanguage||''}
                onChangeSource={sourceLanguage=>updateTalent(selectedTalent,{sourceLanguage})}
                onChangeTarget={targetLanguage=>updateTalent(selectedTalent,{targetLanguage})}/>:null}
              {levelPicker(talents[selectedTalent].level,
                level=>updateTalent(selectedTalent,{level}))}
              <Text style={{fontWeight:'700',color:theme.foreground}}>Ma présentation</Text>
              <TextInput multiline value={talents[selectedTalent].description||''} onChangeText={description=>updateTalent(selectedTalent,{description})} placeholder="Ce que je peux partager, mon expérience…" style={{minHeight:90,borderWidth:1,borderColor:theme.border,borderRadius:9,padding:12,color:theme.foreground,textAlignVertical:'top'}}/>
              <Text style={{fontWeight:'700',color:theme.foreground}}>Je souhaite</Text>
              <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{interests.map(interest=><Pressable key={interest} onPress={()=>{const t=talents[selectedTalent];updateTalent(selectedTalent,{interests:t.interests.includes(interest)?t.interests.filter(x=>x!==interest):[...t.interests,interest]});}} style={{padding:11,borderWidth:1,borderColor:talents[selectedTalent].interests.includes(interest)?'#D71D77':theme.border,borderRadius:9}}><Text style={{color:theme.foreground}}>{interest}</Text></Pressable>)}</View>
              <Pressable onPress={()=>{setTalents(x=>x.filter((_,i)=>i!==selectedTalent));setSelectedTalent(null);}} style={{alignItems:'center',padding:12}}><Text style={{color:'#C34D65'}}>Retirer ce talent</Text></Pressable>
              <Pressable onPress={()=>setSelectedTalent(null)} style={{backgroundColor:'#D71D77',borderRadius:9,padding:13,alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'700'}}>Terminer</Text></Pressable>
            </>:null}
          </ScrollView>
        </View>
      </Modal>
    <Nav/>
  </SafeAreaView>;
}
