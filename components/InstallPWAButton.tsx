import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallPWAButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If prompt isn't directly available (e.g. desktop iOS / standard browser), notify user
      alert('To install EduSphere: Tap your browser menu (⋮ or Share) and select "Add to Home screen" or "Install App".');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('[PWA] Error displaying install prompt:', err);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      title="Install EduSphere App for offline and low-network access"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 glass-btn border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-600/30 hover:border-indigo-400 ${className}`}
    >
      <Download size={14} className="text-indigo-400 animate-bounce" />
      <span>Install App</span>
    </button>
  );
};

export default InstallPWAButton;
