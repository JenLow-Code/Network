import fr from './fr.json';
import en from './en.json';
import de from './de.json';
import pt from './pt.json';
export const screenTranslations = { fr, en, de, pt };
export type ScreenTranslationKey = keyof typeof fr;
