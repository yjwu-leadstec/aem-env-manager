import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCode,
  Check,
  Plus,
  Trash2,
  Edit,
  X,
  Upload,
  Eye,
  FolderOpen,
  Search,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useMavenConfig } from './useMavenConfig';
import { useMavenSearch } from './useMavenSearch';
import type { MavenPanelProps } from '../types';

export function MavenConfigPanel({ mavenInfo, onRefresh }: MavenPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use custom hooks for state management
  const config = useMavenConfig(mavenInfo, onRefresh);
  const search = useMavenSearch(mavenInfo, onRefresh);

  const handleBrowseFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xml"
        onChange={search.handleFileSelect}
      />

      {/* Current Configuration */}
      <Card>
        <CardHeader title={t('maven.current.title')} subtitle={t('maven.current.subtitle')} />
        <CardContent>
          {mavenInfo?.current ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-azure-50 dark:bg-azure-900/30">
              <div className="flex items-center gap-3">
                <FileCode size={20} className="text-azure-500" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {mavenInfo.current.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mavenInfo.current.path}
                  </p>
                  {mavenInfo.current.local_repository && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      📁 {t('maven.localRepo')}: {mavenInfo.current.local_repository}
                    </p>
                  )}
                </div>
              </div>
              <Check size={20} className="text-azure" />
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">
              {t('maven.current.default')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Saved Configurations */}
      <Card>
        <CardHeader
          title={t('maven.configs.title')}
          subtitle={t('maven.configs.subtitle', { count: mavenInfo?.configs.length || 0 })}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => config.setShowCreateDialog(true)}
              >
                {t('maven.create.button')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Upload size={14} />}
                onClick={() => search.setShowImportDialog(true)}
              >
                {t('common.import')}
              </Button>
            </div>
          }
        />
        <CardContent>
          {!mavenInfo?.configs || mavenInfo.configs.length === 0 ? (
            <div className="text-center py-6">
              <FileCode size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">{t('maven.configs.empty')}</p>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => search.setShowImportDialog(true)}
              >
                {t('maven.configs.importHint')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {mavenInfo.configs.map((configItem) => (
                <div
                  key={configItem.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    configItem.is_active
                      ? 'bg-azure-50 dark:bg-azure-900/30'
                      : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCode size={20} className="text-azure-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {configItem.name}
                        </p>
                        {configItem.is_active && (
                          <span className="px-1.5 py-0.5 bg-azure-100 dark:bg-azure-800 text-azure-700 dark:text-azure-300 text-xs rounded">
                            {t('common.current')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {configItem.path}
                      </p>
                      {configItem.local_repository && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          📁 {configItem.local_repository}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => config.handleViewDetail(configItem.id)}
                      title={t('maven.viewDetail')}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => config.handleEditConfig(configItem.id)}
                      disabled={config.editingConfig === configItem.id}
                      title={t('maven.edit.button')}
                    >
                      {config.editingConfig === configItem.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Edit size={16} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => config.handleCopyPath(configItem.id)}
                      title={t('maven.path.copy')}
                    >
                      <Copy size={16} />
                    </Button>
                    {!configItem.is_active && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => config.handleSwitch(configItem.id)}
                          disabled={config.switchingConfig === configItem.id}
                        >
                          {config.switchingConfig === configItem.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            t('common.use')
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => config.handleDelete(configItem.id, configItem.name)}
                          disabled={config.deletingConfig === configItem.id}
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} className="text-error-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      {search.showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">{t('maven.importDialog.title')}</h3>
              <button
                onClick={search.handleCloseImportDialog}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Search Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <label className="block text-sm font-medium mb-2">{t('maven.search.title')}</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {t('maven.search.description')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={search.searchPath}
                    onChange={(e) => search.setSearchPath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 font-mono text-sm"
                    placeholder={t('maven.search.pathPlaceholder')}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={search.handleBrowseSearchPath}
                    title={t('maven.search.browse')}
                  >
                    <FolderOpen size={16} />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => search.handleSearch()}
                    disabled={search.isSearching || !search.searchPath.trim()}
                  >
                    {search.isSearching ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {search.searchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {t('maven.search.resultsTitle', { count: search.searchResults.length })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={search.toggleSelectAll}
                          className="text-xs text-azure-600 dark:text-azure-400 hover:underline"
                        >
                          {search.selectedFiles.size === search.searchResults.length
                            ? t('maven.batch.deselectAll')
                            : t('maven.batch.selectAll')}
                        </button>
                        {search.selectedFiles.size > 0 && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={search.handleBatchImport}
                            disabled={search.isBatchImporting}
                            icon={
                              search.isBatchImporting ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Upload size={14} />
                              )
                            }
                          >
                            {search.isBatchImporting
                              ? t('maven.batch.importing', {
                                  current: search.batchImportProgress.current,
                                  total: search.batchImportProgress.total,
                                })
                              : t('maven.batch.import', { count: search.selectedFiles.size })}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {search.searchResults.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500"
                        >
                          <input
                            type="checkbox"
                            checked={search.selectedFiles.has(file.path)}
                            onChange={() => search.toggleFileSelection(file.path)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-azure-600 focus:ring-azure-500"
                          />
                          <button
                            onClick={() => search.handleSelectFoundFile(file)}
                            className="flex-1 text-left hover:bg-azure-50 dark:hover:bg-azure-900/30 rounded transition-colors p-1"
                          >
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {file.path}
                            </p>
                            {file.local_repository && (
                              <p className="text-xs text-azure-600 dark:text-azure-400 truncate mt-0.5">
                                📁 {file.local_repository}
                              </p>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-600" />
                <span className="text-xs text-slate-400">{t('maven.importDialog.orManual')}</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-600" />
              </div>

              {/* Manual Import Fields */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('maven.importDialog.name')}
                </label>
                <input
                  type="text"
                  value={search.importName}
                  onChange={(e) => search.setImportName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  placeholder={t('maven.importDialog.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('maven.importDialog.path')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={search.importPath}
                    onChange={(e) => search.setImportPath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 font-mono text-sm"
                    placeholder={t('maven.importDialog.pathPlaceholder')}
                  />
                  <Button variant="outline" size="sm" onClick={handleBrowseFile}>
                    <FolderOpen size={16} />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('maven.importDialog.pathHint')}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={search.handleCloseImportDialog}>
                {t('common.cancel')}
              </Button>
              {search.selectedFiles.size > 0 ? (
                <Button
                  onClick={search.handleBatchImport}
                  disabled={search.isBatchImporting}
                  icon={
                    search.isBatchImporting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )
                  }
                >
                  {search.isBatchImporting
                    ? t('maven.batch.importing', {
                        current: search.batchImportProgress.current,
                        total: search.batchImportProgress.total,
                      })
                    : t('maven.batch.import', { count: search.selectedFiles.size })}
                </Button>
              ) : (
                <Button onClick={search.handleImport}>{t('common.import')}</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {config.showDetailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">
                {t('maven.detail.title')}: {config.showDetailDialog}
              </h3>
              <button
                onClick={() => config.setShowDetailDialog(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {config.loadingContent ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={24} className="animate-spin text-slate-400" />
                </div>
              ) : (
                <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                  {config.configContent}
                </pre>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => config.setShowDetailDialog(null)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      {config.showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">{t('maven.create.title')}</h3>
              <button
                onClick={config.closeCreateDialog}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('maven.create.name')} <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.createName}
                  onChange={(e) => config.handleCreateNameChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 ${
                    config.createNameError
                      ? 'border-error-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                  placeholder={t('maven.create.namePlaceholder')}
                  autoFocus
                />
                {config.createNameError && (
                  <p className="text-xs text-error-500 mt-1">{config.createNameError}</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('maven.create.nameHint')}
                </p>
              </div>
              {config.createName && !config.createNameError && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {t('maven.create.preview')}
                  </p>
                  <p className="text-sm font-mono text-slate-900 dark:text-slate-100">
                    ~/.m2.{config.createName}/
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {t('maven.create.willCreate')}:
                  </p>
                  <ul className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                    <li>• settings.xml</li>
                    <li>• repository/</li>
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={config.closeCreateDialog}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={config.handleCreate}
                disabled={!config.createName || !!config.createNameError || config.isCreating}
                icon={
                  config.isCreating ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )
                }
              >
                {config.isCreating ? t('common.loading') : t('maven.create.button')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!config.deleteConfirmConfig}
        onClose={() => config.setDeleteConfirmConfig(null)}
        onConfirm={config.confirmDelete}
        title={t('maven.dialog.deleteTitle')}
        message={t('maven.confirmDelete', { name: config.deleteConfirmConfig?.name })}
        confirmText={t('common.delete')}
        variant="danger"
        isLoading={!!config.deletingConfig}
      />
    </div>
  );
}
