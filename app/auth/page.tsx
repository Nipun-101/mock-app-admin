"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, Phone } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isEmail, setIsEmail] = useState(true);
  const [value, setValue] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically handle authentication
    // For now, we'll just redirect to the admin dashboard
    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Sign in to access the mock test platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isEmail ? "default" : "outline"}
                onClick={() => setIsEmail(true)}
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button
                type="button"
                variant={!isEmail ? "default" : "outline"}
                onClick={() => setIsEmail(false)}
                className="flex-1"
              >
                <Phone className="mr-2 h-4 w-4" />
                Mobile
              </Button>
            </div>
            <Input
              type={isEmail ? "email" : "tel"}
              placeholder={isEmail ? "Enter your email" : "Enter your mobile number"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}