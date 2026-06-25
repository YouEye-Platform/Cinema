/**
 * Root Layout — Cinema App
 */

import { InstallBanner } from "@/components/pwa/install-banner";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";
import {
  getThemeCSSVariables,
  getThemeMode,
  generateThemeStyle,
  generateSystemThemeScript,
} from "@/lib/theme";
import { CinemaHeader } from "@/components/layout/cinema-header";
import { LaunchRequirementsBanner } from "@/components/launch-requirements-banner";

export async function generateMetadata(): Promise<Metadata> {
  const appName = process.env.APP_NAME || "Cinema";
  return {
    title: appName,
    description: "Personal movie & TV discovery",
    icons: { icon: "/api/pwa/icon?size=32" },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: appName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#ef4444",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("ye-cinema").catch(() => null);

  const api = createApiClient("ye-cinema");
  let headerConfig = null;
  let launchRequirements = null;
  if (session) {
    [headerConfig, launchRequirements] = await Promise.all([
      api.fetchHeaderConfig(session.userId),
      api.getLaunchRequirements(session.userId),
    ]);
  }

  const cssVariables = getThemeCSSVariables(headerConfig);
  const themeStyle = generateThemeStyle(cssVariables);
  const themeMode = getThemeMode(headerConfig);

  const isSystemTheme = themeMode === "system";
  const htmlClass = isSystemTheme ? "" : themeMode;

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={htmlClass} suppressHydrationWarning>
      <head>
        {isSystemTheme && (
          <script dangerouslySetInnerHTML={{ __html: generateSystemThemeScript() }} />
        )}
        {themeStyle && (
          <style
            id="ye-theme"
            dangerouslySetInnerHTML={{ __html: themeStyle }}
          />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          {session && <CinemaHeader />}
          {session && <LaunchRequirementsBanner appName="Cinema" requirements={launchRequirements} />}
          <main>{children}</main>
          <InstallBanner appName="Cinema" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
