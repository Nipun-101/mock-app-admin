import { useState, useEffect } from "react";
import { S3ObjectMetadata } from "@/app/services/storage/s3";

export function usePresignedUrl(metadata: S3ObjectMetadata | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout;

    const refreshUrl = async () => {
      if (!metadata) return;

      // Add validation for required metadata fields
      if (!metadata.key || !metadata.bucket) {
        console.error("Invalid metadata: missing required fields", {
          hasKey: !!metadata.key,
          hasBucket: !!metadata.bucket,
          metadata
        });
        return;
      }

      try {
        setLoading(true);
        const response = await fetch("/api/refresh-signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to refresh URL: ${errorData.error}`);
        }

        const data = await response.json();
        const { url: newUrl } = data;

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
  }, [metadata]);

  return { url, loading };
}
