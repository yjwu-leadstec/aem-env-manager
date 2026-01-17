import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';

type WizardStep = 'scan' | 'java' | 'node' | 'maven' | 'aem' | 'complete';

const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'scan', label: 'Scan', icon: <Search size={18} /> },
  { id: 'java', label: 'Java', icon: <Coffee size={18} /> },
  { id: 'node', label: 'Node', icon: <Hexagon size={18} /> },
  { id: 'maven', label: 'Maven', icon: <Server size={18} /> },
  { id: 'aem', label: 'AEM', icon: <Server size={18} /> },
  { id: 'complete', label: 'Done', icon: <CheckCircle size={18} /> },
];

export function WizardPage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('scan');
  const navigate = useNavigate();

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
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-sky-gradient flex flex-col">
      {/* Header */}
      <header className="py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-azure to-teal flex items-center justify-center">
            <span className="text-white font-bold">AEM</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">AEM Environment Manager</h1>
            <p className="text-sm text-slate-500">Setup Wizard</p>
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
                    index <= currentIndex ? 'bg-azure text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded transition-colors ${
                      index < currentIndex ? 'bg-azure' : 'bg-slate-200'
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
                  step.id === currentStep ? 'text-azure' : 'text-slate-400'
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
          {currentStep === 'scan' && <ScanStep onComplete={handleNext} />}
          {currentStep === 'java' && <JavaStep />}
          {currentStep === 'node' && <NodeStep />}
          {currentStep === 'maven' && <MavenStep />}
          {currentStep === 'aem' && <AemStep />}
          {currentStep === 'complete' && <CompleteStep onFinish={handleFinish} />}
        </div>
      </main>

      {/* Footer */}
      {currentStep !== 'complete' && (
        <footer className="px-8 py-6 border-t border-slate-200 bg-white/50">
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

function ScanStep({ onComplete: _onComplete }: { onComplete: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanComplete(true);
    }, 3000);
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-soft text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-azure-50 flex items-center justify-center mb-6">
        {scanning ? (
          <Loader2 size={40} className="text-azure animate-spin" />
        ) : scanComplete ? (
          <CheckCircle size={40} className="text-success" />
        ) : (
          <Search size={40} className="text-azure" />
        )}
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">Environment Scan</h2>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">
        {scanning
          ? 'Scanning your system for Java, Node.js, Maven, and AEM installations...'
          : scanComplete
            ? 'Scan complete! We found several installations on your system.'
            : "Let's start by scanning your system for development tools."}
      </p>

      {scanComplete && (
        <div className="grid grid-cols-2 gap-4 mb-6 text-left">
          <ScanResult icon={<Coffee size={20} />} label="Java versions" count={3} />
          <ScanResult icon={<Hexagon size={20} />} label="Node versions" count={5} />
          <ScanResult icon={<Server size={20} />} label="Maven configs" count={2} />
          <ScanResult icon={<Server size={20} />} label="AEM instances" count={1} />
        </div>
      )}

      {!scanComplete && (
        <Button
          variant="primary"
          size="lg"
          icon={scanning ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? 'Scanning...' : 'Start Scan'}
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
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      <div className="text-slate-500">{icon}</div>
      <div>
        <p className="font-medium text-slate-700">{count} found</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function JavaStep() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-soft">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-warning-50 flex items-center justify-center">
          <Coffee size={24} className="text-warning" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Java Configuration</h2>
          <p className="text-slate-500">Select your default Java version</p>
        </div>
      </div>

      <div className="space-y-3">
        <VersionOption version="21.0.2" vendor="OpenJDK" path="/usr/lib/jvm/java-21" selected />
        <VersionOption version="17.0.9" vendor="Temurin" path="/usr/lib/jvm/java-17" />
        <VersionOption version="11.0.21" vendor="Corretto" path="/usr/lib/jvm/java-11" />
      </div>
    </div>
  );
}

function NodeStep() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-soft">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center">
          <Hexagon size={24} className="text-success" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Node.js Configuration</h2>
          <p className="text-slate-500">Select your default Node.js version</p>
        </div>
      </div>

      <div className="space-y-3">
        <VersionOption version="20.11.0" path="~/.nvm/versions/node/v20.11.0" selected />
        <VersionOption version="18.19.0" path="~/.nvm/versions/node/v18.19.0" />
        <VersionOption version="16.20.2" path="~/.nvm/versions/node/v16.20.2" />
      </div>
    </div>
  );
}

function MavenStep() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-soft">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-azure-50 flex items-center justify-center">
          <Server size={24} className="text-azure" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Maven Configuration</h2>
          <p className="text-slate-500">Configure Maven settings.xml files</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 border border-slate-200 rounded-lg">
          <p className="font-medium text-slate-700">Default settings.xml</p>
          <p className="text-sm text-slate-500">~/.m2/settings.xml</p>
        </div>
        <Button variant="outline" className="w-full">
          + Add another configuration
        </Button>
      </div>
    </div>
  );
}

function AemStep() {
  const addNotification = useAppStore((s) => s.addNotification);

  return (
    <div className="bg-white rounded-2xl p-8 shadow-soft">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
          <Server size={24} className="text-teal" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">AEM Instances</h2>
          <p className="text-slate-500">Configure your AEM instances (optional)</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">Local Author</p>
            <p className="text-sm text-slate-500">localhost:4502</p>
          </div>
          <span className="px-2 py-1 bg-success-50 text-success-700 text-xs font-medium rounded">
            Detected
          </span>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            addNotification({
              type: 'info',
              title: 'Add Instance',
              message: 'Instance form will be implemented in Phase 2D',
            })
          }
        >
          + Add another instance
        </Button>
        <p className="text-sm text-slate-500 text-center">
          You can skip this step and add instances later
        </p>
      </div>
    </div>
  );
}

function CompleteStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-soft text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-success-50 flex items-center justify-center mb-6">
        <CheckCircle size={40} className="text-success" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">Setup Complete!</h2>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">
        Your AEM development environment is ready. You can now manage your profiles, switch
        versions, and control AEM instances with ease.
      </p>

      <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-medium text-slate-700 mb-2">Quick Summary</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>✓ 3 Java versions configured</li>
          <li>✓ 5 Node.js versions configured</li>
          <li>✓ 2 Maven configurations added</li>
          <li>✓ 1 AEM instance detected</li>
        </ul>
      </div>

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
}: {
  version: string;
  vendor?: string;
  path: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        selected ? 'border-azure bg-azure-50' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">v{version}</span>
            {vendor && <span className="text-sm text-slate-500">{vendor}</span>}
          </div>
          <p className="text-sm text-slate-400">{path}</p>
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
