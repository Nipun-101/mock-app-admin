import { useState, useEffect } from "react";
import { filesApi } from "@/app/services/ezprep-api";

interface S3ObjectMetadata {
  key: string;
  bucket: string;
  region?: string;
  contentType?: string;
  size?: number;
  lastModified?: string | Date;
}

export function usePresignedUrl(metadata: S3ObjectMetadata | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout;

    const refreshUrl = async () => {
      if (!metadata?.key || !metadata.bucket) {
        if (mounted) {
          setUrl(null);
        }
        return;
      }

      try {
        setLoading(true);
        const { data } = await filesApi.signedUrl(metadata.key, metadata.bucket);
        const newUrl = data.url;

        if (mounted) {
          setUrl(newUrl);
          // Schedule next refresh for 45 minutes (75% of the 1-hour expiry)
          refreshTimeout = setTimeout(refreshUrl, 45 * 60 * 1000);
        }
      } catch (error) {
        console.error("Error refreshing signed URL:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    refreshUrl();

    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [metadata?.key, metadata?.bucket]);

  return { url, loading };
}
