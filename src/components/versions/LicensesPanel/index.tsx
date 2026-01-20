import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  Edit,
  Calendar,
  Building2,
  FileKey,
  Clock,
  Link2,
  X,
  AlertTriangle,
  Upload,
  FolderOpen,
  Server,
  Search,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import * as licenseApi from '@/api/license';
import { useLicenses } from './useLicenses';
import { LicenseForm } from './LicenseForm';
import type { LicenseStatus } from '@/api/license';
import type { LicensesPanelProps } from '../types';

function LicenseStatusBadge({ status }: { status: LicenseStatus }) {
  const { t } = useTranslation();

  const getStatusConfig = () => {
    switch (status) {
      case 'valid':
        return { icon: Check, class: 'badge-success', label: t('licenses.status.valid') };
      case 'expiring':
        return { icon: Clock, class: 'badge-warning', label: t('licenses.status.expiring') };
      case 'expired':
        return { icon: AlertTriangle, class: 'badge-error', label: t('licenses.status.expired') };
      case 'invalid':
        return { icon: X, class: 'badge-error', label: t('licenses.status.invalid') };
      default:
        return { icon: AlertTriangle, class: 'badge-slate', label: t('licenses.status.unknown') };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${config.class}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}

export function LicensesPanel({ onLicensesChange }: LicensesPanelProps) {
  const { t } = useTranslation();
  const state = useLicenses(onLicensesChange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('licenses.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('licenses.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={state.loadLicenses}
            disabled={state.isLoading}
          >
            <RefreshCw size={14} className={state.isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="outline" size="sm" onClick={state.openScanDialog}>
            <Search size={14} />
            {t('licenses.scanLicenses')}
          </Button>
          <Button size="sm" onClick={() => state.setShowForm(true)}>
            <Plus size={14} />
            {t('licenses.addLicense')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {state.statistics && (
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => state.setFilter('all')}
            className={`p-3 rounded-lg text-center transition-colors ${
              state.filter === 'all'
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}
          >
            <div className="text-2xl font-bold text-primary">{state.statistics.total}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('licenses.stats.total')}
            </div>
          </button>
          <button
            onClick={() => state.setFilter('valid')}
            className={`p-3 rounded-lg text-center transition-colors ${
              state.filter === 'valid'
                ? 'bg-success/10 border border-success/30'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}
          >
            <div className="text-2xl font-bold text-success-500">{state.statistics.valid}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('licenses.stats.valid')}
            </div>
          </button>
          <button
            onClick={() => state.setFilter('expiring')}
            className={`p-3 rounded-lg text-center transition-colors ${
              state.filter === 'expiring'
                ? 'bg-warning/10 border border-warning/30'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}
          >
            <div className="text-2xl font-bold text-warning-500">{state.statistics.expiring}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('licenses.stats.expiring')}
            </div>
          </button>
          <button
            onClick={() => state.setFilter('expired')}
            className={`p-3 rounded-lg text-center transition-colors ${
              state.filter === 'expired'
                ? 'bg-error/10 border border-error/30'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}
          >
            <div className="text-2xl font-bold text-error-500">{state.statistics.expired}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('licenses.stats.expired')}
            </div>
          </button>
        </div>
      )}

      {/* License List */}
      <Card>
        <CardHeader
          title={t('licenses.list.title')}
          subtitle={t('licenses.list.subtitle', { count: state.filteredLicenses.length })}
        />
        <CardContent>
          {state.isLoading ? (
            <div className="text-center py-8">
              <RefreshCw size={24} className="animate-spin mx-auto text-slate-400" />
            </div>
          ) : state.filteredLicenses.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {state.licenses.length === 0
                ? t('licenses.noLicenses')
                : t('licenses.noMatchingLicenses')}
            </div>
          ) : (
            <div className="space-y-3">
              {state.filteredLicenses.map((license) => (
                <div
                  key={license.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileKey size={20} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {license.name}
                        </span>
                        <LicenseStatusBadge status={license.status} />
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {license.product_name}
                        {license.product_version && ` v${license.product_version}`}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
                        {license.customer_name && (
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            {license.customer_name}
                          </span>
                        )}
                        {license.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {licenseApi.formatExpiryDate(license.expiry_date)}
                          </span>
                        )}
                        {license.associated_instance_id && (
                          <span className="flex items-center gap-1">
                            <Link2 size={12} />
                            {t('licenses.linkedToInstance')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => state.handleEdit(license)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => state.handleDelete(license)}>
                      <Trash2 size={16} className="text-error-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Form Modal */}
      {state.showForm && (
        <LicenseForm
          license={state.editingLicense}
          onSave={state.handleSave}
          onCancel={state.handleCloseForm}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!state.deleteConfirmLicense}
        onClose={() => state.setDeleteConfirmLicense(null)}
        onConfirm={state.confirmDeleteLicense}
        title={t('licenses.dialog.deleteTitle')}
        message={t('licenses.confirmDelete', { name: state.deleteConfirmLicense?.name })}
        confirmText={t('common.delete')}
        variant="danger"
        isLoading={state.isDeletingLicense}
      />

      {/* Scan Dialog */}
      {state.showScanDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t('licenses.scan.title')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('licenses.scan.subtitle')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => state.setShowScanDialog(false)}>
                <X size={18} />
              </Button>
            </div>

            {/* Dialog Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Instance Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Server size={16} />
                  <span>{t('licenses.scan.instanceCount', { count: state.instances.length })}</span>
                </div>
                {state.instances.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {state.instances.map((inst) => inst.name).join(', ')}
                  </div>
                )}
              </div>

              {/* Scan Button */}
              <Button
                onClick={state.handleScanInstanceDirs}
                disabled={state.isScanning || state.instances.length === 0}
                className="w-full"
              >
                {state.isScanning ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    {t('licenses.scan.scanning')}
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    {t('licenses.scan.scanInstanceDirs')}
                  </>
                )}
              </Button>

              {/* Results */}
              {state.scanResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('licenses.scan.foundCount', { count: state.scanResults.length })}
                    </span>
                    <Button variant="ghost" size="sm" onClick={state.selectAllFiles}>
                      {state.selectedFiles.size === state.scanResults.length
                        ? t('licenses.scan.deselectAll')
                        : t('licenses.scan.selectAll')}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {state.scanResults.map((file) => (
                      <label
                        key={file.path}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.selectedFiles.has(file.path)
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={state.selectedFiles.has(file.path)}
                          onChange={() => state.toggleFileSelection(file.path)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {file.name}
                            </span>
                            {file.instance_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                                <Link2 size={10} />
                                {file.instance_name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <div className="flex items-center gap-1">
                              <FolderOpen size={12} />
                              <span className="truncate">{file.parent_directory}</span>
                            </div>
                            {file.product_name && <div className="mt-0.5">{file.product_name}</div>}
                            {file.customer_name && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Building2 size={12} />
                                {file.customer_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {state.isImporting && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>
                      {t('licenses.scan.importing', {
                        current: state.importProgress.current,
                        total: state.importProgress.total,
                      })}
                    </span>
                  </div>
                  <div className="mt-2 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${(state.importProgress.current / state.importProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => state.setShowScanDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={state.handleBatchImport}
                disabled={state.selectedFiles.size === 0 || state.isImporting}
              >
                <Upload size={16} />
                {t('licenses.scan.import', { count: state.selectedFiles.size })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
