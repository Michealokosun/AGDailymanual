const fallbackSiteUrl = "https://ag-dailymanual.vercel.app";

function resolveSiteUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (!configured) return fallbackSiteUrl;
  try {
    return new URL(configured).origin;
  } catch {
    return fallbackSiteUrl;
  }
}

export const siteUrl = resolveSiteUrl();
export const siteName = "Evangel Daily Meal";
export const siteDescription = "Read daily Bible devotionals and Sunday School lessons from Evangel Daily Meal. Explore Scripture, reflect, pray, and revisit past readings.";
