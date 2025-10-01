"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  RefreshCw, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  MessageCircle, 
  Clock,
  Trash2,
  Copy,
  CheckCircle,
  Brain,
  Hotel
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

interface Msg { role: "user" | "assistant"; content: string; timestamp?: Date }

export default function NoorAIPage() {
  const [question, setQuestion] = useState("")
  const [history, setHistory] = useState<Msg[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Generate unique session ID for this browser
  const [userSession] = useState(() => {
    if (typeof window !== 'undefined') {
      let session = localStorage.getItem('noor_ai_session')
      if (!session) {
        session = crypto.randomUUID()
        localStorage.setItem('noor_ai_session', session)
      }
      return session
    }
    return 'default_session'
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [history])

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://hms-ai-v2-backend.onrender.com'}/api/reports/chat-history/${userSession}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          mode: 'cors',
        })
        if (response.ok) {
          const data = await response.json()
          const historyWithTimestamps = (data.history || []).map((msg: any) => ({
            ...msg,
            timestamp: new Date()
          }))
          setHistory(historyWithTimestamps)
        }
      } catch (error) {
        console.log('No previous history found')
      }
    }
    loadHistory()
  }, [userSession])

  const sendMessage = async () => {
    if (!question.trim()) return
    const userMessage = { role: "user" as const, content: question, timestamp: new Date() }
    setHistory((h) => [...h, userMessage])
    setQuestion("")
    setLoading(true)
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://hms-ai-v2-backend.onrender.com'}/api/reports/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        mode: 'cors',
        body: JSON.stringify({
          message: question,
          userSession: userSession
        })
      })
      const d = await r.json()
      const aiMessage = { role: "assistant" as const, content: d.answer || "No response", timestamp: new Date() }
      setHistory((h) => [...h, aiMessage])
    } catch {
      const errorMessage = { role: "assistant" as const, content: "Error contacting AI service.", timestamp: new Date() }
      setHistory((h) => [...h, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessage(content)
      setTimeout(() => setCopiedMessage(null), 2000)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('noor_ai_session')
    window.location.reload()
  }

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const suggestedQuestions = [
    "What's the current occupancy rate?",
    "Show me revenue trends for this month",
    "Which rooms need maintenance?",
    "What are the top performing room types?",
    "How many check-ins are scheduled for today?"
  ]

  return (
    <DashboardLayout>
      <div className="h-screen bg-background p-4 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto flex flex-col">
          {/* Header Section */}
          <div className="flex-shrink-0 text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-full">
                <Brain className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Noor AI Assistant
                </h1>
                <p className="text-muted-foreground mt-2">Your intelligent hotel management companion</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4" />
                <span>Hotel Management System</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Powered by ZETA AI</span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
            {/* Left Sidebar - Quick Actions */}
            <div className="lg:col-span-1 space-y-4 overflow-y-auto">
              <Card className="flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => setQuestion("What's the current occupancy rate?")}
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">Occupancy Rate</div>
                      <div className="text-xs text-muted-foreground">Check current hotel occupancy</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => setQuestion("Show me today's check-ins")}
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">Today's Check-ins</div>
                      <div className="text-xs text-muted-foreground">View scheduled arrivals</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => setQuestion("Revenue analysis for this month")}
                  >
                    <div className="text-left">
                      <div className="font-medium text-sm">Revenue Analysis</div>
                      <div className="text-xs text-muted-foreground">Monthly financial insights</div>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              <Card className="flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    Session Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <div className="text-muted-foreground">Messages</div>
                    <div className="font-semibold text-lg">{history.length}</div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    onClick={clearHistory}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Chat
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main Chat Area */}
            <div className="lg:col-span-3 min-h-0 flex flex-col">
              <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="flex-shrink-0 border-b bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary rounded-lg">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">AI Chat Assistant</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Online & Ready</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {history.length} messages
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                  {/* Chat Messages */}
                  <ScrollArea className="flex-1 p-6 min-h-0 overflow-hidden">
                    {history.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Bot className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to Noor AI!</h3>
                        <p className="text-muted-foreground mb-6">Ask me anything about your hotel operations, analytics, or management insights.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                          {suggestedQuestions.map((question, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              className="text-left justify-start h-auto p-3 text-sm"
                              onClick={() => setQuestion(question)}
                            >
                              {question}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-4">
                        {history.map((message, index) => (
                          <div key={index} className={cn(
                            "flex gap-3",
                            message.role === "user" ? "justify-end" : "justify-start"
                          )}>
                            {message.role === "assistant" && (
                              <Avatar className="h-8 w-8 border-2 border-muted flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  <Bot className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div className={cn(
                              "max-w-[75%] space-y-2 min-w-0",
                              message.role === "user" ? "order-1" : "order-2"
                            )}>
                              <div className={cn(
                                "rounded-2xl px-4 py-3 shadow-sm break-words overflow-hidden",
                                message.role === "user" 
                                  ? "bg-primary text-primary-foreground ml-auto" 
                                  : "bg-card border border-border"
                              )}>
                                <div className={cn(
                                  "prose prose-sm max-w-none overflow-hidden",
                                  message.role === "user" ? "prose-invert" : "prose-slate"
                                )}>
                                  <ReactMarkdown>
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                              
                              <div className={cn(
                                "flex items-center gap-2 text-xs text-muted-foreground",
                                message.role === "user" ? "justify-end" : "justify-start"
                              )}>
                                <span>{formatTime(message.timestamp || new Date())}</span>
                                {message.role === "assistant" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-muted flex-shrink-0"
                                    onClick={() => copyMessage(message.content)}
                                  >
                                    {copiedMessage === message.content ? (
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {message.role === "user" && (
                              <Avatar className="h-8 w-8 border-2 border-muted flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        ))}
                        
                        {loading && (
                          <div className="flex gap-3 justify-start">
                            <Avatar className="h-8 w-8 border-2 border-muted flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span className="text-muted-foreground text-sm">AI is thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  
                  <Separator />
                  
                  {/* Input Area */}
                  <div className="flex-shrink-0 p-4">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Ask me about hotel operations, analytics, or management insights..."
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                          className="h-12 text-base pr-12 resize-none"
                        />
                        {question && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                            onClick={() => setQuestion("")}
                          >
                            <span className="sr-only">Clear</span>
                            ×
                          </Button>
                        )}
                      </div>
                      <Button 
                        onClick={sendMessage} 
                        disabled={loading || !question.trim()}
                        className="h-12 px-6 min-w-[100px] flex-shrink-0"
                      >
                        {loading ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                        <span className="ml-2">Send</span>
                      </Button>
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground text-center">
                      Press Enter to send, Shift+Enter for new line
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
