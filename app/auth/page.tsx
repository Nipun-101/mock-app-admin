"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redirecting</CardTitle>
          <CardDescription>Taking you to admin sign in…</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.replace("/login")} className="w-full">
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
