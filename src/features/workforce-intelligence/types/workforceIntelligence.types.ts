export type WorkforceRange = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export type WorkforceFilters = {
  range: WorkforceRange
  from: string
  to: string
  agentId: 'all' | number
  role: 'all' | 'AGENT' | 'SUPERVISOR'
  risk: 'all' | 'clean' | 'watch' | 'critical'
}

export type ScoreValue = number | null

export type WorkforceScores = {
  aiProductivity: ScoreValue
  aiQuality: ScoreValue
  attendance: ScoreValue
  reliability: ScoreValue
  sales: ScoreValue
  compliance: ScoreValue
  learning: ScoreValue
  customerExperience: ScoreValue
  risk: ScoreValue
  overall: ScoreValue
}

export type WorkforceCallMetrics = {
  callsMade: number
  callsConnected: number
  talkTimeSeconds: number
  wrapUpTimeSeconds: number | null
  holdTimeSeconds: number | null
  averageHandleTimeSeconds: number | null
  firstCallResolutionRate: number | null
  transferRate: number | null
  callbackRate: number | null
  abandonRate: number | null
  conversionRate: number | null
  salesClosed: number | null
  appointmentsBooked: number | null
  revenueGenerated: number | null
}

export type WorkforceAttendanceMetrics = {
  clockStatus: string
  loginStatus: string
  sipRegistered: boolean
  workedSeconds: number
  activeSeconds: number
  idleSeconds: number | null
  breakSeconds: number | null
  lunchSeconds: number | null
  meetingSeconds: number | null
  trainingSeconds: number | null
  expectedSeconds: number | null
  lateLogin: boolean | null
  earlyLogout: boolean | null
  missedClockOut: boolean
  forcedLogout: boolean
  unexpectedDisconnects: number
  browserClosedWithoutClockOut: boolean
  multipleLoginAttempts: boolean
  vpnUsage: boolean | null
  ipChanges: number | null
  deviceChanges: number | null
}

export type WorkforceQualityMetrics = {
  qaScore: ScoreValue
  scriptAdherence: ScoreValue
  complianceViolations: number
  keywordDetections: number | null
  sentiment: string | null
  aiReviewedCalls: number
  coachingRecommendations: string[]
  autoFeedback: string[]
}

export type WorkforceProductivityMetrics = {
  campaignParticipation: number
  campaignHistory: string[]
  bestPerformingCampaign: string | null
  currentCampaign: string | null
  taskCompletion: ScoreValue
  dailyGoalProgress: ScoreValue
  monthlyGoalProgress: ScoreValue
  achievements: string[]
}

export type WorkforceRedFlag = {
  key: string
  label: string
  severity: 'watch' | 'critical'
  detail: string
}

export type WorkforceInsight = {
  tone: 'positive' | 'coaching' | 'risk' | 'neutral'
  text: string
}

export type WorkforceUserRow = {
  id: number | string
  name: string
  email: string
  role: string
  status: string
  scores: WorkforceScores
  attendance: WorkforceAttendanceMetrics
  calls: WorkforceCallMetrics
  quality: WorkforceQualityMetrics
  productivity: WorkforceProductivityMetrics
  redFlags: WorkforceRedFlag[]
  insights: WorkforceInsight[]
  rank: number
}

export type WorkforceTimelinePoint = {
  label: string
  calls: number
  answered: number
  answerRate: number
}

export type WorkforceLeaderboardRow = {
  id: number | string
  name: string
  role: string
  overall: ScoreValue
  risk: ScoreValue
  calls: number
  connected: number
  workedSeconds: number
}

export type WorkforceIntelligenceData = {
  generatedAt: string
  summary: {
    totalUsers: number
    onlineUsers: number
    clockedInUsers: number
    flaggedUsers: number
    averageOverallScore: ScoreValue
    averageRiskScore: ScoreValue
    callsMade: number
    callsConnected: number
    talkTimeSeconds: number
  }
  rows: WorkforceUserRow[]
  leaderboard: WorkforceLeaderboardRow[]
  timeline: WorkforceTimelinePoint[]
  redFlags: WorkforceRedFlag[]
}
