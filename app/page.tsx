import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Mock Test Platform</h1>
        <p className="text-muted-foreground">
          Prepare for your exams with our comprehensive mock tests
        </p>
        <div className="space-x-4">
          <Button asChild>
            <Link href="/auth">Get Started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">Admin Panel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}