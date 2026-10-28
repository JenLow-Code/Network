import { Platform } from 'react-native';

/** Web-only local image selection. No server or media service required. */
export function pickDreamImage(
  onSelected: (uri: string) => void,
  onError?: (message: string) => void,
) {
  if (Platform.OS !== 'web') {
    onError?.(
      'Le choix de fichiers sera disponible sur mobile avec le sélecteur natif. Tu peux utiliser une image intégrée pour le moment.',
    );
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      onError?.('Image trop volumineuse. Limite locale : 2 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onSelected(reader.result);
    };
    reader.onerror = () => onError?.('Impossible de lire cette image.');
    reader.readAsDataURL(file);
  };
  input.click();
}
