import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DisclaimersPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Legal Disclaimers</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Disclaimer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              Trading involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">
              While we strive for accuracy, trading data should be verified independently. We are not responsible for any losses incurred.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
