'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Brain, 
  Check, 
  Zap, 
  DollarSign,
  Clock,
  Shield,
  ChevronDown
} from "lucide-react"
import { AIProvider, getProviderConfig } from "@/lib/ai-providers"

interface AIProviderSettingsProps {
  currentProvider: AIProvider
  onProviderChange: (provider: AIProvider) => Promise<void>
}

export function AIProviderSettings({ 
  currentProvider, 
  onProviderChange 
}: AIProviderSettingsProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(currentProvider)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setSelectedProvider(currentProvider)
  }, [currentProvider])

  const handleProviderChange = async (provider: AIProvider) => {
    if (provider === selectedProvider) return

    setIsUpdating(true)
    try {
      await onProviderChange(provider)
      setSelectedProvider(provider)
      toast({
        title: "AI Provider Updated",
        description: `Successfully switched to ${getProviderConfig(provider).displayName}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI provider preference",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'openai':
        return '🤖'
      case 'zai':
        return '⚡'
      default:
        return '🧠'
    }
  }

  const getProviderDescription = (provider: AIProvider) => {
    switch (provider) {
      case 'openai':
        return 'Advanced AI models with robust capabilities'
      case 'zai':
        return 'Fast and efficient AI with competitive pricing'
      default:
        return 'AI provider'
    }
  }

  const getProviderFeatures = (provider: AIProvider) => {
    switch (provider) {
      case 'openai':
        return [
          { icon: Brain, label: 'Advanced reasoning', color: 'text-blue-500' },
          { icon: Shield, label: 'Reliable & stable', color: 'text-green-500' },
          { icon: DollarSign, label: 'Premium pricing', color: 'text-yellow-500' }
        ]
      case 'zai':
        return [
          { icon: Zap, label: 'High performance', color: 'text-purple-500' },
          { icon: Clock, label: 'Fast responses', color: 'text-blue-500' },
          { icon: DollarSign, label: 'Cost efficient', color: 'text-green-500' }
        ]
      default:
        return []
    }
  }

  const providers: AIProvider[] = ['zai', 'openai']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Provider
        </CardTitle>
        <CardDescription>
          Choose your preferred AI provider for chat, analysis, and suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Provider Selection */}
        <div>
          <Label className="text-base font-medium">Default Provider</Label>
          <div className="mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  disabled={isUpdating}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getProviderIcon(selectedProvider)}</span>
                    <span>{getProviderConfig(selectedProvider).displayName}</span>
                    {selectedProvider === currentProvider && (
                      <Badge variant="secondary" className="ml-1">Current</Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full min-w-[300px]">
                <DropdownMenuLabel>Select AI Provider</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {providers.map((provider) => {
                  const config = getProviderConfig(provider)
                  const isSelected = provider === selectedProvider
                  const isCurrent = provider === currentProvider
                  
                  return (
                    <DropdownMenuItem
                      key={provider}
                      onClick={() => handleProviderChange(provider)}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getProviderIcon(provider)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{config.displayName}</span>
                            {provider === 'zai' && (
                              <Badge variant="default" className="text-xs">Recommended</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getProviderDescription(provider)}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator />

        {/* Provider Features */}
        <div className="grid gap-4">
          <Label className="text-base font-medium">Provider Comparison</Label>
          
          {providers.map((provider) => {
            const config = getProviderConfig(provider)
            const features = getProviderFeatures(provider)
            const isSelected = provider === selectedProvider
            
            return (
              <div
                key={provider}
                className={`rounded-lg border p-4 transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-border/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getProviderIcon(provider)}</span>
                    <span className="font-medium">{config.displayName}</span>
                    {provider === 'zai' && (
                      <Badge variant="default" className="text-xs">Default</Badge>
                    )}
                  </div>
                  {isSelected && (
                    <Badge variant="outline" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <feature.icon className={`h-4 w-4 ${feature.color}`} />
                      <span className="text-muted-foreground">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Information Note */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">About AI Providers</p>
              <p className="text-muted-foreground">
                Your selection applies to all AI features including chat, analysis, and suggestions. 
                The system will automatically fallback to other providers if your preferred one is unavailable.
              </p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        {isUpdating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Updating AI provider preference...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

