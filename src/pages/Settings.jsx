import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, Settings as SettingsIcon, Link } from 'lucide-react'
import { format } from 'date-fns'

export default function Settings() {
  const [canvasUrl, setCanvasUrl] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [syncStatus, setSyncStatus] = useState(null)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  useEffect(() => {
    fetchSettings()
    fetchSyncStatus()
  }, [])

  const fetchSettings = async () => {
    try {
      const [urlRes, tokenRes] = await Promise.all([
        fetch('/api/settings/canvas_url'),
        fetch('/api/settings/canvas_token')
      ])
      const urlData = await urlRes.json()
      const tokenData = await tokenRes.json()

      if (urlData) setCanvasUrl(urlData.value)
      if (tokenData) setAccessToken(tokenData.value)
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/canvas/sync-status')
      const data = await res.json()
      setSyncStatus(data)
    } catch (error) {
      console.error('Error fetching sync status:', error)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/canvas/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasUrl, accessToken })
      })
      const data = await res.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({ success: false, error: error.message })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'canvas_url', value: canvasUrl })
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'canvas_token', value: accessToken })
        })
      ])
      alert('Settings saved successfully!')
      fetchSyncStatus()
    } catch (error) {
      alert('Error saving settings: ' + error.message)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      const res = await fetch('/api/canvas/sync', {
        method: 'POST'
      })
      const data = await res.json()
      setSyncResult(data)

      if (data.success) {
        fetchSyncStatus()
        setTimeout(() => {
          window.location.reload() // Reload to show new courses/assignments
        }, 2000)
      }
    } catch (error) {
      setSyncResult({ success: false, error: error.message })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure Canvas integration</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Canvas Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Link className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Canvas LMS Integration</h2>
              <p className="text-sm text-gray-500">Connect your Canvas account to sync courses and assignments</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canvas URL
              </label>
              <input
                type="text"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                placeholder="https://yourschool.instructure.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your institution's Canvas URL (e.g., https://canvas.instructure.com)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your Canvas access token"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate from: Canvas → Account → Settings → New Access Token
              </p>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <XCircle className="text-red-600" size={20} />
                  )}
                  <p className={`font-medium ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.success
                      ? 'Connection successful!'
                      : `Connection failed: ${testResult.error}`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={testing || !canvasUrl || !accessToken}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleSave}
                disabled={!canvasUrl || !accessToken}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus?.configured && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <RefreshCw className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Sync with Canvas</h2>
                <p className="text-sm text-gray-500">
                  {syncStatus.lastSync
                    ? `Last synced: ${format(new Date(syncStatus.lastSync), 'MMM d, yyyy h:mm a')}`
                    : 'Never synced'}
                </p>
              </div>
            </div>

            {/* Sync Result */}
            {syncResult && (
              <div className={`p-4 rounded-lg border mb-4 ${
                syncResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {syncResult.success ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <XCircle className="text-red-600" size={20} />
                  )}
                  <div>
                    <p className={`font-medium ${
                      syncResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {syncResult.success
                        ? 'Sync successful!'
                        : `Sync failed: ${syncResult.error}`}
                    </p>
                    {syncResult.success && syncResult.stats && (
                      <p className="text-sm text-green-700 mt-1">
                        Synced {syncResult.stats.courses} courses and {syncResult.stats.newAssignments} new assignments
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>What gets synced:</strong>
                <br />
                • All active courses with their instructors
                <br />
                • All assignments with due dates
                <br />
                • Assignment completion status
                <br />
                <br />
                Existing data won't be duplicated. Run sync anytime to get updates!
              </p>
            </div>
          </div>
        )}

        {/* How to Get Token */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-3">How to Get Your Canvas Access Token</h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-semibold">1.</span>
              <span>Log in to your Canvas account</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">2.</span>
              <span>Click on "Account" in the left sidebar</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">3.</span>
              <span>Click "Settings"</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">4.</span>
              <span>Scroll down to "Approved Integrations"</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">5.</span>
              <span>Click "+ New Access Token"</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">6.</span>
              <span>Give it a name (e.g., "Focus Twin") and click "Generate Token"</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">7.</span>
              <span>Copy the token and paste it above (you won't be able to see it again!)</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
