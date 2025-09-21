import { BarChart3, Calendar, Database, Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { ImportFeature } from "./import-feature"
import TradingChatAssistant from "./chat-feature"

export default function Features() {
  const features = [
    {
      id: "ai-journaling",
      title: "AI-Powered Journaling",
      icon: <Brain className="h-5 w-5 text-muted-foreground" />,
      description: "Improve your trading emotions with AI-assisted journaling. Our advanced algorithms analyze your entries to identify emotional patterns and biases.",
      stat: "Emotional Intelligence",
      image: <TradingChatAssistant />
    },
    {
      id: "performance-visualization",
      title: "Performance Visualization",
      icon: <BarChart3 className="h-5 w-5 text-muted-foreground" />,
      description: "Visualize your trading performance with interactive charts and graphs. Analyze patterns, identify strengths, and pinpoint areas for improvement.",
      stat: "Comprehensive Analytics",
      image: {
        light: "/charts-light.png",
        dark: "/charts-dark.png"
      }
    },
    {
      id: "daily-performance",
      title: "Daily Performance",
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      description: "Track your daily trading results with an intuitive calendar view. Quickly identify trends and patterns in your trading performance.",
      stat: "Calendar View",
      image: {
        light: "/calendar-light.png",
        dark: "/calendar-dark.png"
      }
    },
    {
      id: "data-import",
      title: "Data Import",
      icon: <Database className="h-5 w-5 text-muted-foreground" />,
      description: "Import data from various providers. Our platform supports automatic imports with Rithmic via a sync or .CSV imports, allowing you to centralize all your trading information in one place.",
      stat: "CSV Mappings from many providers",
      image: <ImportFeature />
    }
  ]

  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">Features</h1>
      <p className="text-xl text-center text-muted-foreground mb-12">The right tools to help you improve your trading.</p>
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {features.map((feature, index) => (
          <Card 
            id={feature.id} 
            key={feature.id} 
            className={`bg-card ${
              index < 2 ? 'lg:col-span-3' : 
              index === 2 ? 'lg:col-span-4' : 'lg:col-span-2'
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{feature.title}</CardTitle>
              {feature.icon}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div>
                  <div className="text-2xl font-bold">{feature.stat}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {feature.description}
                  </p>
                </div>
                <div className="relative h-[300px] w-full flex justify-center items-center">
                  {typeof feature.image === 'object' && 'light' in feature.image ? (
                    <>
                      <Image
                        src={feature.image.light}
                        alt={`${feature.title} visualization`}
                        fill
                        style={{ objectFit: 'contain' }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="rounded-md dark:hidden"
                      />
                      <Image
                        src={feature.image.dark}
                        alt={`${feature.title} visualization`}
                        fill
                        style={{ objectFit: 'contain' }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="rounded-md hidden dark:block"
                      />
                    </>
                  ) : (
                    feature.image
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}