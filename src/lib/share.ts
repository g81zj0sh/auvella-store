import { toast } from "sonner";

/**
 * v193: share a link the way "Share Favourites" does. The phone's own share
 * sheet (Messages, WhatsApp, contacts, Mail...) where the browser has one,
 * otherwise copy the link and say so. Dismissing the sheet is not an error.
 */
export async function shareLink({ title, url }: { title: string; url: string }): Promise<void> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied — send it to anyone", { position: "top-center" });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return; // sheet dismissed
    toast.error("Couldn't share the link — please try again", { position: "top-center" });
  }
}
