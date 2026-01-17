import { useState } from 'react';
import { FileText, ExternalLink, Shield, Check, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';

interface License {
  name: string;
  version: string;
  license: string;
  licenseType: 'permissive' | 'copyleft' | 'restrictive';
  url?: string;
}

const licenses: License[] = [
  {
    name: 'React',
    version: '19.0.0',
    license: 'MIT',
    licenseType: 'permissive',
    url: 'https://github.com/facebook/react',
  },
  {
    name: 'Tauri',
    version: '2.0.0',
    license: 'MIT/Apache-2.0',
    licenseType: 'permissive',
    url: 'https://tauri.app',
  },
  {
    name: 'Tailwind CSS',
    version: '3.4.0',
    license: 'MIT',
    licenseType: 'permissive',
    url: 'https://tailwindcss.com',
  },
  {
    name: 'TypeScript',
    version: '5.6.0',
    license: 'Apache-2.0',
    licenseType: 'permissive',
    url: 'https://www.typescriptlang.org',
  },
  {
    name: 'Vite',
    version: '7.3.0',
    license: 'MIT',
    licenseType: 'permissive',
    url: 'https://vitejs.dev',
  },
  {
    name: 'React Router',
    version: '7.0.0',
    license: 'MIT',
    licenseType: 'permissive',
    url: 'https://reactrouter.com',
  },
  {
    name: 'Zustand',
    version: '5.0.0',
    license: 'MIT',
    licenseType: 'permissive',
    url: 'https://zustand-demo.pmnd.rs',
  },
  {
    name: 'Lucide React',
    version: '0.460.0',
    license: 'ISC',
    licenseType: 'permissive',
    url: 'https://lucide.dev',
  },
  {
    name: 'Rust',
    version: '1.83.0',
    license: 'MIT/Apache-2.0',
    licenseType: 'permissive',
    url: 'https://www.rust-lang.org',
  },
  {
    name: 'Serde',
    version: '1.0.0',
    license: 'MIT/Apache-2.0',
    licenseType: 'permissive',
    url: 'https://serde.rs',
  },
  {
    name: 'Tokio',
    version: '1.0.0',
    license: 'MIT',
    licenseType: 'permissive',
    url: 'https://tokio.rs',
  },
];

export function LicensesPage() {
  const [filter, setFilter] = useState<'all' | 'permissive' | 'copyleft' | 'restrictive'>('all');

  const filteredLicenses =
    filter === 'all' ? licenses : licenses.filter((l) => l.licenseType === filter);

  const getLicenseTypeColor = (type: License['licenseType']) => {
    switch (type) {
      case 'permissive':
        return 'bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300';
      case 'copyleft':
        return 'bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300';
      case 'restrictive':
        return 'bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-300';
    }
  };

  const getLicenseTypeIcon = (type: License['licenseType']) => {
    switch (type) {
      case 'permissive':
        return <Check size={14} />;
      case 'copyleft':
        return <Shield size={14} />;
      case 'restrictive':
        return <AlertTriangle size={14} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          <span className="mr-2">📜</span>开源许可证
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          AEM 环境管理器使用的开源软件及其许可证信息
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-panel transition-shadow"
          onClick={() => setFilter('all')}
        >
          <CardContent className="text-center py-4">
            <div className="text-3xl font-bold text-azure">{licenses.length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">全部依赖</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-panel transition-shadow"
          onClick={() => setFilter('permissive')}
        >
          <CardContent className="text-center py-4">
            <div className="text-3xl font-bold text-success-500">
              {licenses.filter((l) => l.licenseType === 'permissive').length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">宽松许可证</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-panel transition-shadow"
          onClick={() => setFilter('copyleft')}
        >
          <CardContent className="text-center py-4">
            <div className="text-3xl font-bold text-warning-500">
              {licenses.filter((l) => l.licenseType === 'copyleft').length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Copyleft 许可证</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'permissive', 'copyleft', 'restrictive'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-azure-50 dark:bg-azure-900/30 text-azure-600 dark:text-azure-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {type === 'all' && '全部'}
            {type === 'permissive' && '宽松许可'}
            {type === 'copyleft' && 'Copyleft'}
            {type === 'restrictive' && '限制性'}
          </button>
        ))}
      </div>

      {/* License List */}
      <Card>
        <CardHeader title="依赖列表" subtitle={`显示 ${filteredLicenses.length} 个依赖`} />
        <CardContent>
          <div className="space-y-2">
            {filteredLicenses.map((dep) => (
              <div
                key={dep.name}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-slate-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {dep.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        v{dep.version}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {dep.license}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getLicenseTypeColor(dep.licenseType)}`}
                  >
                    {getLicenseTypeIcon(dep.licenseType)}
                    {dep.licenseType === 'permissive' && '宽松'}
                    {dep.licenseType === 'copyleft' && 'Copyleft'}
                    {dep.licenseType === 'restrictive' && '限制'}
                  </span>
                  {dep.url && (
                    <a
                      href={dep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* License Info */}
      <Card>
        <CardHeader title="许可证说明" />
        <CardContent>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getLicenseTypeColor('permissive')}`}
              >
                <Check size={12} /> 宽松
              </span>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  宽松许可证 (MIT, Apache-2.0, ISC)
                </p>
                <p>允许自由使用、修改和分发，只需保留原始版权声明。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getLicenseTypeColor('copyleft')}`}
              >
                <Shield size={12} /> Copyleft
              </span>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Copyleft 许可证 (GPL, LGPL)
                </p>
                <p>要求衍生作品也必须使用相同的许可证发布。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getLicenseTypeColor('restrictive')}`}
              >
                <AlertTriangle size={12} /> 限制
              </span>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">限制性许可证</p>
                <p>有特定的使用限制或商业使用要求。</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
