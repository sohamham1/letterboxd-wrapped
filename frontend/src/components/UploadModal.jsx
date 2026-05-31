import { useState } from 'react'
import './UploadModal.css'

function UploadModal({ onClose, onFileUpload, onLoadSample }) {
    const [view, setView] = useState('upload')
    const [isDragging, setIsDragging] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [statusMessage, setStatusMessage] = useState('')
    const [statusKind, setStatusKind] = useState('info')
    const [showWhy, setShowWhy] = useState(false)

    const sampleProfiles = [
        {
            id: 'arthouse_sara',
            name: 'Arthouse Sara',
            tagline: 'Deep dramas, foreign classics, and indie gems',
            emoji: '🎨',
            filename: 'arthouse_sara.zip'
        },
        {
            id: 'blockbuster_bob',
            name: 'Blockbuster Bob',
            tagline: 'Action, sci-fi, and high-octane blockbusters',
            emoji: '🍿',
            filename: 'blockbuster_bob.zip'
        },
        {
            id: 'nostalgic_clara',
            name: 'Nostalgic Clara',
            tagline: 'Golden age of cinema: 70s, 80s, and 90s hits',
            emoji: '🎞️',
            filename: 'nostalgic_clara.zip'
        },
        {
            id: 'binge_pat',
            name: 'Binge Watcher Pat',
            tagline: 'High volume watcher: comedies, animation, and fun',
            emoji: '🍕',
            filename: 'binge_pat.zip'
        },
        {
            id: 'critical_tim',
            name: 'Critical Tim',
            tagline: 'Extremely picky critic: tough reviews and low ratings',
            emoji: '🧐',
            filename: 'critical_tim.zip'
        }
    ]

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        
        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFileSelect(files[0])
        }
    }

    const handleFileSelect = (file) => {
        if (file && file.name.endsWith('.zip')) {
            setSelectedFile(file)
            setStatusMessage('')
        } else {
            setStatusKind('error')
            setStatusMessage('Please select a ZIP file from Letterboxd.')
        }
    }

    const handleFileInput = (e) => {
        const files = e.target.files
        if (files.length > 0) {
            handleFileSelect(files[0])
        }
    }

    const handleUpload = () => {
        if (selectedFile) {
            onFileUpload(selectedFile)
        }
    }

    const exportUrl = "https://letterboxd.com/settings/data/"
    const handleCopyLink = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(exportUrl)
                setStatusKind('success')
                setStatusMessage('Link copied. Paste it in your browser.')
                return
            }
            throw new Error('Copy failed')
        } catch {
            setStatusKind('error')
            setStatusMessage('Could not copy the link. If you are on HTTP, copy manually.')
        }
    }
    const handleOpenBrowser = () => {
        window.open(exportUrl, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="upload-modal-overlay" onClick={onClose}>
            <div className={`upload-modal-content upload-modal-content--${view}`} onClick={(e) => e.stopPropagation()}>
                <button className="upload-modal-close" onClick={onClose}>×</button>
                
                {view === 'upload' ? (
                    <>
                        <div className="upload-modal-header">
                            <h2 className="upload-modal-title">Generate Your Letterboxd Wrapped</h2>
                            <p className="upload-modal-subtitle">Secure processing • No third-party sharing</p>
                            {statusMessage && (
                                <p className={`upload-modal-status upload-modal-status--${statusKind}`}>
                                    {statusMessage}
                                </p>
                            )}
                        </div>

                        <div className="upload-modal-instructions">
                            <h3>Step-by-Step Instructions</h3>
                            
                            <div className="instruction-step">
                                <div className="step-num">1</div>
                                <div className="step-text">
                                    <strong>Sign in to Letterboxd</strong>
                                    <p>Open Letterboxd in your browser and log into your account as usual.</p>
                                </div>
                            </div>

                            <div className="instruction-step">
                                <div className="step-num">2</div>
                                <div className="step-text">
                                    <strong>Go to the Data Export Page</strong>
                                    <p>Visit this link:</p>
                                    <a 
                                        href={exportUrl}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="export-link"
                                    >
                                        👉 https://letterboxd.com/settings/data/
                                    </a>
                                    <div className="export-actions">
                                        <button className="export-copy-btn" onClick={handleCopyLink}>
                                            Copy Link
                                        </button>
                                        <button className="export-copy-btn primary mobile-primary" onClick={handleOpenBrowser}>
                                            Open in Browser
                                        </button>
                                    </div>
                                    <div className="mobile-note">
                                        <strong>Mobile users:</strong> You must open this link in your phone’s browser
                                        (Safari/Chrome). If it opens the Letterboxd app, you may get stuck or see errors.
                                        Use <em>Open in Browser</em> or copy the link and paste it into your browser.
                                        <button
                                            type="button"
                                            className="mobile-note-why"
                                            onClick={() => setShowWhy((v) => !v)}
                                            aria-expanded={showWhy}
                                        >
                                            Why?
                                        </button>
                                        {showWhy && (
                                            <div className="mobile-note-detail">
                                                The Letterboxd app sometimes fails to load the data export page.
                                                Opening the link in Safari/Chrome avoids the loop and lets you download the ZIP.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="instruction-step">
                                <div className="step-num">3</div>
                                <div className="step-text">
                                    <strong>Start and Confirm Export</strong>
                                    <p>
                                        Click <em>Export your data</em>, then click <em>Export Data</em> in the confirmation prompt.
                                    </p>
                                </div>
                            </div>

                            <div className="instruction-step">
                                <div className="step-num">4</div>
                                <div className="step-text">
                                    <strong>Download the ZIP File</strong>
                                    <p>A ZIP file will start downloading immediately.<br/>
                                    Let it finish — don't unzip it.</p>
                                </div>
                            </div>

                            <div className="instruction-step">
                                <div className="step-num">5</div>
                                <div className="step-text">
                                    <strong>Upload It Here</strong>
                                    <p>Back on this site:</p>
                                    <ul>
                                        <li>Upload the ZIP file into the space below</li>
                                        <li>Sit back — we'll compile your Wrapped for you 🎬✨</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="instruction-step">
                                <div className="step-num">6</div>
                                <div className="step-text">
                                    <strong>Using the Letterboxd app?</strong>
                                    <p>
                                        If the app loops, keeps loading, or shows a web error,
                                        switch to your phone’s browser, log in there, and visit the data export page
                                        from the link above.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div 
                            className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-input').click()}
                        >
                            <input
                                id="file-input"
                                type="file"
                                accept=".zip"
                                onChange={handleFileInput}
                                style={{ display: 'none' }}
                            />
                            
                            {selectedFile ? (
                                <div className="file-selected">
                                    <div className="file-icon">📦</div>
                                    <div className="file-name">{selectedFile.name}</div>
                                    <div className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                                    <button className="upload-btn" onClick={(e) => { e.stopPropagation(); handleUpload(); }}>
                                        Generate My Wrapped →
                                    </button>
                                </div>
                            ) : (
                                <div className="dropzone-placeholder">
                                    <div className="upload-icon">📁</div>
                                    <p className="dropzone-text">Drag & drop your Letterboxd ZIP file here</p>
                                    <p className="dropzone-subtext">or Click to Browse</p>
                                </div>
                            )}
                        </div>

                        <div className="upload-modal-privacy">
                            <h4>🔐 Your Data = Your Privacy</h4>
                            <ul>
                                <li>✔️ Your ZIP is sent securely to our wrapped processing API</li>
                                <li>✔️ Data is used only to generate your wrapped experience</li>
                                <li>✔️ We do not share your personal export with third parties</li>
                            </ul>
                            <p className="privacy-note">Upload only your own Letterboxd export.</p>
                        </div>

                        {onLoadSample && (
                            <div className="upload-modal-samples-trigger">
                                <button 
                                    type="button" 
                                    className="samples-trigger-btn"
                                    onClick={() => setView('samples')}
                                >
                                    Don't have your own Letterboxd ZIP export? <span>Try a sample profile</span>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="upload-modal-header">
                            <h2 className="upload-modal-title">Try a Sample Profile</h2>
                            <p className="upload-modal-subtitle">Pick a movie-goer persona to explore their Wrapped experience</p>
                        </div>

                        <div className="samples-catalog">
                            {sampleProfiles.map((profile) => (
                                <button
                                    key={profile.id}
                                    className="sample-catalog-card"
                                    onClick={() => onLoadSample && onLoadSample(profile.filename)}
                                    title={`Explore ${profile.name}'s wrapped`}
                                >
                                    <span className="sample-catalog-emoji">{profile.emoji}</span>
                                    <div className="sample-catalog-info">
                                        <h3 className="sample-catalog-name">{profile.name}</h3>
                                        <p className="sample-catalog-tagline">{profile.tagline}</p>
                                    </div>
                                    <span className="sample-catalog-arrow">→</span>
                                </button>
                            ))}
                        </div>

                        <div className="samples-back-wrapper">
                            <button 
                                type="button" 
                                className="samples-back-btn"
                                onClick={() => setView('upload')}
                            >
                                ← Back to Upload
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default UploadModal
