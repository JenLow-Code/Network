/**
 * Shared desktop/tablet workspace grid. All main JenLow workspaces use the same
 * outer width, regardless of their inner editorial reading columns.
 * Tablet fills the viewport; only desktop centers a capped canvas.
 */
export const DESKTOP_WORKSPACE_BREAKPOINT=1100;
export const TABLET_WORKSPACE_BREAKPOINT=700;
export const DESKTOP_WORKSPACE_MAX_WIDTH=1160;

export function workspaceLayout(viewportWidth:number){
  // Even a landscape tablet wider than 1100px uses the full-width touch layout.
  const primaryTouch=typeof window!=='undefined'&&
    typeof window.matchMedia==='function'&&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const desktop=viewportWidth>=DESKTOP_WORKSPACE_BREAKPOINT&&!primaryTouch;
  const tablet=viewportWidth>=TABLET_WORKSPACE_BREAKPOINT&&!desktop;
  const gutter=desktop?30:tablet?24:viewportWidth<520?16:20;
  return {
    desktop,
    tablet,
    gutter,
    width:'100%' as const,
    maxWidth:desktop?DESKTOP_WORKSPACE_MAX_WIDTH:undefined,
    alignSelf:'center' as const,
  };
}
