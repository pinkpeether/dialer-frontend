import type { AiCallLog } from '../../../api/aiCalls.api'
import type { AgentReportRow, ReportTrendRow } from '../../../api/reports.api'
import type { AttendanceOverviewRow } from '../../../api/attendanceIntegrity.api'
import type {
  WorkforceFilters,
  WorkforceInsight,
  WorkforceIntelligenceData,
  WorkforceLeaderboardRow,
  WorkforceRedFlag,
  WorkforceScores,
  WorkforceTimelinePoint,
  WorkforceUserRow,
} from '../types/workforceIntelligence.types'

type UnknownRecord = Record<string, unknown>

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const str = (value: unknown, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback

const asArray = <T = UnknownRecord>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const record = value as UnknownRecord
    for (const key of ['items', 'rows', 'agents', 'campaigns', 'data', 'results']) {
      if (Array.isArray(record[key])) return record[key] as T[]
    }
  }
  return []
}

const clampScore = (value: number | null) => value === null ? null : Math.max(0, Math.min(100, Math.round(value)))

const average = (values: Array<number | null | undefined>) => {
  const available = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (!available.length) return null
  return clampScore(available.reduce((sum, value) => sum + value, 0) / available.length)
}

const percent = (part: number, total: number) => total > 0 ? (part / total) * 100 : null

