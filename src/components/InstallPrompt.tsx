import React, { useState, useEffect, useCallback } from 'react';
import './InstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export const InstallPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Check if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

        if (isStandalone) {
            return; // Already installed, don't show prompt
        }

        // Check if mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

        if (!isMobile) {
            return; // Not mobile, don't show prompt
        }

        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(isIOSDevice);

        // Check if we've already dismissed recently
        const dismissed = localStorage.getItem('install-prompt-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed, 10);
            const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) {
                return; // Dismissed within last 7 days
            }
        }

        // For iOS, show the prompt after a short delay
        if (isIOSDevice) {
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // For Android/Chrome, listen for beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setShowPrompt(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    }, [deferredPrompt, isIOS]);

    const handleDismiss = useCallback(() => {
        setShowPrompt(false);
        setShowIOSInstructions(false);
        localStorage.setItem('install-prompt-dismissed', Date.now().toString());
    }, []);

    if (!showPrompt) return null;

    return (
        <div className="install-prompt glass">
            {showIOSInstructions ? (
                <div className="ios-instructions">
                    <div className="ios-header">
                        <span className="ios-title">Install ReelPDF</span>
                        <button className="close-btn" onClick={handleDismiss} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                    <div className="ios-steps">
                        <div className="step">
                            <span className="step-number">1</span>
                            <span>Tap the <strong>Share</strong> button</span>
                            <svg className="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="step">
                            <span className="step-number">2</span>
                            <span>Select <strong>"Add to Home Screen"</strong></span>
                        </div>
                        <div className="step">
                            <span className="step-number">3</span>
                            <span>Tap <strong>"Add"</strong></span>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="prompt-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                            <line x1="12" y1="18" x2="12" y2="18" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="prompt-content">
                        <span className="prompt-title">Install ReelPDF</span>
                        <span className="prompt-text">Add to home screen for the best experience</span>
                    </div>
                    <div className="prompt-actions">
                        <button className="install-btn" onClick={handleInstall}>
                            Install
                        </button>
                        <button className="dismiss-btn" onClick={handleDismiss}>
                            Not now
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
