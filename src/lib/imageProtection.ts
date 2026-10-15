/**
 * v192: stops the casual ways of saving product photos and videos.
 *
 * - Desktop right-click "Save image as / Save video as" and Android's long-press
 *   menu both fire `contextmenu`; cancelling it on media hides that menu.
 * - Dragging a photo out to the desktop starts with `dragstart`.
 * - iPhone's long-press "Save to Photos" sheet is turned off in CSS
 *   (`-webkit-touch-callout: none` on img/video in styles.css).
 *
 * Only photos and videos are affected: right-click on text, links and buttons
 * still works everywhere. This is a deterrent, not protection - screenshots,
 * developer tools and the image URLs themselves still work, as on any website.
 */
const MEDIA = "img, picture, video";

function onMedia(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(MEDIA) !== null;
}

export function installImageProtection(): () => void {
  const block = (event: Event) => {
    if (onMedia(event.target)) event.preventDefault();
  };
  // Capture phase, so it runs even where a component stops propagation.
  document.addEventListener("contextmenu", block, true);
  document.addEventListener("dragstart", block, true);
  return () => {
    document.removeEventListener("contextmenu", block, true);
    document.removeEventListener("dragstart", block, true);
  };
}
