import React,{createContext,useContext,useEffect,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {screenTranslations,ScreenTranslationKey} from '@/i18n';
export type Language='fr'|'en'|'de'|'pt';
export const LANGUAGE_KEY='jenlow.network.settings.language.v1';
const translations={
 fr:{discover:'Découvrir',dreams:'Mes rêves',agenda:'Agenda',music:'Musique',space:'Mon espace',settings:'Paramètres',language:'Langue',account:'Compte',deleteAccount:'Supprimer mon compte',demoData:'Effacer les données de démonstration',back:'Retour',circle:'Mon cercle',profile:'Profil'},
 en:{discover:'Discover',dreams:'My Dreams',agenda:'Agenda',music:'Music',space:'My Space',settings:'Settings',language:'Language',account:'Account',deleteAccount:'Delete my account',demoData:'Clear demo data',back:'Back',circle:'My Circle',profile:'Profile'},
 de:{discover:'Entdecken',dreams:'Meine Träume',agenda:'Kalender',music:'Musik',space:'Mein Bereich',settings:'Einstellungen',language:'Sprache',account:'Konto',deleteAccount:'Konto löschen',demoData:'Demodaten löschen',back:'Zurück',circle:'Mein Kreis',profile:'Profil'},
 pt:{discover:'Descobrir',dreams:'Meus sonhos',agenda:'Agenda',music:'Música',space:'Meu espaço',settings:'Definições',language:'Idioma',account:'Conta',deleteAccount:'Eliminar a minha conta',demoData:'Limpar dados de demonstração',back:'Voltar',circle:'O meu círculo',profile:'Perfil'},
} as const;
type Dictionary=typeof translations.fr;
type ContextType={language:Language;setLanguage:(language:Language)=>void;t:(key:keyof Dictionary)=>string;tr:(key:ScreenTranslationKey)=>string};
const Context=createContext<ContextType|null>(null);
export function LocaleProvider({children}:{children:React.ReactNode}){
 const [language,setLanguageState]=useState<Language>('fr');
 useEffect(()=>{let live=true;void AsyncStorage.getItem(LANGUAGE_KEY).then(value=>{if(live&&(value==='fr'||value==='en'||value==='de'||value==='pt'))setLanguageState(value)});return()=>{live=false}},[]);
 const setLanguage=(next:Language)=>{setLanguageState(next);void AsyncStorage.setItem(LANGUAGE_KEY,next)};
 return <Context.Provider value={{language,setLanguage,t:key=>translations[language][key],tr:key=>screenTranslations[language][key]}}>{children}</Context.Provider>;
}
export function useLocale(){const value=useContext(Context);if(!value)throw new Error('LocaleProvider required');return value}
