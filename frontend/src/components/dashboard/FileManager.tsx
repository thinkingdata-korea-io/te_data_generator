'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * FileManager Component
 * @brief: 파일 관리 컴포넌트 - Excel 및 데이터 파일 목록, 다운로드, 삭제, 보관기간 연장
 */

interface ExcelFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface DataRun {
  runId: string;
  createdAt: string;
  totalUsers?: number;
  totalEvents?: number;
  totalDays?: number;
}

interface FileManagerProps {
  retentionDays: {
    data: number;
    excel: number;
  };
}

export function FileManager({ retentionDays }: FileManagerProps) {
  const { t } = useLanguage();
  const [excelFiles, setExcelFiles] = useState<ExcelFile[]>([]);
  const [analysisFiles, setAnalysisFiles] = useState<ExcelFile[]>([]);
  const [dataRuns, setDataRuns] = useState<DataRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'excel' | 'analysis' | 'data'>('excel');
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [retentionTarget, setRetentionTarget] = useState<{
    type: 'excel' | 'analysis' | 'data';
    name: string;
  } | null>(null);
  const [customDays, setCustomDays] = useState<string>('');

  // 파일 목록 로드
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // Excel 템플릿 파일 목록 가져오기
      const excelRes = await fetch('http://localhost:3001/api/excel/list');
      const excelData = await excelRes.json();
      setExcelFiles(excelData.files || []);

      // Get AI analysis Excel file list
      const analysisRes = await fetch('http://localhost:3001/api/generate/analysis-excel-list');
      const analysisData = await analysisRes.json();
      setAnalysisFiles(analysisData.files || []);

      // 데이터 Run 목록 가져오기
      const runsRes = await fetch('http://localhost:3001/api/runs/list');
      const runsData = await runsRes.json();
      setDataRuns(runsData.runs || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  // 보관 기간 계산 (남은 일수)
  const calculateRemainingDays = (modifiedDate: string, retentionDays: number): number => {
    const modified = new Date(modifiedDate);
    const now = new Date();
    const ageInDays = (now.getTime() - modified.getTime()) / (1000 * 60 * 60 * 24);
    const remaining = Math.floor(retentionDays - ageInDays);
    return remaining;
  };

  // Excel 파일 다운로드
  const downloadExcel = (filename: string) => {
    window.open(`http://localhost:3001/api/excel/download/${encodeURIComponent(filename)}`, '_blank');
  };

  // Excel 파일 삭제
  const deleteExcel = async (filename: string) => {
    if (!confirm(t.dashboard.confirmDelete.replace('{name}', filename))) return;

    try {
      const res = await fetch(`http://localhost:3001/api/excel/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert(t.dashboard.fileDeleted);
        fetchFiles();
      } else {
        const data = await res.json();
        alert(t.dashboard.deleteFailed.replace('{error}', data.error));
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert(t.dashboard.deleteError);
    }
  };

  // AI 분석 Excel 파일 삭제
  const deleteAnalysisExcel = async (filename: string) => {
    if (!confirm(t.dashboard.confirmDelete.replace('{name}', filename))) return;

    try {
      const res = await fetch(`http://localhost:3001/api/generate/analysis-excel/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert(t.dashboard.fileDeleted);
        fetchFiles();
      } else {
        const data = await res.json();
        alert(t.dashboard.deleteFailed.replace('{error}', data.error));
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert(t.dashboard.deleteError);
    }
  };

  // 보관기간 변경 모달 열기
  const openRetentionModal = (type: 'excel' | 'analysis' | 'data', name: string) => {
    setRetentionTarget({ type, name });
    setCustomDays('');
    setShowRetentionModal(true);
  };

  // 생성된 데이터 다운로드 (ZIP)
  const downloadDataRun = (runId: string) => {
    window.open(`http://localhost:3001/api/generate/download-data/${runId}`, '_blank');
  };

  // 보관기간 변경 적용
  const applyRetentionChange = async () => {
    if (!retentionTarget || !customDays) return;

    const days = parseInt(customDays);
    if (isNaN(days)) {
      alert(t.dashboard.invalidNumber);
      return;
    }

    try {
      let url: string;
      if (retentionTarget.type === 'excel') {
        url = `http://localhost:3001/api/excel/${encodeURIComponent(retentionTarget.name)}/retention`;
      } else if (retentionTarget.type === 'analysis') {
        url = `http://localhost:3001/api/generate/analysis-excel/${encodeURIComponent(retentionTarget.name)}/retention`;
      } else {
        url = `http://localhost:3001/api/runs/${retentionTarget.name}/retention`;
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });

      if (res.ok) {
        const message = days > 0
          ? t.dashboard.retentionExtended.replace('{days}', days.toString())
          : t.dashboard.retentionShortened.replace('{days}', Math.abs(days).toString());
        alert(message);
        setShowRetentionModal(false);
        setRetentionTarget(null);
        fetchFiles();
      } else {
        const data = await res.json();
        alert(t.dashboard.retentionChangeFailed.replace('{error}', data.error));
      }
    } catch (error) {
      console.error('Retention change failed:', error);
      alert(t.dashboard.retentionChangeError);
    }
  };

  // 데이터 Run 삭제
  const deleteRun = async (runId: string) => {
    if (!confirm(t.dashboard.confirmDeleteRun.replace('{name}', runId))) return;

    try {
      const res = await fetch(`http://localhost:3001/api/runs/${runId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert(t.dashboard.dataDeleted);
        fetchFiles();
      } else {
        const data = await res.json();
        alert(t.dashboard.deleteFailed.replace('{error}', data.error));
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert(t.dashboard.dataDeleteError);
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <>
      <div className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6">
        <h2 className="text-lg font-bold text-terminal-cyan mb-4 flex items-center gap-2">
          <span>📁</span> {t.dashboard.fileManagement}
        </h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-4 py-2 font-mono text-sm transition-all ${
            activeTab === 'excel'
              ? 'text-terminal-cyan border-b-2 border-[var(--accent-cyan)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          📊 {t.dashboard.excelTemplates} ({excelFiles.length})
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 font-mono text-sm transition-all ${
            activeTab === 'analysis'
              ? 'text-terminal-magenta border-b-2 border-[var(--accent-magenta)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          🤖 {t.dashboard.aiAnalysisExcel} ({analysisFiles.length})
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2 font-mono text-sm transition-all ${
            activeTab === 'data'
              ? 'text-terminal-green border-b-2 border-[var(--accent-green)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          💾 {t.dashboard.generatedData} ({dataRuns.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-[var(--text-dimmed)]">
          <div className="animate-pulse">{t.dashboard.loading}</div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'excel' ? (
            <motion.div
              key="excel"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {excelFiles.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-dimmed)]">
                  {t.dashboard.noExcelFiles}
                </div>
              ) : (
                excelFiles.map((file) => {
                  const remainingDays = calculateRemainingDays(file.modified, retentionDays.excel);
                  const isExpiringSoon = remainingDays <= 7;
                  const isExpired = remainingDays <= 0;

                  return (
                    <div
                      key={file.name}
                      className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4 hover:border-[var(--accent-cyan)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-[var(--text-primary)] truncate">
                            {file.name}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-dimmed)]">
                            <span>📦 {formatFileSize(file.size)}</span>
                            <span>📅 {new Date(file.modified).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            <span
                              className={`${
                                isExpired
                                  ? 'text-[var(--error-red)]'
                                  : isExpiringSoon
                                  ? 'text-[var(--accent-yellow)]'
                                  : 'text-terminal-green'
                              }`}
                            >
                              ⏰ {isExpired ? t.dashboard.expired : `${remainingDays}${t.dashboard.daysRemaining}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* 다운로드 버튼 */}
                          <button
                            onClick={() => downloadExcel(file.name)}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--accent-cyan)] rounded text-xs text-terminal-cyan hover:bg-[var(--accent-cyan)] hover:text-[var(--bg-primary)] transition-all"
                            title={t.dashboard.downloadTooltip}
                          >
                            ⬇️
                          </button>

                          {/* 보관기간 변경 버튼 */}
                          <button
                            onClick={() => openRetentionModal('excel', file.name)}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--accent-yellow)] rounded text-xs text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)] hover:text-[var(--bg-primary)] transition-all"
                            title={t.dashboard.retentionTooltip}
                          >
                            ⏱️
                          </button>

                          {/* 삭제 버튼 */}
                          <button
                            onClick={() => deleteExcel(file.name)}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--error-red)] rounded text-xs text-[var(--error-red)] hover:bg-[var(--error-red)] hover:text-white transition-all"
                            title={t.dashboard.deleteTooltip}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          ) : activeTab === 'analysis' ? (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-2"
            >
              {analysisFiles.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-dimmed)]">
                  {t.dashboard.noAnalysisFiles}
                </div>
              ) : (
                analysisFiles.map((file) => {
                  const remainingDays = calculateRemainingDays(file.modified, retentionDays.excel);
                  const isExpiringSoon = remainingDays <= 7;
                  const isExpired = remainingDays <= 0;

                  return (
                    <div
                      key={file.name}
                      className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4 hover:border-[var(--accent-magenta)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-[var(--text-primary)] truncate">
                            {file.name}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-dimmed)]">
                            <span>📦 {formatFileSize(file.size)}</span>
                            <span>📅 {new Date(file.modified).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            <span
                              className={`${
                                isExpired
                                  ? 'text-[var(--error-red)]'
                                  : isExpiringSoon
                                  ? 'text-[var(--accent-yellow)]'
                                  : 'text-terminal-green'
                              }`}
                            >
                              ⏰ {isExpired ? t.dashboard.expired : `${remainingDays}${t.dashboard.daysRemaining}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* 다운로드 버튼 */}
                          <button
                            onClick={() => window.open(`http://localhost:3001/api/generate/analysis-excel/${encodeURIComponent(file.name)}`, '_blank')}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--accent-magenta)] rounded text-xs text-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)] hover:text-[var(--bg-primary)] transition-all"
                            title={t.dashboard.downloadTooltip}
                          >
                            ⬇️
                          </button>

                          {/* 보관기간 변경 버튼 */}
                          <button
                            onClick={() => openRetentionModal('analysis', file.name)}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--accent-yellow)] rounded text-xs text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)] hover:text-[var(--bg-primary)] transition-all"
                            title={t.dashboard.retentionTooltip}
                          >
                            ⏱️
                          </button>

                          {/* 삭제 버튼 */}
                          <button
                            onClick={() => deleteAnalysisExcel(file.name)}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--error-red)] rounded text-xs text-[var(--error-red)] hover:bg-[var(--error-red)] hover:text-white transition-all"
                            title={t.dashboard.deleteTooltip}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div
              key="data"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-2"
            >
              {dataRuns.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-dimmed)]">
                  {t.dashboard.noDataFiles}
                </div>
              ) : (
                dataRuns.map((run) => {
                  const remainingDays = calculateRemainingDays(run.createdAt, retentionDays.data);
                  const isExpiringSoon = remainingDays <= 3;
                  const isExpired = remainingDays <= 0;

                  return (
                    <div
                      key={run.runId}
                      className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4 hover:border-[var(--accent-green)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-terminal-green truncate">
                            {run.runId}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-dimmed)]">
                            <span>👥 {run.totalUsers?.toLocaleString() || 0} {t.dashboard.users}</span>
                            <span>📊 {run.totalEvents?.toLocaleString() || 0} {t.dashboard.events}</span>
                            <span>📅 {new Date(run.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            <span
                              className={`${
                                isExpired
                                  ? 'text-[var(--error-red)]'
                                  : isExpiringSoon
                                  ? 'text-[var(--accent-yellow)]'
                                  : 'text-terminal-green'
                              }`}
                            >
                              ⏰ {isExpired ? t.dashboard.expired : `${remainingDays}${t.dashboard.daysRemaining}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* 다운로드 버튼 */}
                          <button
                            onClick={() => downloadDataRun(run.runId)}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--accent-green)] rounded text-xs text-terminal-green hover:bg-[var(--accent-green)] hover:text-[var(--bg-primary)] transition-all"
                            title={t.dashboard.downloadTooltip}
                          >
                            ⬇️
                          </button>

                          {/* 보관기간 변경 버튼 */}
                          <button
                            onClick={() => openRetentionModal('data', run.runId)}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--accent-yellow)] rounded text-xs text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)] hover:text-[var(--bg-primary)] transition-all"
                            title={t.dashboard.retentionTooltip}
                          >
                            ⏱️
                          </button>

                          {/* 삭제 버튼 */}
                          <button
                            onClick={() => deleteRun(run.runId)}
                            className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--error-red)] rounded text-xs text-[var(--error-red)] hover:bg-[var(--error-red)] hover:text-white transition-all"
                            title={t.dashboard.deleteTooltip}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      </div>

      {/* 보관 기간 변경 모달 */}
      {showRetentionModal && retentionTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 w-96 terminal-glow"
          >
            <h3 className="text-lg font-bold text-terminal-cyan mb-4">{t.dashboard.retentionChangeTitle}</h3>

            <div className="mb-4">
              <div className="text-sm text-[var(--text-secondary)] mb-2">
                {retentionTarget.type === 'excel'
                  ? `📊 ${t.dashboard.excelFile}`
                  : retentionTarget.type === 'analysis'
                  ? `🤖 ${t.dashboard.aiAnalysisExcel}`
                  : `💾 ${t.dashboard.dataRun}`}
              </div>
              <div className="text-sm text-[var(--text-primary)] font-mono bg-[var(--bg-tertiary)] p-2 rounded border border-[var(--border)] truncate">
                {retentionTarget.name}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-[var(--text-secondary)] mb-2 block">
                {t.dashboard.retentionChangeDays}
              </label>
              <input
                type="number"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder={t.dashboard.retentionPlaceholder}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
                autoFocus
              />
              <div className="text-xs text-[var(--text-dimmed)] mt-1">
                {t.dashboard.retentionHint}
              </div>
            </div>

            {/* 빠른 선택 버튼 */}
            <div className="mb-6">
              <div className="text-xs text-[var(--text-dimmed)] mb-2">{t.dashboard.quickSelect}</div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setCustomDays('7')}
                  className="px-3 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-xs text-terminal-cyan hover:border-[var(--accent-cyan)] transition-all"
                >
                  +7일
                </button>
                <button
                  onClick={() => setCustomDays('30')}
                  className="px-3 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-xs text-terminal-cyan hover:border-[var(--accent-cyan)] transition-all"
                >
                  +30일
                </button>
                <button
                  onClick={() => setCustomDays('-3')}
                  className="px-3 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-xs text-[var(--accent-yellow)] hover:border-[var(--accent-yellow)] transition-all"
                >
                  -3일
                </button>
                <button
                  onClick={() => setCustomDays('-7')}
                  className="px-3 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-xs text-[var(--accent-yellow)] hover:border-[var(--accent-yellow)] transition-all"
                >
                  -7일
                </button>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRetentionModal(false);
                  setRetentionTarget(null);
                }}
                className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all"
              >
                {t.dashboard.cancel}
              </button>
              <button
                onClick={applyRetentionChange}
                className="flex-1 px-4 py-2 bg-[var(--accent-cyan)] border border-[var(--accent-cyan)] rounded text-sm text-[var(--bg-primary)] font-bold hover:opacity-80 transition-all"
                disabled={!customDays}
              >
                {t.dashboard.apply}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
