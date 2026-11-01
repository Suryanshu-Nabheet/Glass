export const BRAND_ASSET_PATHS = {
  productionAppIconPng: "assets/branding/production/black-app-1024.png",
  productionWindowsIconIco: "assets/branding/production/black-windows.ico",
  productionWebFaviconIco: "assets/branding/production/black-web-favicon.ico",
  productionWebFavicon16Png: "assets/branding/production/black-web-favicon-16x16.png",
  productionWebFavicon32Png: "assets/branding/production/black-web-favicon-32x32.png",
  productionWebAppleTouchIconPng:
    "assets/branding/production/black-web-apple-touch-180.png",
  developmentWindowsIconIco: "assets/branding/development/blueprint-windows.ico",
  developmentWebFaviconIco: "assets/branding/development/blueprint-web-favicon.ico",
  developmentWebFavicon16Png: "assets/branding/development/blueprint-web-favicon-16x16.png",
  developmentWebFavicon32Png: "assets/branding/development/blueprint-web-favicon-32x32.png",
  developmentWebAppleTouchIconPng:
    "assets/branding/development/blueprint-web-apple-touch-180.png",
} as const;

export interface IconOverride {
  readonly sourceRelativePath: string;
  readonly targetRelativePath: string;
}

export const DEVELOPMENT_ICON_OVERRIDES: ReadonlyArray<IconOverride> = [
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFaviconIco,
    targetRelativePath: "dist/client/favicon.ico",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFavicon16Png,
    targetRelativePath: "dist/client/favicon-16x16.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFavicon32Png,
    targetRelativePath: "dist/client/favicon-32x32.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng,
    targetRelativePath: "dist/client/apple-touch-icon.png",
  },
];

export const PUBLISH_ICON_OVERRIDES: ReadonlyArray<IconOverride> = [
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFaviconIco,
    targetRelativePath: "dist/client/favicon.ico",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFavicon16Png,
    targetRelativePath: "dist/client/favicon-16x16.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFavicon32Png,
    targetRelativePath: "dist/client/favicon-32x32.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
    targetRelativePath: "dist/client/apple-touch-icon.png",
  },
];
