import type { InstanceConfig } from "@/app/services/ezprep-api/instance-config";

export interface InstanceBranding {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

const FAVICON_ID = "instance-favicon";

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function toInstanceBranding(
  data: InstanceConfig | null | undefined
): InstanceBranding | null {
  const name = data?.name?.trim();
  if (!name) return null;
  return {
    name,
    logoUrl: safeHttpUrl(data?.logoUrl),
    faviconUrl: safeHttpUrl(data?.faviconUrl),
  };
}

/** Applies the display name and favicon, and restores both when the caller cleans up. */
export function applyInstanceDocumentBranding(
  branding: InstanceBranding | null
): () => void {
  const previousTitle = document.title;
  if (branding?.name) {
    document.title = branding.name;
  }

  const previous = document.getElementById(FAVICON_ID);
  if (branding?.faviconUrl) {
    const link =
      previous instanceof HTMLLinkElement
        ? previous
        : document.createElement("link");
    link.id = FAVICON_ID;
    link.rel = "icon";
    link.href = branding.faviconUrl;
    if (!previous) {
      document.head.appendChild(link);
    }
  } else {
    previous?.remove();
  }

  return () => {
    document.title = previousTitle;
    document.getElementById(FAVICON_ID)?.remove();
  };
}
