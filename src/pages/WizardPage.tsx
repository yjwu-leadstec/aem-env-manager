import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import {
  scanJavaVersions,
  scanNodeVersions,
  detectVersionManagers,
  listMavenConfigs,
  type JavaVersion,
  type NodeVersion,
  type VersionManager,
  type MavenConfig,
} from '@/api';
import { listInstances, type AemInstance } from '@/api/instance';

type WizardStep = 'scan' | 'java' | 'node' | 'maven' | 'aem' | 'complete';

interface ScanResults {
  javaVersions: JavaVersion[];
  nodeVersions: NodeVersion[];
  versionManagers: VersionManager[];
  mavenConfigs: MavenConfig[];
  aemInstances: AemInstance[];
}

const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'scan', label: 'Scan', icon: <Search size={18} /> },
  { id: 'java', label: 'Java', icon: <Coffee size={18} /> },
  { id: 'node', label: 'Node', icon: <Hexagon size={18} /> },
  { id: 'maven', label: 'Maven', icon: <Settings size={18} /> },
  { id: 'aem', label: 'AEM', icon: <Server size={18} /> },
  { id: 'complete', label: 'Done', icon: <CheckCircle size={18} /> },
];

export function WizardPage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('scan');
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [selectedJava, setSelectedJava] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedMaven, setSelectedMaven] = useState<string | null>(null);
  const navigate = useNavigate();
  const updatePreferences = useAppStore((s) => s.updatePreferences);

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

  const handleFinish = () => {
    // Mark wizard as completed
    updatePreferences({ defaultView: 'dashboard' });
    navigate('/dashboard');
  };

  const handleScanComplete = (results: ScanResults) => {
    setScanResults(results);
    // Set defaults
    const defaultJava = results.javaVersions.find((j) => j.is_current || j.is_default);
    if (defaultJava) setSelectedJava(defaultJava.version);

    const defaultNode = results.nodeVersions.find((n) => n.is_current || n.is_default);
    if (defaultNode) setSelectedNode(defaultNode.version);

    const defaultMaven = results.mavenConfigs.find((m) => m.is_active);
    if (defaultMaven) setSelectedMaven(defaultMaven.id);
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
            <p className="text-sm text-slate-500 dark:text-slate-400">Setup Wizard</p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    index <= currentIndex
                      ? 'bg-azure text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded transition-colors ${
                      index < currentIndex ? 'bg-azure' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <span
                key={step.id}
                className={`text-xs font-medium ${
                  step.id === currentStep ? 'text-azure' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-8 py-6">
        <div className="max-w-2xl mx-auto">
          {currentStep === 'scan' && (
            <ScanStep onComplete={handleScanComplete} onNext={handleNext} />
          )}
          {currentStep === 'java' && (
            <JavaStep
              versions={scanResults?.javaVersions || []}
              managers={
                scanResults?.versionManagers.filter((m) =>
                  ['sdkman', 'jenv', 'jabba'].includes(m.manager_type)
                ) || []
              }
              selected={selectedJava}
              onSelect={setSelectedJava}
            />
          )}
          {currentStep === 'node' && (
            <NodeStep
              versions={scanResults?.nodeVersions || []}
              managers={
                scanResults?.versionManagers.filter((m) =>
                  ['nvm', 'fnm', 'volta', 'nvmwindows'].includes(m.manager_type)
                ) || []
              }
              selected={selectedNode}
              onSelect={setSelectedNode}
            />
          )}
          {currentStep === 'maven' && (
            <MavenStep
              configs={scanResults?.mavenConfigs || []}
              selected={selectedMaven}
              onSelect={setSelectedMaven}
            />
          )}
          {currentStep === 'aem' && <AemStep instances={scanResults?.aemInstances || []} />}
          {currentStep === 'complete' && (
            <CompleteStep onFinish={handleFinish} scanResults={scanResults} />
          )}
        </div>
      </main>

      {/* Footer */}
      {currentStep !== 'complete' && currentStep !== 'scan' && (
        <footer className="px-8 py-6 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <div className="max-w-2xl mx-auto flex justify-between">
            <Button
              variant="ghost"
              icon={<ArrowLeft size={16} />}
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              Back
            </Button>
            <Button
              variant="primary"
              icon={<ArrowRight size={16} />}
              iconPosition="right"
              onClick={handleNext}
            >
              {currentIndex === steps.length - 2 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

interface ScanStepProps {
  onComplete: (results: ScanResults) => void;
  onNext: () => void;
}

function ScanStep({ onComplete, onNext }: ScanStepProps) {
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResults | null>(null);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setError(null);

    try {
      // Run all scans in parallel
      const [javaVersions, nodeVersions, versionManagers, mavenConfigs, aemInstances] =
        await Promise.all([
          scanJavaVersions().catch(() => []),
          scanNodeVersions().catch(() => []),
          detectVersionManagers().catch(() => []),
          listMavenConfigs().catch(() => []),
          listInstances().catch(() => []),
        ]);

      const scanResults: ScanResults = {
        javaVersions,
        nodeVersions,
        versionManagers,
        mavenConfigs,
        aemInstances,
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-soft text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-azure-50 dark:bg-azure-900/30 flex items-center justify-center mb-6">
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
        Environment Scan
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {scanning
          ? 'Scanning your system for Java, Node.js, Maven, and AEM installations...'
          : error
            ? `Scan failed: ${error}`
            : scanComplete
              ? 'Scan complete! We found several installations on your system.'
              : "Let's start by scanning your system for development tools."}
      </p>

      {scanComplete && results && (
        <div className="grid grid-cols-2 gap-4 mb-6 text-left">
          <ScanResult
            icon={<Coffee size={20} />}
            label="Java versions"
            count={results.javaVersions.length}
          />
          <ScanResult
            icon={<Hexagon size={20} />}
            label="Node versions"
            count={results.nodeVersions.length}
          />
          <ScanResult
            icon={<Settings size={20} />}
            label="Maven configs"
            count={results.mavenConfigs.length}
          />
          <ScanResult
            icon={<Server size={20} />}
            label="AEM instances"
            count={results.aemInstances.length}
          />
        </div>
      )}

      {scanComplete && (
        <Button variant="primary" size="lg" icon={<ArrowRight size={18} />} onClick={onNext}>
          Continue Setup
        </Button>
      )}

      {error && (
        <Button variant="primary" size="lg" icon={<Search size={18} />} onClick={handleScan}>
          Retry Scan
        </Button>
      )}
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
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
      <div className="text-slate-500 dark:text-slate-400">{icon}</div>
      <div>
        <p className="font-medium text-slate-700 dark:text-slate-200">{count} found</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

interface JavaStepProps {
  versions: JavaVersion[];
  managers: VersionManager[];
  selected: string | null;
  onSelect: (version: string) => void;
}

function JavaStep({ versions, managers, selected, onSelect }: JavaStepProps) {
  const activeManager = managers.find((m) => m.is_active);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-soft">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-warning-50 dark:bg-warning-900/30 flex items-center justify-center">
          <Coffee size={24} className="text-warning" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Java Configuration
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Select your default Java version
            {activeManager && ` (managed by ${activeManager.name})`}
          </p>
        </div>
      </div>

      {versions.length === 0 ? (
        <EmptyState message="No Java installations found on your system" />
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {versions.map((java) => (
            <VersionOption
              key={java.version}
              version={java.version}
              vendor={java.vendor}
              path={java.path}
              selected={selected === java.version}
              isCurrent={java.is_current}
              onClick={() => onSelect(java.version)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NodeStepProps {
  versions: NodeVersion[];
  managers: VersionManager[];
  selected: string | null;
  onSelect: (version: string) => void;
}

function NodeStep({ versions, managers, selected, onSelect }: NodeStepProps) {
  const activeManager = managers.find((m) => m.is_active);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-soft">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-success-50 dark:bg-success-900/30 flex items-center justify-center">
          <Hexagon size={24} className="text-success" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Node.js Configuration
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Select your default Node.js version
            {activeManager && ` (managed by ${activeManager.name})`}
          </p>
        </div>
      </div>

      {versions.length === 0 ? (
        <EmptyState message="No Node.js installations found on your system" />
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {versions.map((node) => (
            <VersionOption
              key={node.version}
              version={node.version}
              path={node.path}
              selected={selected === node.version}
              isCurrent={node.is_current}
              onClick={() => onSelect(node.version)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MavenStepProps {
  configs: MavenConfig[];
  selected: string | null;
  onSelect: (id: string) => void;
}

function MavenStep({ configs, selected, onSelect }: MavenStepProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-soft">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-azure-50 dark:bg-azure-900/30 flex items-center justify-center">
          <Settings size={24} className="text-azure" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Maven Configuration
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Configure Maven settings.xml files</p>
        </div>
      </div>

      {configs.length === 0 ? (
        <div className="space-y-3">
          <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg">
            <p className="font-medium text-slate-700 dark:text-slate-200">Default settings.xml</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">~/.m2/settings.xml</p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            You can add more Maven configurations later in Settings
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {configs.map((config) => (
            <div
              key={config.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selected === config.id
                  ? 'border-azure bg-azure-50 dark:bg-azure-900/30 dark:border-azure-500'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              onClick={() => onSelect(config.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200">{config.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{config.path}</p>
                  {config.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {config.description}
                    </p>
                  )}
                </div>
                {config.is_active && (
                  <span className="px-2 py-1 bg-azure-50 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300 text-xs font-medium rounded">
                    Active
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AemStepProps {
  instances: AemInstance[];
}

function AemStep({ instances }: AemStepProps) {
  const addNotification = useAppStore((s) => s.addNotification);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-soft">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
          <Server size={24} className="text-teal" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">AEM Instances</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Configure your AEM instances (optional)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {instances.length === 0 ? (
          <EmptyState message="No AEM instances detected" />
        ) : (
          instances.map((instance) => (
            <div
              key={instance.id}
              className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">{instance.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {instance.host}:{instance.port} · {instance.instance_type}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  instance.status === 'running'
                    ? 'bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {instance.status}
              </span>
            </div>
          ))
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            addNotification({
              type: 'info',
              title: 'Add Instance',
              message: 'You can add more instances from the Instances page',
            })
          }
        >
          + Add another instance
        </Button>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          You can skip this step and add instances later
        </p>
      </div>
    </div>
  );
}

interface CompleteStepProps {
  onFinish: () => void;
  scanResults: ScanResults | null;
}

function CompleteStep({ onFinish, scanResults }: CompleteStepProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-soft text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-success-50 dark:bg-success-900/30 flex items-center justify-center mb-6">
        <CheckCircle size={40} className="text-success" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
        Setup Complete!
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        Your AEM development environment is ready. You can now manage your profiles, switch
        versions, and control AEM instances with ease.
      </p>

      {scanResults && (
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-slate-700 dark:text-slate-200 mb-2">Quick Summary</h3>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <li>✓ {scanResults.javaVersions.length} Java versions configured</li>
            <li>✓ {scanResults.nodeVersions.length} Node.js versions configured</li>
            <li>✓ {scanResults.mavenConfigs.length} Maven configurations added</li>
            <li>✓ {scanResults.aemInstances.length} AEM instance(s) detected</li>
          </ul>
        </div>
      )}

      <Button variant="primary" size="lg" onClick={onFinish}>
        Go to Dashboard
      </Button>
    </div>
  );
}

function VersionOption({
  version,
  vendor,
  path,
  selected,
  isCurrent,
  onClick,
}: {
  version: string;
  vendor?: string;
  path: string;
  selected?: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        selected
          ? 'border-azure bg-azure-50 dark:bg-azure-900/30 dark:border-azure-500'
          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">v{version}</span>
            {vendor && <span className="text-sm text-slate-500 dark:text-slate-400">{vendor}</span>}
            {isCurrent && (
              <span className="px-1.5 py-0.5 bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 text-xs font-medium rounded">
                Current
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 truncate max-w-xs">{path}</p>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-azure flex items-center justify-center">
            <CheckCircle size={14} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle size={32} className="text-slate-400 dark:text-slate-500 mb-3" />
      <p className="text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