export const formatSeconds = (seconds?: number | null) => {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export const formatScore = (score: number | null) => score === null ? '—' : `${score}`

const normalizeStatus = (value: unknown) => str(value, 'OFFLINE').replace(/_/g, ' ').toUpperCase()

const isActiveAttendance = (status: string) => ['CLOCKED IN', 'IDLE', 'ON BREAK', 'PENDING SUPERVISOR REVIEW'].includes(status)

const isSipRegistered = (user: AttendanceOverviewRow['user']) => {
  const presence = user.sipPresence
  if (!presence) return false
  const lastSeenAt = presence.lastSeenAt ? new Date(presence.lastSeenAt).getTime() : 0
  if (!Number.isFinite(lastSeenAt) || Date.now() - lastSeenAt > 90_000) return false
  const status = String(presence.status || '').toLowerCase()
  return Boolean(presence.registered || ['registered', 'in_call', 'calling', 'incoming'].includes(status))
}

const userKey = (value: unknown) => String(value || '').trim().toLowerCase()

const agentReportFor = (attendance: AttendanceOverviewRow, reports: AgentReportRow[]) => {
  const id = String(attendance.user.id)
  const email = userKey(attendance.user.email)
  const name = userKey(attendance.user.name)
  return reports.find(report => String(report.id) === id || userKey(report.name) === name || userKey(report.agentCode) === email) || null
}

const aiLogsFor = (attendance: AttendanceOverviewRow, logs: AiCallLog[]) => {
  const id = String(attendance.user.id)
  const name = userKey(attendance.user.name)
  return logs.filter(log => String(log.agentId || '') === id || userKey(log.agentName) === name)
}

const campaignNamesFrom = (leaderboard: UnknownRecord | UnknownRecord[], agentId: number | string) => {
  const rows = asArray<UnknownRecord>(leaderboard)
  const match = rows.find(row => String(row.agentId || row.id || row.userId || '') === String(agentId))
  const names = asArray<UnknownRecord>(match?.campaigns)
    .map(campaign => str(campaign.name))
    .filter(Boolean)
  return names
}

const redFlagsFor = (attendance: AttendanceOverviewRow, aiLogs: AiCallLog[], answerRate: number | null): WorkforceRedFlag[] => {
  const status = normalizeStatus(attendance.status)
  const session = attendance.session
  const flags: WorkforceRedFlag[] = []
  if (status === 'NO SESSION') {
    flags.push({ key: 'no-session', label: 'No Session', severity: 'watch', detail: 'No attendance session exists for the selected scope.' })
  }
  if (status === 'MISSED CLOCK OUT') {
    flags.push({ key: 'missed-clock-out', label: 'Missed Clock Out', severity: 'critical', detail: 'Attendance session was not closed correctly.' })
  }
  if (status === 'UNEXPECTED DISCONNECT') {
    flags.push({ key: 'unexpected-disconnect', label: 'Unexpected Disconnect', severity: 'critical', detail: 'Browser, network, or tab closed while attendance was active.' })
  }
  if (session?.redFlag) {
    flags.push({ key: 'backend-red-flag', label: 'Supervisor Review', severity: 'critical', detail: session.redFlagReason || 'Backend attendance integrity flag is active.' })
  }
  if ((session?.disconnectCount || 0) > 0) {
    flags.push({ key: 'disconnect-count', label: 'Frequent Disconnects', severity: session?.disconnectCount && session.disconnectCount > 2 ? 'critical' : 'watch', detail: `${session?.disconnectCount || 0} disconnect event(s) recorded.` })
  }
  if (!isSipRegistered(attendance.user) && ['ONLINE', 'READY', 'BUSY', 'WRAP UP'].includes(normalizeStatus(attendance.user.status))) {
    flags.push({ key: 'sip-offline', label: 'Dialer Not Registered', severity: 'watch', detail: 'User is logged in but SIP presence is not registered.' })
  }
  if (answerRate !== null && answerRate < 20 && (aiLogs.length > 0 || (attendance.activeSeconds || 0) > 0)) {
    flags.push({ key: 'low-answer-rate', label: 'Low Productivity', severity: 'watch', detail: `Answer rate is ${Math.round(answerRate)}% for the selected range.` })
  }
  const failedAiCalls = aiLogs.filter(log => log.callSuccessful === false).length
  if (failedAiCalls >= 3) {
    flags.push({ key: 'ai-call-failures', label: 'Repeated QA Failures', severity: 'watch', detail: `${failedAiCalls} AI-reviewed call(s) were unsuccessful.` })
  }
  return flags
}

const insightsFor = (row: {
  name: string
  answerRate: number | null
  attendanceStatus: string
  redFlags: WorkforceRedFlag[]
  aiLogs: AiCallLog[]
  overall: number | null
}): WorkforceInsight[] => {
  const insights: WorkforceInsight[] = []
  if (row.overall !== null && row.overall >= 85) {
    insights.push({ tone: 'positive', text: `${row.name} is performing at reward-ready level for the selected range.` })
  }
  if (row.answerRate !== null && row.answerRate >= 50) {
    insights.push({ tone: 'positive', text: 'Strong connection performance. Review this user for campaign best-practice sharing.' })
  }
  if (row.redFlags.some(flag => flag.severity === 'critical')) {
    insights.push({ tone: 'risk', text: 'Attendance integrity risk detected. Supervisor review is recommended before payroll approval.' })
  }
  if (row.aiLogs.some(log => String(log.userSentiment || '').toLowerCase().includes('negative'))) {
    insights.push({ tone: 'coaching', text: 'Negative sentiment detected in AI-reviewed calls. Add targeted coaching on tone and objection handling.' })
  }
  if (row.attendanceStatus === 'NO SESSION') {
    insights.push({ tone: 'neutral', text: 'No attendance session found for this user in the selected range.' })
  }
  if (!insights.length) {
    insights.push({ tone: 'neutral', text: 'No coaching risk detected from the currently available backend records.' })
  }
  return insights.slice(0, 3)
}

export const buildWorkforceIntelligence = (input: {
  filters: WorkforceFilters
  attendanceRows: AttendanceOverviewRow[]
  agentReports: AgentReportRow[]
  trend: ReportTrendRow[]
  aiLogs: AiCallLog[]
  leaderboard: unknown
  campaigns: unknown
}): WorkforceIntelligenceData => {
  const filteredAttendance = input.attendanceRows.filter(row => {
    if (input.filters.role !== 'all' && row.user.role !== input.filters.role) return false
    if (input.filters.agentId !== 'all' && Number(row.user.id) !== Number(input.filters.agentId)) return false
    return true
  })

  const rows = filteredAttendance.map<WorkforceUserRow>((attendance, index) => {
    const report = agentReportFor(attendance, input.agentReports)
    const logs = aiLogsFor(attendance, input.aiLogs)
    const status = normalizeStatus(attendance.status)
    const userStatus = normalizeStatus(attendance.user.status)
    const callsMade = num(report?.totalCalls)
    const callsConnected = num(report?.answered)
    const talkTimeSeconds = num(report?.totalTalkTimeSecs)
    const answerRate = typeof report?.answerRate === 'number' ? report.answerRate : percent(callsConnected, callsMade)
    const callbackLogs = logs.filter(log => String(log.lastEvent || log.callStatus || '').toLowerCase().includes('callback')).length
    const transferLogs = logs.filter(log => Boolean(log.transferDestination)).length
    const successfulAiCalls = logs.filter(log => log.callSuccessful === true).length
    const reviewedCalls = logs.length
    const positiveSentiment = logs.filter(log => String(log.userSentiment || '').toLowerCase().includes('positive')).length
    const negativeSentiment = logs.filter(log => String(log.userSentiment || '').toLowerCase().includes('negative')).length
    const redFlags = redFlagsFor(attendance, logs, answerRate)
    const reliabilityScore = clampScore(100 - (redFlags.filter(flag => flag.severity === 'critical').length * 30) - (redFlags.filter(flag => flag.severity === 'watch').length * 12))
    const attendanceScore = clampScore(status === 'NO SESSION' ? 45 : status === 'UNEXPECTED DISCONNECT' || status === 'MISSED CLOCK OUT' ? 35 : isActiveAttendance(status) ? 92 : 78)
    const salesScore = answerRate === null ? null : clampScore(answerRate)
    const aiQuality = reviewedCalls ? clampScore((successfulAiCalls / reviewedCalls) * 100) : null
    const customerExperience = reviewedCalls ? clampScore(((positiveSentiment + successfulAiCalls) / Math.max(1, reviewedCalls * 2)) * 100 - negativeSentiment * 15) : null
    const complianceScore = clampScore(100 - redFlags.length * 12 - negativeSentiment * 8)
    const riskScore = clampScore(redFlags.filter(flag => flag.severity === 'critical').length * 35 + redFlags.filter(flag => flag.severity === 'watch').length * 14)
    const productivityScore = callsMade > 0 ? clampScore(Math.min(100, callsMade * 8) * 0.45 + (answerRate || 0) * 0.55) : attendance.activeSeconds > 0 ? 55 : null
    const scores: WorkforceScores = {
      aiProductivity: productivityScore,
      aiQuality,
      attendance: attendanceScore,
      reliability: reliabilityScore,
      sales: salesScore,
      compliance: complianceScore,
      learning: reviewedCalls ? clampScore(65 + Math.min(25, reviewedCalls * 3)) : null,
      customerExperience,
      risk: riskScore,
      overall: null,
    }
    scores.overall = average([
      scores.aiProductivity,
      scores.aiQuality,
      scores.attendance,
      scores.reliability,
      scores.sales,
      scores.compliance,
      scores.learning,
      scores.customerExperience,
      riskScore === null ? null : 100 - riskScore,
    ])
    const campaignHistory = campaignNamesFrom(input.leaderboard as UnknownRecord[], attendance.user.id)
    const insightRows = insightsFor({
      name: attendance.user.name,
      answerRate,
      attendanceStatus: status,
      redFlags,
      aiLogs: logs,
      overall: scores.overall,
    })

    return {
      id: attendance.user.id,
      name: attendance.user.name || attendance.user.email || `User ${attendance.user.id}`,
      email: attendance.user.email,
      role: attendance.user.role,
      status: userStatus,
      scores,
      attendance: {
        clockStatus: status,
        loginStatus: userStatus,
        sipRegistered: isSipRegistered(attendance.user),
        workedSeconds: attendance.activeSeconds || attendance.session?.totalWorkedSeconds || 0,
        activeSeconds: attendance.activeSeconds || 0,
        idleSeconds: attendance.session?.idleSeconds ?? null,
        breakSeconds: attendance.session?.totalBreakSeconds ?? null,
        lunchSeconds: null,
        meetingSeconds: null,
        trainingSeconds: null,
        expectedSeconds: null,
        lateLogin: null,
        earlyLogout: null,
        missedClockOut: status === 'MISSED CLOCK OUT',
        forcedLogout: false,
        unexpectedDisconnects: attendance.session?.disconnectCount || 0,
        browserClosedWithoutClockOut: status === 'UNEXPECTED DISCONNECT',
        multipleLoginAttempts: Boolean(attendance.session?.redFlagReason?.toLowerCase().includes('multiple browser')),
        vpnUsage: null,
        ipChanges: null,
        deviceChanges: null,
      },
      calls: {
        callsMade,
        callsConnected,
        talkTimeSeconds,
        wrapUpTimeSeconds: null,
        holdTimeSeconds: null,
        averageHandleTimeSeconds: callsMade ? Math.round(talkTimeSeconds / callsMade) : null,
        firstCallResolutionRate: null,
        transferRate: percent(transferLogs, reviewedCalls),
        callbackRate: percent(callbackLogs, Math.max(callsMade, reviewedCalls)),
        abandonRate: null,
        conversionRate: null,
        salesClosed: null,
        appointmentsBooked: null,
        revenueGenerated: null,
      },
      quality: {
        qaScore: aiQuality,
        scriptAdherence: null,
        complianceViolations: redFlags.filter(flag => flag.severity === 'critical').length,
        keywordDetections: null,
        sentiment: positiveSentiment > negativeSentiment ? 'Positive' : negativeSentiment > positiveSentiment ? 'Negative' : reviewedCalls ? 'Neutral' : null,
        aiReviewedCalls: reviewedCalls,
        coachingRecommendations: insightRows.filter(insight => insight.tone === 'coaching' || insight.tone === 'risk').map(insight => insight.text),
        autoFeedback: insightRows.map(insight => insight.text),
      },
      productivity: {
        campaignParticipation: campaignHistory.length,
        campaignHistory,
        bestPerformingCampaign: campaignHistory[0] || null,
        currentCampaign: campaignHistory[0] || null,
        taskCompletion: null,
        dailyGoalProgress: null,
        monthlyGoalProgress: null,
        achievements: [
          ...(scores.overall !== null && scores.overall >= 85 ? ['Top Performer'] : []),
          ...(attendance.activeSeconds > 0 && redFlags.length === 0 ? ['Clean Attendance'] : []),
          ...(answerRate !== null && answerRate >= 50 ? ['High Connection Rate'] : []),
        ],
      },
      redFlags,
      insights: insightRows,
      rank: index + 1,
    }
  })

  const riskFilteredRows = rows.filter(row => {
    if (input.filters.risk === 'all') return true
    if (input.filters.risk === 'clean') return row.redFlags.length === 0
    if (input.filters.risk === 'critical') return row.redFlags.some(flag => flag.severity === 'critical')
    return row.redFlags.some(flag => flag.severity === 'watch')
  })

  const sortedRows = [...riskFilteredRows].sort((a, b) => (b.scores.overall ?? -1) - (a.scores.overall ?? -1)).map((row, index) => ({ ...row, rank: index + 1 }))
  const leaderboard: WorkforceLeaderboardRow[] = sortedRows.map(row => ({
    id: row.id,
    name: row.name,
    role: row.role,
    overall: row.scores.overall,
    risk: row.scores.risk,
    calls: row.calls.callsMade,
    connected: row.calls.callsConnected,
    workedSeconds: row.attendance.workedSeconds,
  }))

  const timeline: WorkforceTimelinePoint[] = input.trend.map(point => ({
    label: point.date,
    calls: num(point.total),
    answered: num(point.answered),
    answerRate: num(point.total) ? Math.round((num(point.answered) / num(point.total)) * 100) : 0,
  }))

  const allFlags = sortedRows.flatMap(row => row.redFlags)
  return {
    generatedAt: new Date().toISOString(),
    rows: sortedRows,
    leaderboard,
    timeline,
    redFlags: allFlags,
    summary: {
      totalUsers: sortedRows.length,
      onlineUsers: sortedRows.filter(row => ['ONLINE', 'READY', 'BUSY', 'WRAP UP'].includes(row.status)).length,
      clockedInUsers: sortedRows.filter(row => isActiveAttendance(row.attendance.clockStatus)).length,
      flaggedUsers: sortedRows.filter(row => row.redFlags.length > 0).length,
      averageOverallScore: average(sortedRows.map(row => row.scores.overall)),
      averageRiskScore: average(sortedRows.map(row => row.scores.risk)),
      callsMade: sortedRows.reduce((sum, row) => sum + row.calls.callsMade, 0),
      callsConnected: sortedRows.reduce((sum, row) => sum + row.calls.callsConnected, 0),
      talkTimeSeconds: sortedRows.reduce((sum, row) => sum + row.calls.talkTimeSeconds, 0),
    },
  }
}

export const exportWorkforceCsv = (rows: WorkforceUserRow[]) => {
  const header = ['Rank', 'Name', 'Email', 'Role', 'Status', 'SIP Registered', 'Clock Status', 'Overall Score', 'Risk Score', 'Calls Made', 'Calls Connected', 'Talk Time', 'Flags']
  const body = rows.map(row => [
    row.rank,
    row.name,
    row.email,
    row.role,
    row.status,
    row.attendance.sipRegistered ? 'Yes' : 'No',
    row.attendance.clockStatus,
    row.scores.overall ?? '',
    row.scores.risk ?? '',
    row.calls.callsMade,
    row.calls.callsConnected,
    formatSeconds(row.calls.talkTimeSeconds),
    row.redFlags.map(flag => flag.label).join('; '),
  ])
  const csv = [header, ...body]
    .map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ptdt-workforce-intelligence-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportWorkforceExcel = (rows: WorkforceUserRow[]) => {
  const tableRows = rows.map(row => `
    <tr>
      <td>${row.rank}</td><td>${row.name}</td><td>${row.email}</td><td>${row.role}</td>
      <td>${row.status}</td><td>${row.attendance.sipRegistered ? 'Yes' : 'No'}</td>
      <td>${row.attendance.clockStatus}</td><td>${row.scores.overall ?? ''}</td><td>${row.scores.risk ?? ''}</td>
      <td>${row.calls.callsMade}</td><td>${row.calls.callsConnected}</td><td>${formatSeconds(row.calls.talkTimeSeconds)}</td>
      <td>${row.redFlags.map(flag => flag.label).join('; ')}</td>
    </tr>`).join('')
  const html = `<table><thead><tr><th>Rank</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>SIP Registered</th><th>Clock Status</th><th>Overall Score</th><th>Risk Score</th><th>Calls Made</th><th>Calls Connected</th><th>Talk Time</th><th>Flags</th></tr></thead><tbody>${tableRows}</tbody></table>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ptdt-workforce-intelligence-${new Date().toISOString().slice(0, 10)}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
