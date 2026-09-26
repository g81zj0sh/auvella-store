/*
 * Auvella's social accounts. One source for the footer and the mobile menu.
 * Tracking parameters (utm, stkn, _r, _t, mibextid) are stripped: they tag
 * the visitor as arriving from a specific share, which is not what a
 * permanent link on the site should do. No X account exists yet, so there is
 * no entry - an icon that leads nowhere is worse than no icon.
 */
export const SOCIAL_LINKS: Record<string, string> = {
  Instagram: "https://www.instagram.com/auvellawear",
  Facebook: "https://www.facebook.com/profile.php?id=61593998109059",
  YouTube: "https://www.youtube.com/@AuvellaWear",
  TikTok: "https://www.tiktok.com/@auvellawear",
};
