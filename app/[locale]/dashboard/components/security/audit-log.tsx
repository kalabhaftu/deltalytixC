'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertTriangle, Clock, User, Activity } from 'lucide-react'
import { format } from 'date-fns'

interface AuditLogEntry {
  id: string
  action: string
  resource: string
  timestamp: string
  success: boolean
  ipAddress: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface SecurityEvent {
  id: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  source: string
  description: string
  createdAt: string
  resolved: boolean
}

interface AuditStats {
  totalEvents: number
  recentEvents: number
  securityEvents: number
  riskDistribution: Record<string, number>
}

export function AuditLog() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'logs' | 'events' | 'stats'>('logs')

  useEffect(() => {
    loadAuditData()
  }, [])

  const loadAuditData = async () => {
    setIsLoading(true)
    try {
      const [logsResponse, eventsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/audit/logs'),
        fetch('/api/admin/audit/security-events'),
        fetch('/api/admin/audit/stats'),
      ])

      if (logsResponse.ok) {
        const logs = await logsResponse.json()
        setAuditLogs(logs)
      }

      if (eventsResponse.ok) {
        const events = await eventsResponse.json()
        setSecurityEvents(events)
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to load audit data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'LOW': return <Shield className="h-4 w-4 text-green-600" />
      case 'MEDIUM': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/audit/security-events/${eventId}/resolve`, {
        method: 'POST',
      })

      if (response.ok) {
        setSecurityEvents(events => 
          events.map(event => 
            event.id === eventId ? { ...event, resolved: true } : event
          )
        )
      }
    } catch (error) {
      console.error('Failed to resolve security event:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security & Audit Logs</CardTitle>
          <CardDescription>Loading audit data...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Events</p>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Recent (24h)</p>
                  <p className="text-2xl font-bold">{stats.recentEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Security Events</p>
                  <p className="text-2xl font-bold">{stats.securityEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">High Risk</p>
                  <p className="text-2xl font-bold">
                    {(stats.riskDistribution.HIGH || 0) + (stats.riskDistribution.CRITICAL || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Security Events Alert */}
      {securityEvents.filter(e => !e.resolved && (e.severity === 'HIGH' || e.severity === 'CRITICAL')).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You have {securityEvents.filter(e => !e.resolved && (e.severity === 'HIGH' || e.severity === 'CRITICAL')).length} 
            {' '}unresolved high-priority security events that require attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 border-b">
        <Button
          variant={activeTab === 'logs' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('logs')}
          className="rounded-b-none"
        >
          Audit Logs
        </Button>
        <Button
          variant={activeTab === 'events' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('events')}
          className="rounded-b-none"
        >
          Security Events
        </Button>
        <Button
          variant={activeTab === 'stats' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('stats')}
          className="rounded-b-none"
        >
          Statistics
        </Button>
      </div>

      {/* Audit Logs */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Logs</CardTitle>
            <CardDescription>
              Detailed log of all user actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.resource || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={log.success ? 'default' : 'destructive'}>
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskLevelColor(log.riskLevel)}>
                        {log.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ipAddress}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Security Events */}
      {activeTab === 'events' && (
        <Card>
          <CardHeader>
            <CardTitle>Security Events</CardTitle>
            <CardDescription>
              Security incidents and threats detected by the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 border rounded-lg ${
                    event.resolved ? 'bg-gray-50' : 'bg-white'
                  } ${
                    event.severity === 'CRITICAL' ? 'border-red-200' : 
                    event.severity === 'HIGH' ? 'border-orange-200' : 
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(event.severity)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{event.type}</h4>
                          <Badge className={getRiskLevelColor(event.severity)}>
                            {event.severity}
                          </Badge>
                          {event.resolved && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {event.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>Source: {event.source}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(event.createdAt), 'MMM dd, HH:mm')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {!event.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveSecurityEvent(event.id)}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {securityEvents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No security events found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Level Distribution</CardTitle>
              <CardDescription>Breakdown of events by risk level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.riskDistribution).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded ${
                        level === 'LOW' ? 'bg-green-500' :
                        level === 'MEDIUM' ? 'bg-yellow-500' :
                        level === 'HIGH' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`} />
                      <span className="font-medium">{level}</span>
                    </div>
                    <span className="text-sm text-gray-600">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
              <CardDescription>Recent system activity overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Events</span>
                  <span className="font-medium">{stats.totalEvents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last 24 Hours</span>
                  <span className="font-medium">{stats.recentEvents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Unresolved Security Events</span>
                  <span className="font-medium text-red-600">{stats.securityEvents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">High Risk Events</span>
                  <span className="font-medium text-orange-600">
                    {(stats.riskDistribution.HIGH || 0) + (stats.riskDistribution.CRITICAL || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button onClick={loadAuditData} variant="outline">
          Refresh Data
        </Button>
      </div>
    </div>
  )
}
