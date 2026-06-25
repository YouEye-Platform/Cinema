/**
 * Cinema Header — Platform-consistent header
 *
 * Left: Cinema logo + "Cinema" text
 * Right: Home, AppDrawer, NotificationBell, UserMenu
 */

import { Film } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";
import { AppDrawer } from "./app-drawer";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { HomeButton } from "./home-button";
import { BrandedAppTitle } from "./branded-app-title";
import { HeaderSearch } from "./header-search";
import { MobileAccountSheet } from "./mobile-account-sheet";

function kebabToPascal(s: string): string {
  return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

export async function CinemaHeader() {
  const session = await getSession("ye-cinema");
  if (!session) return null;

  const api = createApiClient("ye-cinema");
  const headerConfig = await api.fetchHeaderConfig(session.userId);

  const user = headerConfig?.user ?? {
    id: session.userId,
    name: session.name ?? session.username,
    username: session.username,
    email: session.email,
    is_admin: session.isAdmin,
  };

  const apps = (headerConfig?.navigation as { apps?: Array<{
    id: string;
    name: string;
    custom_name: string | null;
    icon: string | null;
    custom_icon_url: string | null;
    url: string | null;
    order: number;
    status: string | null;
    visible: boolean;
    header_display_mode?: string;
    branding_css?: Record<string, unknown> | null;
    branding_font_url?: string | null;
    branding_css_chars?: string[] | null;
  }> })?.apps ?? [];

  const unreadCount = headerConfig?.notifications?.unread_count ?? 0;
  const uiBaseUrl = (headerConfig as Record<string, unknown>)?.ui_base_url as string || "";
  const platformItems = (headerConfig as Record<string, unknown>)?.user_menu
    ? ((headerConfig as Record<string, unknown>).user_menu as { platform_items?: Array<{ key: string; label: string; icon: string; url: string }> })?.platform_items
    : undefined;
  const drawerPrefs = (headerConfig as Record<string, unknown>)?.drawer_prefs as
    { columns: number; iconScale: number; maxHeight: number } | undefined;
  const appSettingsUrl = (headerConfig as Record<string, unknown>)?.user_menu
    ? ((headerConfig as Record<string, unknown>).user_menu as { app_settings_url?: string })?.app_settings_url
    : undefined;

  const appItems = [
    ...(appSettingsUrl ? [{ label: "App Settings", icon: "Sliders", href: appSettingsUrl }] : []),
  ];

  // Find this app's branding in the header config
  const selfApp = (headerConfig?.navigation as { self?: (typeof apps)[number] | null } | undefined)?.self ?? apps.find((a: { id: string }) => a.id === "cinema" || a.id === "ye-cinema");
  const displayMode = selfApp?.header_display_mode ?? "logo-text";
  const brandingCss = selfApp?.branding_css as React.CSSProperties | null | undefined;
  const brandingFontUrl = selfApp?.branding_font_url as string | null | undefined;
  const brandingCssChars = selfApp?.branding_css_chars as string[] | null | undefined;

  // User-customized name and icon
  const displayName = selfApp?.custom_name ?? "Cinema";
  const customIcon = selfApp?.custom_icon_url;

  // Resolve font URL — relative paths need the UI base URL prefix
  const resolvedFontUrl = brandingFontUrl
    ? (brandingFontUrl.startsWith("http") ? brandingFontUrl : `${uiBaseUrl}${brandingFontUrl}`)
    : null;
  let renderedIcon: React.ReactNode = <Film className="h-5 w-5" />;
  if (customIcon) {
    if (customIcon.startsWith("emoji:")) {
      renderedIcon = <span className="text-lg leading-none">{customIcon.replace("emoji:", "")}</span>;
    } else if (customIcon.startsWith("/") || customIcon.startsWith("http") || customIcon.startsWith("data:")) {
      renderedIcon = <img src={customIcon} alt="" className="h-5 w-5 rounded object-cover" />;
    } else {
      // Lucide icon name (e.g. "tv-icon") — try dynamic lookup
      const IconComp = (LucideIcons as Record<string, unknown>)[kebabToPascal(customIcon)];
      if (IconComp != null) {
        const LucideIcon = IconComp as React.ComponentType<{ className?: string }>;
        renderedIcon = <LucideIcon className="h-5 w-5" />;
      }
    }
  }

  return (
    <>
      <header className="ye-mobile-top-header sticky top-0 z-50 grid h-14 grid-cols-[minmax(0,1fr)_minmax(0,640px)_minmax(0,1fr)] items-center gap-3 border-b border-border/40 bg-background/95 px-4 backdrop-blur-md">
        <a
          href="/"
          className="flex min-w-0 items-center justify-start gap-2 font-semibold text-foreground hover:text-foreground/80 transition-colors"
          title={displayName}
        >
          {displayMode !== "text-only" && renderedIcon}
          {displayMode !== "icon-only" && (
            brandingCss
              ? <BrandedAppTitle name={displayName} css={brandingCss} fontUrl={resolvedFontUrl} charTransforms={brandingCssChars} />
              : <span>{displayName}</span>
          )}
        </a>

        <div className="ye-mobile-top-center flex min-w-0 items-center justify-center gap-3">
          <HeaderSearch />
          <nav className="hidden lg:flex items-center gap-1">
            <a href="/" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent/50 transition-colors">Discover</a>
            <a href="/watchlist" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent/50 transition-colors text-muted-foreground">Watchlist</a>
          </nav>
        </div>

        <div className="ye-mobile-top-actions flex min-w-0 items-center justify-end gap-1">
          <HomeButton uiBaseUrl={uiBaseUrl} />
          <AppDrawer uiBaseUrl={uiBaseUrl} />
          <NotificationBell initialCount={unreadCount} uiBaseUrl={uiBaseUrl} />
          <UserMenu
            username={user.username ?? user.name ?? ""}
            email={user.email ?? ""}
            isAdmin={user.is_admin ?? false}
            avatarUrl={headerConfig?.user?.avatar_url}
            uiBaseUrl={uiBaseUrl}
            platformItems={platformItems}
            appItems={appItems}
          />
        </div>
      </header>

      <div className="ye-mobile-shell-only fixed inset-x-0 bottom-0 z-50 items-center gap-2 border-t border-border/60 bg-background/95 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          <a href="/" className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Discover</a>
          <a href="/watchlist" className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">Watchlist</a>
        </nav>
        <MobileAccountSheet
          username={user.username ?? user.name ?? ""}
          email={user.email ?? ""}
          isAdmin={user.is_admin ?? false}
          avatarUrl={headerConfig?.user?.avatar_url}
          initialCount={unreadCount}
          uiBaseUrl={uiBaseUrl}
          platformItems={platformItems}
          appItems={appItems}
        />
      </div>
      <div className="ye-mobile-shell-spacer" aria-hidden="true" />
    </>
  );
}
