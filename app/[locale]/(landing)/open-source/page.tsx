'use client'

import { ArrowLeft, Github, Code, Heart, Users, Shield, Zap, Download, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function OpenSourcePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="inline-flex items-center rounded-lg bg-muted px-3 py-1 text-sm font-medium">
              <Github className="h-4 w-4 mr-2" />
              Free & Open Source
            </div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
              Built in the Open,
              <br />
              <span className="text-primary">Free Forever</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Deltalytix is completely open source and free to use. No hidden costs, no limitations, 
              no vendor lock-in. Take full control of your trading analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="https://github.com/kalabhaftu/deltalytixC.git" className="inline-flex items-center" target="_blank">
                  <Github className="h-4 w-4 mr-2" />
                  View on GitHub
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#download">Download & Install</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source Benefits */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Card>
              <CardHeader>
                <Heart className="h-8 w-8 text-primary" />
                <CardTitle>Completely Free</CardTitle>
                <CardDescription>
                  No subscriptions, no usage limits, no premium features. Everything is free forever.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Zero licensing costs</li>
                  <li>• No feature restrictions</li>
                  <li>• Unlimited trading accounts</li>
                  <li>• Full access to all tools</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-primary" />
                <CardTitle>Your Data, Your Control</CardTitle>
                <CardDescription>
                  Host it yourself, modify it freely. Your trading data never leaves your control.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Self-hosted deployment</li>
                  <li>• Complete data ownership</li>
                  <li>• No external dependencies</li>
                  <li>• Privacy by design</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Code className="h-8 w-8 text-primary" />
                <CardTitle>Customize Everything</CardTitle>
                <CardDescription>
                  Built with modern technologies. Modify, extend, and customize to fit your exact needs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Modern tech stack</li>
                  <li>• Clean, documented code</li>
                  <li>• Modular architecture</li>
                  <li>• Easy customization</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary" />
                <CardTitle>Community Driven</CardTitle>
                <CardDescription>
                  Join a community of traders and developers building the future of trading analytics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Community contributions</li>
                  <li>• Shared improvements</li>
                  <li>• Open development process</li>
                  <li>• Collaborative features</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary" />
                <CardTitle>No Vendor Lock-in</CardTitle>
                <CardDescription>
                  Switch deployments, export data, or modify the platform without restrictions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Standard data formats</li>
                  <li>• Export capabilities</li>
                  <li>• Platform independence</li>
                  <li>• Future-proof design</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <GitBranch className="h-8 w-8 text-primary" />
                <CardTitle>Transparent Development</CardTitle>
                <CardDescription>
                  See exactly what&apos;s being built, track progress, and contribute to the roadmap.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Public development</li>
                  <li>• Issue tracking</li>
                  <li>• Feature discussions</li>
                  <li>• Regular updates</li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Built with Modern Technologies
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
              Deltalytix is built using industry-standard technologies that ensure reliability, 
              performance, and easy maintenance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Frontend</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2">
                  <Badge variant="secondary">Next.js 15</Badge>
                  <Badge variant="secondary">React 19</Badge>
                  <Badge variant="secondary">TypeScript</Badge>
                  <Badge variant="secondary">Tailwind CSS</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Backend</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2">
                  <Badge variant="secondary">Supabase</Badge>
                  <Badge variant="secondary">PostgreSQL</Badge>
                  <Badge variant="secondary">Prisma ORM</Badge>
                  <Badge variant="secondary">tRPC</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Analytics</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2">
                  <Badge variant="secondary">Recharts</Badge>
                  <Badge variant="secondary">D3.js</Badge>
                  <Badge variant="secondary">Lightweight Charts</Badge>
                  <Badge variant="secondary">Canvas API</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Deployment</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2">
                  <Badge variant="secondary">Docker</Badge>
                  <Badge variant="secondary">Vercel</Badge>
                  <Badge variant="secondary">Self-hosted</Badge>
                  <Badge variant="secondary">CI/CD Ready</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <Download className="h-12 w-12 text-primary" />
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Get Started Today
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
              Download and deploy Deltalytix in minutes. Choose from multiple deployment options 
              to fit your technical preferences.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Docker Deploy</CardTitle>
                  <CardDescription className="text-center">
                    One-command deployment with Docker Compose
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button className="w-full" asChild>
                    <Link href="#">
                      <Download className="h-4 w-4 mr-2" />
                      Docker Setup
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Manual Setup</CardTitle>
                  <CardDescription className="text-center">
                    Full control with manual installation
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="#">
                      <Code className="h-4 w-4 mr-2" />
                      Installation Guide
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Cloud Deploy</CardTitle>
                  <CardDescription className="text-center">
                    Deploy to Vercel, Railway, or other platforms
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="#">
                      <Zap className="h-4 w-4 mr-2" />
                      Cloud Setup
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source Community */}
      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Join the Community
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
              Help shape the future of open-source trading analytics. Contribute code, 
              report issues, or share your trading insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="https://github.com/kalabhaftu/deltalytixC.git" className="inline-flex items-center" target="_blank">
                  <Github className="h-4 w-4 mr-2" />
                  Contribute on GitHub
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#" className="inline-flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Join Discussions
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
