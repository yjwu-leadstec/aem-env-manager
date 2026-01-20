import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Coffee,
  Hexagon,
  Server,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Settings,
  Terminal,
  FolderCog,
  Plus,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import {
  scanJavaVersions,
  scanNodeVersions,
  detectVersionManagers,
  scanMavenSettings,
  type JavaVersion,
  type NodeVersion,
  type VersionManager,
  type MavenSettingsFile,
} from '@/api';
import { scanAemInstances, type AemInstance, type ScannedAemInstance } from '@/api/instance';
import {
  checkEnvironmentStatus,
  initializeEnvironment,
  type EnvironmentStatus,
  type InitResult,
} from '@/api/environment';

// Simplified wizard: init → scan → complete
type WizardStep = 'init' | 'scan' | 'complete';

interface ScanResults {
  javaVersions: JavaVersion[];
  nodeVersions: NodeVersion[];
  versionManagers: VersionManager[];
  mavenSettings: MavenSettingsFile[];
  aemInstances: AemInstance[];
  scannedAemInstances: ScannedAemInstance[];
}

export function WizardPage() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<WizardStep>('init');
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus | null>(null);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const navigate = useNavigate();
  const updatePreferences = useAppStore((s) => s.updatePreferences);

  // Simplified 3-step wizard
  const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
    { id: 'init', label: t('wizard.steps.init'), icon: <FolderCog size={18} /> },
    { id: 'scan', label: t('wizard.steps.scan'), icon: <Search size={18} /> },
    { id: 'complete', label: t('wizard.steps.complete'), icon: <CheckCircle size={18} /> },
  ];

  // Check environment status on mount
  useEffect(() => {
    checkEnvironmentStatus()
      .then((status) => {
        setEnvStatus(status);
        // If already initialized, skip to scan step
        if (status.is_initialized) {
          setCurrentStep('scan');
        }
      })
      .catch(() => {
        // Silently ignore errors on status check
      });
  }, []);

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handlePrev = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleScanComplete = (results: ScanResults) => {
    setScanResults(results);
  };

  const handleFinish = () => {
    // Mark wizard as completed
    updatePreferences({ defaultView: 'dashboard', wizardCompleted: true });
    navigate('/dashboard');
  };

  const handleCreateInstance = () => {
    // Mark wizard as completed and go to instances page with action=new
    updatePreferences({ defaultView: 'dashboard', wizardCompleted: true });
    navigate('/instances?action=new');
  };

  const handleCreateProfile = () => {
    // Mark wizard as completed and go to profiles page with action=new
    updatePreferences({ defaultView: 'dashboard', wizardCompleted: true });
    navigate('/profiles?action=new');
  };

  return (
    <div className="min-h-screen bg-sky-gradient dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-azure to-teal flex items-center justify-center">
            <span className="text-white font-bold">AEM</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              AEM Environment Manager
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('wizard.title')}</p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="px-8 py-4">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                      index <= currentIndex
                        ? 'bg-azure text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span
                    className={`text-xs font-medium mt-2 ${
                      step.id === currentStep ? 'text-azure' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-3 rounded transition-colors ${
                      index < currentIndex ? 'bg-azure' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-8 py-6">
        <div className="max-w-2xl mx-auto">
          {currentStep === 'init' && (
            <InitStep envStatus={envStatus} onNext={handleNext} onStatusUpdate={setEnvStatus} />
          )}
          {currentStep === 'scan' && (
            <ScanStep onComplete={handleScanComplete} onNext={handleNext} onBack={handlePrev} />
          )}
          {currentStep === 'complete' && (
            <CompleteStep
              onFinish={handleFinish}
              onCreateInstance={handleCreateInstance}
              onCreateProfile={handleCreateProfile}
              scanResults={scanResults}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================
// Init Step - Environment Initialization
// ============================================

interface InitStepProps {
  envStatus: EnvironmentStatus | null;
  onNext: () => void;
  onStatusUpdate: (status: EnvironmentStatus) => void;
}

function InitStep({ envStatus, onNext, onStatusUpdate }: InitStepProps) {
  const { t } = useTranslation();
  const [initializing, setInitializing] = useState(false);
  const [initResult, setInitResult] = useState<InitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setInitializing(true);
    setError(null);

    try {
      const result = await initializeEnvironment();
      setInitResult(result);

      if (result.success) {
        // Refresh status
        const newStatus = await checkEnvironmentStatus();
        onStatusUpdate(newStatus);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setInitializing(false);
    }
  };

  const isInitialized = envStatus?.is_initialized || initResult?.success;

  return (
    <div className="panel p-8 text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
        {initializing ? (
          <Loader2 size={40} className="text-azure animate-spin" />
        ) : error ? (
          <AlertCircle size={40} className="text-error" />
        ) : isInitialized ? (
          <CheckCircle size={40} className="text-success" />
        ) : (
          <Terminal size={40} className="text-azure" />
        )}
      </div>

      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
        {t('wizard.init.title')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {initializing
          ? t('wizard.init.initializing')
          : error
            ? t('wizard.init.error', { error })
            : isInitialized
              ? t('wizard.init.complete')
              : t('wizard.init.description')}
      </p>

      {/* Environment Status Details */}
      {envStatus && !isInitialized && (
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-slate-700 dark:text-slate-200 mb-3">
            {t('wizard.init.whatWillHappen')}
          </h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <FolderCog size={16} className="text-azure mt-0.5 flex-shrink-0" />
              <span>{t('wizard.init.step1', { path: envStatus.env_dir })}</span>
            </li>
            <li className="flex items-start gap-2">
              <Terminal size={16} className="text-azure mt-0.5 flex-shrink-0" />
              <span>{t('wizard.init.step2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-azure mt-0.5 flex-shrink-0" />
              <span>{t('wizard.init.step3')}</span>
            </li>
          </ul>
        </div>
      )}

      {/* Init Result Details */}
      {initResult?.success && (
        <div className="bg-success-50 dark:bg-success-900/30 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-success-700 dark:text-success-300 mb-2">
            {t('wizard.init.successTitle')}
          </h3>
          <ul className="space-y-1 text-sm text-success-600 dark:text-success-400">
            <li>✓ {t('wizard.init.createdDir', { path: initResult.env_dir })}</li>
            {initResult.shell_config_updated && <li>✓ {t('wizard.init.updatedShell')}</li>}
          </ul>
          <p className="mt-3 text-xs text-success-500 dark:text-success-400">
            {t('wizard.init.restartTerminal')}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!isInitialized && !initializing && (
          <Button
            variant="primary"
            size="lg"
            icon={<Terminal size={18} />}
            onClick={handleInitialize}
          >
            {t('wizard.init.initButton')}
          </Button>
        )}

        {error && (
          <Button
            variant="primary"
            size="lg"
            icon={<Terminal size={18} />}
            onClick={handleInitialize}
          >
            {t('wizard.init.retry')}
          </Button>
        )}

        {isInitialized && (
          <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} onClick={onNext}>
            {t('wizard.init.continue')}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Scan Step - Environment Scanning
// ============================================

interface ScanStepProps {
  onComplete: (results: ScanResults) => void;
  onNext: () => void;
  onBack: () => void;
}

function ScanStep({ onComplete, onNext, onBack }: ScanStepProps) {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResults | null>(null);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);

    try {
      // Run all scans in parallel - only scan for NEW data, don't use stored data
      const [javaVersions, nodeVersions, versionManagers, mavenSettings, scannedAemInstances] =
        await Promise.all([
          scanJavaVersions().catch(() => []),
          scanNodeVersions().catch(() => []),
          detectVersionManagers().catch(() => []),
          scanMavenSettings().catch(() => []),
          scanAemInstances().catch(() => []),
        ]);

      const scanResults: ScanResults = {
        javaVersions,
        nodeVersions,
        versionManagers,
        mavenSettings,
        aemInstances: [], // Don't include stored instances in wizard scan
        scannedAemInstances,
      };

      setResults(scanResults);
      setScanComplete(true);
      onComplete(scanResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }, [onComplete]);

  // Auto-start scan on mount
  useEffect(() => {
    if (!scanning && !scanComplete && !error) {
      handleScan();
    }
  }, [handleScan, scanning, scanComplete, error]);

  const handleRescan = useCallback(() => {
    setScanComplete(false);
    setResults(null);
    setError(null);
    // Directly trigger scan
    handleScan();
  }, [handleScan]);

  return (
    <div className="panel p-8 text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
        {scanning ? (
          <Loader2 size={40} className="text-azure animate-spin" />
        ) : error ? (
          <AlertCircle size={40} className="text-error" />
        ) : scanComplete ? (
          <CheckCircle size={40} className="text-success" />
        ) : (
          <Search size={40} className="text-azure" />
        )}
      </div>

      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
        {t('wizard.scan.title')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {scanning
          ? t('wizard.scan.scanning')
          : error
            ? t('wizard.scan.error', { error })
            : scanComplete
              ? t('wizard.scan.complete')
              : t('wizard.scan.start')}
      </p>

      {scanComplete && results && (
        <div className="grid grid-cols-2 gap-4 mb-6 text-left">
          <ScanResult
            icon={<Coffee size={20} />}
            label={t('wizard.scan.results.java')}
            count={results.javaVersions.length}
          />
          <ScanResult
            icon={<Hexagon size={20} />}
            label={t('wizard.scan.results.node')}
            count={results.nodeVersions.length}
          />
          <ScanResult
            icon={<Settings size={20} />}
            label={t('wizard.scan.results.maven')}
            count={results.mavenSettings.length}
          />
          <ScanResult
            icon={<Server size={20} />}
            label={t('wizard.scan.results.aem')}
            count={results.aemInstances.length + results.scannedAemInstances.length}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="lg"
          icon={<ArrowLeft size={18} />}
          onClick={onBack}
          disabled={scanning}
        >
          {t('wizard.nav.prev')}
        </Button>

        {scanComplete && (
          <>
            <Button variant="outline" size="lg" icon={<Search size={18} />} onClick={handleRescan}>
              {t('wizard.scan.rescan')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight size={18} />}
              iconPosition="right"
              onClick={onNext}
            >
              {t('wizard.scan.continue')}
            </Button>
          </>
        )}

        {error && (
          <Button variant="primary" size="lg" icon={<Search size={18} />} onClick={handleScan}>
            {t('wizard.scan.retry')}
          </Button>
        )}
      </div>
    </div>
  );
}

function ScanResult({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
      <div className="text-slate-500 dark:text-slate-400">{icon}</div>
      <div>
        <p className="font-medium text-slate-700 dark:text-slate-200">
          {t('wizard.scan.results.found', { count })}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// ============================================
// Complete Step - Setup Complete with Guidance
// ============================================

interface CompleteStepProps {
  onFinish: () => void;
  onCreateInstance: () => void;
  onCreateProfile: () => void;
  scanResults: ScanResults | null;
}

function CompleteStep({
  onFinish,
  onCreateInstance,
  onCreateProfile,
  scanResults,
}: CompleteStepProps) {
  const { t } = useTranslation();
  return (
    <div className="panel p-8 text-center">
      <div className="w-20 h-20 mx-auto rounded-full badge-success flex items-center justify-center mb-6">
        <CheckCircle size={40} className="text-success" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
        {t('wizard.complete.title')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {t('wizard.complete.subtitle')}
      </p>

      {scanResults && (
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-slate-700 dark:text-slate-200 mb-2">
            {t('wizard.complete.summary')}
          </h3>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <li>
              ✓ {t('wizard.complete.configuredJava', { count: scanResults.javaVersions.length })}
            </li>
            <li>
              ✓ {t('wizard.complete.configuredNode', { count: scanResults.nodeVersions.length })}
            </li>
            <li>
              ✓ {t('wizard.complete.configuredMaven', { count: scanResults.mavenSettings.length })}
            </li>
            <li>
              ✓{' '}
              {t('wizard.complete.detectedAem', {
                count: scanResults.aemInstances.length + scanResults.scannedAemInstances.length,
              })}
            </li>
          </ul>
        </div>
      )}

      {/* Next Step Guidance - AEM Instance First */}
      <div className="bg-azure-50 dark:bg-azure-900/30 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-medium text-azure-700 dark:text-azure-300 mb-2 flex items-center gap-2">
          <Rocket size={18} />
          {t('wizard.complete.nextStep')}
        </h3>
        <p className="text-sm text-azure-600 dark:text-azure-400 mb-3">
          {t('wizard.complete.nextStepDescAem')}
        </p>
      </div>

      {/* Action Buttons - AEM Instance as Primary */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button variant="primary" size="lg" icon={<Server size={18} />} onClick={onCreateInstance}>
          {t('wizard.complete.createInstance')}
        </Button>
        <Button variant="outline" size="lg" icon={<Plus size={18} />} onClick={onCreateProfile}>
          {t('wizard.complete.createProfile')}
        </Button>
        <Button variant="ghost" size="lg" onClick={onFinish}>
          {t('wizard.complete.later')}
        </Button>
      </div>
    </div>
  );
}
