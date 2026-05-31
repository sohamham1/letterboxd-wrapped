import { useRef, useState } from 'react'
import JSZip from 'jszip'
import Papa from 'papaparse'
import Landing from './components/Landing'
import WrappedExperience from './components/WrappedExperience'
import { mapErrorToUserMessage, parseApiError } from './utils/errorMapper'
import './App.css'

function App() {
    const [userData, setUserData] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [sessionId, setSessionId] = useState(null)
    const [availableYears, setAvailableYears] = useState([])
    const [currentYear, setCurrentYear] = useState(2025)
    const [wrappedByYear, setWrappedByYear] = useState({})
    const [activeUsername, setActiveUsername] = useState('')
    const [isYearLoading, setIsYearLoading] = useState(false)
    const [yearFallbackNotice, setYearFallbackNotice] = useState('')
    const [isAcrossYearsLoading, setIsAcrossYearsLoading] = useState(false)
    const [uploadContext, setUploadContext] = useState({ username: '', realName: '', entries: [] })
    const [loadingProgress, setLoadingProgress] = useState({ phase: 'idle', percent: 0 })
    const [showLoadingMilestones, setShowLoadingMilestones] = useState(false)
    const loadingProgressTimerRef = useRef(null)
    const shouldTrackWrappedVisit = import.meta.env.VITE_ENABLE_WRAPPED_VISIT_METRICS !== 'false'

    const clearLoadingProgressTimer = () => {
        if (loadingProgressTimerRef.current) {
            clearInterval(loadingProgressTimerRef.current)
            loadingProgressTimerRef.current = null
        }
    }

    const setUploadProgress = (phase, percent) => {
        setLoadingProgress({ phase, percent })
    }

    const startAnalysisProgressTicker = () => {
        clearLoadingProgressTimer()
        loadingProgressTimerRef.current = setInterval(() => {
            setLoadingProgress((prev) => {
                if (prev.phase !== 'analyzing' || prev.percent >= 90) return prev
                const step = prev.percent < 78 ? 2 : 1
                return { ...prev, percent: Math.min(90, prev.percent + step) }
            })
        }, 850)
    }

    const trackWrappedVisit = async (username, year) => {
        if (!shouldTrackWrappedVisit) return
        try {
            await fetch('/api/metrics/wrapped-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, year }),
            })
        } catch {
            // Non-blocking analytics call.
        }
    }

    const handleFileUpload = async (file) => {
        setIsLoading(true)
        setError(null)
        setShowLoadingMilestones(false)
        setUploadProgress('unzipping', 8)

        try {
            const zip = await JSZip.loadAsync(file)
            const diaryFile = zip.file('diary.csv')
            if (!diaryFile) {
                throw new Error('diary.csv not found in the ZIP file. Please make sure you uploaded the correct Letterboxd export.')
            }

            setUploadProgress('parsing', 24)
            const diaryText = await diaryFile.async('text')
            const parsedDiary = Papa.parse(diaryText, {
                header: true,
                skipEmptyLines: true,
            })
            if (parsedDiary.errors.length > 0) {
                console.error('CSV parsing errors:', parsedDiary.errors)
            }
            const diaryEntries = parsedDiary.data
            setUploadProgress('parsing', 38)

            let username = 'user'
            let realName = ''
            try {
                const profileFile = zip.file('profile.csv')
                if (profileFile) {
                    const profileText = await profileFile.async('text')
                    const parsedProfile = Papa.parse(profileText, {
                        header: true,
                        skipEmptyLines: true,
                    })
                    if (parsedProfile.data.length > 0) {
                        username = parsedProfile.data[0].Username || 'user'
                        const givenName = parsedProfile.data[0]['Given Name'] || ''
                        const familyName = parsedProfile.data[0]['Family Name'] || ''
                        realName = `${givenName} ${familyName}`.trim()
                    }
                }
            } catch (e) {
                console.warn('Could not extract profile info:', e)
            }

            const entriesAll = diaryEntries
                .filter((entry) => {
                    const watchedDate = entry['Watched Date'] || entry['Date']
                    return Boolean(watchedDate)
                })
                .map((entry) => ({
                    film_name: entry.Name,
                    film_year: entry.Year,
                    watched_date: entry['Watched Date'] || entry['Date'],
                    rating: entry.Rating ? parseFloat(entry.Rating) * 2 : null,
                    rewatch: entry.Rewatch === 'Yes',
                    letterboxd_uri: entry['Letterboxd URI'],
                }))
            const entries2025Count = entriesAll.filter((entry) =>
                String(entry.watched_date || '').startsWith('2025-')
            ).length
            setShowLoadingMilestones(entries2025Count >= 120)

            if (entriesAll.length === 0) {
                setError("Couldn't find any logged films in this export.")
                setIsLoading(false)
                setShowLoadingMilestones(false)
                setUploadProgress('idle', 0)
                return
            }

            setUploadContext({ username, realName, entries: entriesAll })
            setUploadProgress('uploading', 56)

            const responsePromise = fetch(`/api/user/${username}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    real_name: realName,
                    entries: entriesAll,
                    source: 'upload',
                }),
            })
            setUploadProgress('analyzing', 66)
            startAnalysisProgressTicker()
            const response = await responsePromise

            const responseText = await response.text()
            clearLoadingProgressTimer()
            setUploadProgress('finalizing', 94)
            if (!response.ok) {
                const parsed = parseApiError(responseText, 'Failed to process your data')
                throw new Error(mapErrorToUserMessage(parsed.errorCode, parsed.message))
            }

            const result = JSON.parse(responseText)

            if (result.wrapped && result.sessionId) {
                const initYear = result.defaultYear || result.wrapped.year || 2025
                const years = result.availableYears || [initYear]
                setSessionId(result.sessionId)
                setAvailableYears(years)
                setCurrentYear(initYear)
                setWrappedByYear({ [initYear]: result.wrapped })
                setUserData(result.wrapped)
                setActiveUsername(username)
                if (!years.includes(2025) && initYear !== 2025) {
                    setYearFallbackNotice(`No logs found for 2025 — showing your latest available year: ${initYear}.`)
                } else {
                    setYearFallbackNotice('')
                }
                trackWrappedVisit(username, initYear)
            } else {
                const fallbackYear = result.year || 2025
                setSessionId(null)
                setAvailableYears([fallbackYear])
                setCurrentYear(fallbackYear)
                setWrappedByYear({ [fallbackYear]: result })
                setUserData(result)
                setActiveUsername(username)
                setYearFallbackNotice('')
                trackWrappedVisit(username, fallbackYear)
            }

            setUploadProgress('done', 100)
            setIsLoading(false)
        } catch (err) {
            clearLoadingProgressTimer()
            console.error('File processing error:', err)
            setError(err.message || 'Failed to process your Letterboxd export. Please try again.')
            setIsLoading(false)
            setShowLoadingMilestones(false)
            setUploadProgress('idle', 0)
        }
    }

    const handleLoadSample = async (filename) => {
        setIsLoading(true)
        setError(null)
        setShowLoadingMilestones(false)
        setUploadProgress('unzipping', 4)

        try {
            const response = await fetch(`/samples/${filename}`)
            if (!response.ok) {
                throw new Error(`Failed to download sample data: ${response.statusText}`)
            }
            const blob = await response.blob()
            const file = new File([blob], filename, { type: 'application/zip' })
            await handleFileUpload(file)
        } catch (err) {
            console.error('Error loading sample data:', err)
            setError(err.message || 'Failed to load sample dataset. Please try again.')
            setIsLoading(false)
            setUploadProgress('idle', 0)
        }
    }

    const handleSelectYear = async (year) => {
        if (!activeUsername || year === currentYear) return

        if (wrappedByYear[year]) {
            setCurrentYear(year)
            setUserData(wrappedByYear[year])
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        const loadYearDirectly = async (targetYear) => {
            const sourceEntries = uploadContext.entries || []
            const yearEntries = sourceEntries.filter((entry) => {
                const date = entry.watched_date || ''
                return String(date).startsWith(`${targetYear}-`)
            })

            if (yearEntries.length === 0) {
                throw new Error(`No logs found for ${targetYear}`)
            }

            const response = await fetch(`/api/user/${uploadContext.username || activeUsername}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: uploadContext.username || activeUsername,
                    real_name: uploadContext.realName || '',
                    entries: yearEntries,
                    source: 'upload-year-fallback',
                }),
            })

            const text = await response.text()
            if (!response.ok) {
                const parsed = parseApiError(text, `Failed to load ${targetYear} wrapped`)
                throw new Error(mapErrorToUserMessage(parsed.errorCode, parsed.message, targetYear))
            }
            const payload = JSON.parse(text)
            return payload.wrapped || payload
        }

        try {
            setIsYearLoading(true)
            let wrapped = null
            if (sessionId) {
                const response = await fetch(`/api/user/${activeUsername}/process/year`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, year }),
                })
                const text = await response.text()
                if (!response.ok) {
                    const parsed = parseApiError(text, `Failed to load ${year} wrapped`)
                    const mappedMessage = mapErrorToUserMessage(parsed.errorCode, parsed.message, year)
                    const sessionExpired = parsed.errorCode === 'SESSION_EXPIRED' || /session expired|upload session/i.test(mappedMessage)
                    if (!sessionExpired) {
                        throw new Error(mappedMessage)
                    }

                    wrapped = await loadYearDirectly(year)
                } else {
                    const payload = JSON.parse(text)
                    wrapped = payload.wrapped || payload
                }
            } else {
                wrapped = await loadYearDirectly(year)
            }

            setWrappedByYear((prev) => ({ ...prev, [year]: wrapped }))
            setCurrentYear(year)
            setUserData(wrapped)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err) {
            setError(err.message || `Couldn't load wrapped for ${year}`)
        } finally {
            setIsYearLoading(false)
        }
    }

    const handleReset = () => {
        setUserData(null)
        setError(null)
        setSessionId(null)
        setAvailableYears([])
        setCurrentYear(2025)
        setWrappedByYear({})
        setActiveUsername('')
        setIsYearLoading(false)
        setYearFallbackNotice('')
        setIsAcrossYearsLoading(false)
        setUploadContext({ username: '', realName: '', entries: [] })
        setShowLoadingMilestones(false)
        clearLoadingProgressTimer()
        setUploadProgress('idle', 0)
    }

    const handleLoadAcrossYears = async () => {
        if (!sessionId || !activeUsername || isAcrossYearsLoading) return
        const missingYears = availableYears.filter((year) => !wrappedByYear[year])
        if (missingYears.length === 0) return

        try {
            setIsAcrossYearsLoading(true)
            const responses = []
            // Serverless safety: avoid parallel heavy year recomputations that can
            // trigger FUNCTION_INVOCATION_TIMEOUT under load.
            for (const year of missingYears) {
                const response = await fetch(`/api/user/${activeUsername}/process/year`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, year }),
                })
                const text = await response.text()
                if (!response.ok) {
                    const parsed = parseApiError(text, `Failed to load ${year} wrapped`)
                    throw new Error(mapErrorToUserMessage(parsed.errorCode, parsed.message, year))
                }
                const payload = JSON.parse(text)
                responses.push({ year, wrapped: payload.wrapped || payload })
            }

            setWrappedByYear((prev) => {
                const next = { ...prev }
                responses.forEach(({ year, wrapped }) => {
                    next[year] = wrapped
                })
                return next
            })
        } catch (err) {
            setError(err.message || "Couldn't load across-years comparison")
        } finally {
            setIsAcrossYearsLoading(false)
        }
    }

    return (
        <div className="app">
            {error && (
                <div className="error-toast" onClick={() => setError(null)}>
                    {error}
                </div>
            )}
            {!userData ? (
                <Landing
                    onFileUpload={handleFileUpload}
                    onLoadSample={handleLoadSample}
                    isLoading={isLoading}
                    loadingProgress={loadingProgress}
                    showLoadingMilestones={showLoadingMilestones}
                />
            ) : (
                <WrappedExperience
                    userData={userData}
                    onReset={handleReset}
                    currentYear={currentYear}
                    availableYears={availableYears}
                    onSelectYear={handleSelectYear}
                    isYearLoading={isYearLoading}
                    wrappedByYear={wrappedByYear}
                    yearFallbackNotice={yearFallbackNotice}
                    onLoadAcrossYears={handleLoadAcrossYears}
                    isAcrossYearsLoading={isAcrossYearsLoading}
                />
            )}
        </div>
    )
}

export default App
