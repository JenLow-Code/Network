/** Preserve section labels and comments when lyrics are edited before them.
 *
 * Offsets use JavaScript UTF-16 units, matching React Native TextInput
 * selection indices. Edited passages are followed if the change is entirely
 * inside their existing range. If a change destroys a range boundary we keep
 * the original quote so the UI can mark it as needing a new selection, rather
 * than silently binding a comment to the wrong words.
 */
export function shiftLyricAnchors<T extends {start:number;end:number;text:string}>(
  before:string,after:string,anchors:T[],
):T[]{
  if(before===after)return anchors;
  let prefix=0;
  const common=Math.min(before.length,after.length);
  while(prefix<common&&before.charCodeAt(prefix)===after.charCodeAt(prefix))
    prefix++;
  let suffix=0;
  const available=Math.min(before.length-prefix,after.length-prefix);
  while(suffix<available&&
    before.charCodeAt(before.length-1-suffix)===
    after.charCodeAt(after.length-1-suffix))suffix++;
  const editedOldEnd=before.length-suffix;
  const delta=after.length-before.length;
  return anchors.map(anchor=>{
    if(anchor.start<0||anchor.end>before.length||anchor.start>=anchor.end)
      return anchor;
    if(editedOldEnd<=anchor.start){
      return {...anchor,start:anchor.start+delta,end:anchor.end+delta};
    }
    if(prefix>=anchor.end)return anchor;
    if(prefix>anchor.start&&editedOldEnd<anchor.end){
      const start=anchor.start,end=Math.max(start,anchor.end+delta);
      return {...anchor,start,end,text:after.slice(start,end)};
    }
    // A boundary was changed: keep the original quote, but no longer color it
    // unless it still matches exactly at its existing range.
    return anchor;
  });
}

export function isLyricAnchorValid(
  text:string,anchor:{start:number;end:number;text:string},
):boolean{
  return anchor.start>=0&&anchor.end<=text.length&&
    anchor.end>anchor.start&&text.slice(anchor.start,anchor.end)===anchor.text;
}
