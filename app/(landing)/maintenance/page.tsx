import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function MaintenancePage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Scheduled Maintenance
          </CardTitle>
          <CardDescription>
            We are currently performing scheduled maintenance to improve your experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Maintenance in Progress</AlertTitle>
            <AlertDescription>
              Our systems are currently undergoing maintenance. Please check back soon.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
} 