import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function HomePage() {
  return (
    <main className="container mx-auto min-h-screen py-12">
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Web2</h1>
          <p className="text-muted-foreground text-lg">
            A simple Next.js app with Tailwind CSS and shadcn components
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          <Card>
            <CardHeader>
              <CardTitle>Next.js 16</CardTitle>
              <CardDescription>The React framework for the web</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Built with the latest Next.js features including App Router,
                Server Components, and more.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Learn More
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tailwind CSS</CardTitle>
              <CardDescription>Utility-first CSS framework</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Style your application with modern utility classes for rapid
                development.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Explore
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>shadcn/ui</CardTitle>
              <CardDescription>Beautiful UI components</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Accessible and customizable components built with Radix UI and
                Tailwind CSS.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View Docs
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button>Get Started</Button>
          <Button variant="secondary">View Components</Button>
          <Button variant="ghost">About</Button>
        </div>
      </div>
    </main>
  )
}
