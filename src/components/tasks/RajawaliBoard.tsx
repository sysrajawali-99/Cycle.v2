import React, { useState, useMemo, useRef } from 'react';
import {
  KanbanSquare,
  Plus,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Building2,
  Users,
  AlertTriangle,
  Sparkles,
  CheckSquare,
  Square,
  ArrowRight,
  Camera,
  RotateCcw,
  ShieldCheck,
  BarChart3,
  Layers,
  Image as ImageIcon,
  UserCheck,
  Eye,
  Trash2,
  FileCheck2,
  Calendar,
  UploadCloud,
  Download
} from 'lucide-react';
import {
  Project,
  Employee,
  CleaningTask,
  TaskStatus,
  ShiftType,
  UserRole,
  UserAccount,
  QCStatus,
  TaskChecklistItem
} from '../../types';
import { NewAdHocTaskModal } from './NewAdHocTaskModal';
import { TaskPhotoUploadModal } from './TaskPhotoUploadModal';
import { TaskQCModal } from './TaskQCModal';
import { TaskPhotoViewerModal } from './TaskPhotoViewerModal';
import { TaskKPIView } from './TaskKPIView';
import { TaskDownloadReportModal } from './TaskDownloadReportModal';
import { ConfirmModal } from '../common/ConfirmModal';

interface RajawaliBoardProps {
  projects: Project[];
  employees: Employee[];
  tasks: CleaningTask[];
  selectedProjectId: string;
  onUpdateTasks: (updated: CleaningTask[]) => void;
  currentUser?: UserAccount | null;
  users?: UserAccount[];
  userRole: UserRole;
}

export const RajawaliBoard: React.FC<RajawaliBoardProps> = ({
  projects = [],
  employees = [],
  tasks = [],
  selectedProjectId = 'ALL',
  onUpdateTasks,
  currentUser = null,
  users = [],
  userRole
}) => {
  // Tab View State: 'board' (Kanban) or 'kpi' (Diagram KPI)
  const [activeTab, setActiveTab] = useState<'board' | 'kpi'>('board');

  // Location filter state
  const initialProjectId = useMemo(() => {
    if (currentUser?.isLocationLocked && currentUser.assignedProjectId !== 'ALL') {
      return currentUser.assignedProjectId;
    }
    if (selectedProjectId !== 'ALL') return selectedProjectId;
    return projects[0]?.id || 'proj-1';
  }, [currentUser, selectedProjectId, projects]);

  const [activeProjectFilter, setActiveProjectFilter] = useState<string>(initialProjectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [activeUploadTask, setActiveUploadTask] = useState<CleaningTask | null>(null);
  const [activeUploadChecklistId, setActiveUploadChecklistId] = useState<string | undefined>(undefined);
  const [activeQCTask, setActiveQCTask] = useState<CleaningTask | null>(null);
  const [activePhotoViewer, setActivePhotoViewer] = useState<{ url: string; title: string } | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [downloadTargetTask, setDownloadTargetTask] = useState<CleaningTask | null>(null);

  // Delete & Security Modals
  const [taskToDelete, setTaskToDelete] = useState<CleaningTask | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  // Card direct file upload refs
  const directCardFileInputRef = useRef<HTMLInputElement | null>(null);
  const [directUploadTarget, setDirectUploadTarget] = useState<{ taskId: string; checklistId: string } | null>(null);

  // Sync active project if prop changes
  React.useEffect(() => {
    if (currentUser?.isLocationLocked && currentUser.assignedProjectId !== 'ALL') {
      setActiveProjectFilter(currentUser.assignedProjectId);
    } else if (selectedProjectId !== 'ALL') {
      setActiveProjectFilter(selectedProjectId);
    }
  }, [selectedProjectId, currentUser]);

  // Filtered tasks for selected project and query
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (activeProjectFilter !== 'ALL' && t.projectId !== activeProjectFilter) return false;
      if (shiftFilter !== 'ALL' && !t.shift.includes(shiftFilter)) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          t.areaName.toLowerCase().includes(q) ||
          t.assignedEmployees.some((e) => e.toLowerCase().includes(q)) ||
          (t.assignedLeaderName && t.assignedLeaderName.toLowerCase().includes(q)) ||
          (t.assignedBy && t.assignedBy.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tasks, activeProjectFilter, shiftFilter, priorityFilter, searchQuery]);

  // Quick Counter Summary for Badges
  const taskCounts = useMemo(() => {
    return {
      todo: filteredTasks.filter((t) => t.status === 'todo').length,
      in_progress: filteredTasks.filter((t) => t.status === 'in_progress').length,
      review: filteredTasks.filter((t) => t.status === 'review').length,
      done: filteredTasks.filter((t) => t.status === 'done').length
    };
  }, [filteredTasks]);

  // 1. Action: Start working on task (Move to In Progress)
  const handleStartTask = (taskId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        // Mark first item as done if not done
        const nextChecklist = t.checklist.map((c, idx) =>
          idx === 0 ? { ...c, done: true } : c
        );
        return {
          ...t,
          status: 'in_progress' as TaskStatus,
          startedAt: t.startedAt || now,
          checklist: nextChecklist,
          updatedAt: now
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  // 2. Action: Toggle single checklist item (Automatic transition from todo <-> in_progress)
  const handleToggleChecklist = (taskId: string, checkId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextChecklist = t.checklist.map((c) => {
          if (c.id === checkId) {
            return { ...c, done: !c.done };
          }
          return c;
        });

        const anyDoneOrPhoto = nextChecklist.some((c) => c.done || Boolean(c.photo));
        let nextStatus = t.status;
        let startedAt = t.startedAt;

        // Rule: If task is in 'todo' and any checklist item is checked or has photo,
        // it automatically transitions to 'in_progress'
        if (t.status === 'todo' && anyDoneOrPhoto) {
          nextStatus = 'in_progress';
          startedAt = startedAt || now;
        } else if (t.status === 'in_progress' && !anyDoneOrPhoto) {
          // If all checklist items are unchecked and no photos exist, return to 'todo'
          nextStatus = 'todo';
        }

        return {
          ...t,
          status: nextStatus,
          startedAt,
          checklist: nextChecklist,
          updatedAt: now
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  // Direct Card Item Photo Upload Handler
  const handleTriggerDirectUpload = (taskId: string, checklistId: string) => {
    setDirectUploadTarget({ taskId, checklistId });
    if (directCardFileInputRef.current) {
      directCardFileInputRef.current.value = '';
      directCardFileInputRef.current.click();
    }
  };

  const handleDirectFileChanged = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file berupa gambar / foto (JPG, PNG, WEBP).');
      return;
    }
    if (!directUploadTarget) return;

    const { taskId, checklistId } = directUploadTarget;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const photoDataUrl = e.target.result as string;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

        const updated = tasks.map((t) => {
          if (t.id === taskId) {
            const nextChecklist = t.checklist.map((c) => {
              if (c.id === checklistId) {
                return {
                  ...c,
                  photo: photoDataUrl,
                  done: true,
                  photoUploadedAt: now
                };
              }
              return c;
            });

            const firstPhoto = nextChecklist.find((c) => c.photo)?.photo;
            const anyDoneOrPhoto = nextChecklist.some((c) => c.done || Boolean(c.photo));

            return {
              ...t,
              status: (t.status === 'todo' && anyDoneOrPhoto) ? ('in_progress' as TaskStatus) : t.status,
              startedAt: t.startedAt || now,
              checklist: nextChecklist,
              evidencePhoto: firstPhoto || t.evidencePhoto,
              updatedAt: now
            };
          }
          return t;
        });

        onUpdateTasks(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  // 3. Action: Submit Checklist Photos Evidence -> Moves task to 'review' (Audit QC)
  const handlePhotoSubmitted = (taskId: string, updatedChecklist: TaskChecklistItem[], notes: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        // Calculate turnaround time in minutes if startedAt exists
        let durationMinutes = t.durationMinutes;
        if (t.startedAt) {
          try {
            const startMs = new Date(t.startedAt.replace(' ', 'T')).getTime();
            const nowMs = Date.now();
            const diffMins = Math.round((nowMs - startMs) / (1000 * 60));
            if (diffMins > 0 && diffMins < 1440) {
              durationMinutes = diffMins;
            }
          } catch (e) {
            durationMinutes = 60;
          }
        } else {
          durationMinutes = 60;
        }

        const firstPhoto = updatedChecklist.find((c) => c.photo)?.photo;

        return {
          ...t,
          status: 'review' as TaskStatus, // Automatic move to Audit QC
          checklist: updatedChecklist,
          evidencePhoto: firstPhoto || t.evidencePhoto,
          evidenceNotes: notes,
          submittedAt: now,
          durationMinutes: durationMinutes || 60,
          qcStatus: 'Pending' as QCStatus,
          updatedAt: now
        };
      }
      return t;
    });

    onUpdateTasks(updated);
    setActiveUploadTask(null);
    setActiveUploadChecklistId(undefined);
  };

  // Direct move to Audit QC when all checklist items are checked & photos uploaded
  const handleMoveToAuditDirectly = (taskId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        let durationMinutes = t.durationMinutes || 60;
        if (t.startedAt) {
          try {
            const startMs = new Date(t.startedAt.replace(' ', 'T')).getTime();
            const nowMs = Date.now();
            const diffMins = Math.round((nowMs - startMs) / (1000 * 60));
            if (diffMins > 0 && diffMins < 1440) {
              durationMinutes = diffMins;
            }
          } catch (e) {
            durationMinutes = 60;
          }
        }
        const firstPhoto = t.checklist.find((c) => c.photo)?.photo;

        return {
          ...t,
          status: 'review' as TaskStatus,
          evidencePhoto: firstPhoto || t.evidencePhoto,
          submittedAt: now,
          durationMinutes,
          qcStatus: 'Pending' as QCStatus,
          updatedAt: now
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  // Action: Save partial progress without moving to QC
  const handleSaveDraftProgress = (taskId: string, updatedChecklist: TaskChecklistItem[], notes: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const anyDoneOrPhoto = updatedChecklist.some((c) => c.done || Boolean(c.photo));
        const firstPhoto = updatedChecklist.find((c) => c.photo)?.photo;
        return {
          ...t,
          status: (t.status === 'todo' && anyDoneOrPhoto) ? ('in_progress' as TaskStatus) : t.status,
          startedAt: t.startedAt || now,
          checklist: updatedChecklist,
          evidencePhoto: firstPhoto || t.evidencePhoto,
          evidenceNotes: notes,
          updatedAt: now
        };
      }
      return t;
    });
    onUpdateTasks(updated);
    setActiveUploadTask(null);
    setActiveUploadChecklistId(undefined);
  };

  // 4. Action: QC Decision (Sesuai, Maksimalkan, Ulangi)
  const handleQCDecision = (
    taskId: string,
    decision: 'Sesuai' | 'Maksimalkan' | 'Ulangi',
    feedback: string,
    updatedChecklist?: TaskChecklistItem[]
  ) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const reviewer = currentUser
      ? `${currentUser.name} (${currentUser.role})`
      : 'Supervisor Lapangan';

    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextChecklist = updatedChecklist || t.checklist;

        if (decision === 'Sesuai') {
          // Rule: Sesuai -> Pindah ke kolom Selesai (Done)
          return {
            ...t,
            status: 'done' as TaskStatus,
            checklist: nextChecklist,
            qcStatus: 'Sesuai' as QCStatus,
            qcReviewedBy: reviewer,
            qcReviewedAt: now,
            completedAt: now,
            qcFeedback: feedback || 'Disetujui. Seluruh foto bukti checklist sesuai SOP.',
            updatedAt: now
          };
        } else if (decision === 'Maksimalkan') {
          // Rule: Maksimalkan -> Pindah / tetap berada di kolom Sedang Dikerjakan (foto tetap ada)
          return {
            ...t,
            status: 'in_progress' as TaskStatus,
            checklist: nextChecklist,
            qcStatus: 'Maksimalkan' as QCStatus,
            qcReviewedBy: reviewer,
            qcReviewedAt: now,
            qcFeedback: feedback || 'Perlu disempurnakan / dimaksimalkan pada item tertentu.',
            updatedAt: now
          };
        } else if (decision === 'Ulangi') {
          // Rule: Ulangi -> Pindah kembali ke List Tugas & HAPUS SEMUA FOTO yang telah diupload
          const resetChecklist = nextChecklist.map((c) => ({
            ...c,
            photo: undefined,
            photoUploadedAt: undefined,
            itemQC: undefined,
            itemQCNotes: undefined,
            done: false
          }));

          return {
            ...t,
            status: 'todo' as TaskStatus, // Kembali ke awal / List Tugas
            checklist: resetChecklist,
            evidencePhoto: undefined, // Foto bukti dihapus
            evidencePhotoBefore: undefined,
            evidenceNotes: undefined,
            submittedAt: undefined,
            startedAt: undefined,
            qcStatus: 'Ulangi' as QCStatus,
            qcReviewedBy: reviewer,
            qcReviewedAt: now,
            qcFeedback: feedback || 'Wajib diulang dari awal. Semua foto checklist direset dan dihapus.',
            repeatCount: (t.repeatCount || 0) + 1,
            notes: feedback ? `[CATATAN EVALUASI ULANGI QC]: ${feedback}` : t.notes,
            updatedAt: now
          };
        }
      }
      return t;
    });

    onUpdateTasks(updated);
    setActiveQCTask(null);
  };

  // Permission Check: Only Super Admin or users with canDeleteTasks granted by Super Admin
  const isSuperAdmin =
    userRole === 'Super Admin (HQ)' ||
    currentUser?.role === 'Super Admin (HQ)' ||
    currentUser?.id === 'user-superadmin';
  const canDeleteTasks = isSuperAdmin || Boolean(currentUser?.canDeleteTasks);

  // 5. Action: Delete / Cancel Task (Gated by permission)
  const handleDeleteTask = (taskId: string) => {
    if (!canDeleteTasks) {
      setDeniedMessage(
        'Akses Ditolak: Hanya Super Admin (HQ) atau pengguna yang diizinkan Super Admin yang dapat menghapus tugas ini.'
      );
      return;
    }
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    setTaskToDelete(target);
  };

  const confirmExecuteDeleteTask = () => {
    if (!taskToDelete) return;
    const targetId = taskToDelete.id;
    const updated = tasks.filter((t) => t.id !== targetId);
    onUpdateTasks(updated);
    setTaskToDelete(null);
  };

  // 5b. Action: Clear All Tasks (Kosongkan Board)
  const handleClearAllTasks = () => {
    if (tasks.length === 0) return;
    if (!canDeleteTasks) {
      setDeniedMessage(
        'Akses Ditolak: Hanya Super Admin (HQ) atau pengguna yang diizinkan Super Admin yang dapat mengosongkan board tugas.'
      );
      return;
    }
    setIsClearAllConfirmOpen(true);
  };

  const confirmExecuteClearAllTasks = () => {
    onUpdateTasks([]);
    setIsClearAllConfirmOpen(false);
  };

  // 6. Action: Save New Ad-Hoc Task
  const handleSaveNewTask = (newTask: CleaningTask) => {
    onUpdateTasks([newTask, ...tasks]);
    setShowAddTaskModal(false);
  };

  const activeProjectObj = projects.find((p) => p.id === activeProjectFilter);

  // 4 Columns definition
  const columns: {
    id: TaskStatus;
    title: string;
    description: string;
    color: string;
    badgeBg: string;
  }[] = [
    {
      id: 'todo',
      title: 'List Tugas',
      description: 'Tugas tambahan baru didelegasikan ke Team Leader',
      color: 'border-slate-700 bg-slate-900/60',
      badgeBg: 'bg-slate-800 text-slate-300'
    },
    {
      id: 'in_progress',
      title: 'Sedang Dikerjakan',
      description: 'Team Leader mengeksekusi & upload 1 foto per checklist',
      color: 'border-blue-600/40 bg-blue-950/10',
      badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
    },
    {
      id: 'review',
      title: 'Audit QC',
      description: 'Supervisor mengaudit foto per item (Sesuai/Maksimalkan/Ulangi)',
      color: 'border-purple-600/40 bg-purple-950/10',
      badgeBg: 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
    },
    {
      id: 'done',
      title: 'Selesai (Done)',
      description: 'Lulus QC Sesuai & terverifikasi bersih 100%',
      color: 'border-emerald-600/40 bg-emerald-950/10',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Hidden input for direct card photo upload */}
      <input
        ref={directCardFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleDirectFileChanged(e.target.files[0]);
          }
        }}
      />

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <KanbanSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Rajawali Boards (Area Cleaning Management)
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                  1 Checklist = 1 Foto
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemberian tugas harian ke Team Leader, upload foto tepat di bawah setiap item checklist, audit QC bertingkat, dan KPI performa.
              </p>
            </div>
          </div>

          {/* Right Action & Selector Bar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* View Switcher Tabs: Kanban vs KPI */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
              <button
                id="tab-kanban-board-btn"
                onClick={() => setActiveTab('board')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'board'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Kanban Board</span>
              </button>
              <button
                id="tab-kpi-diagram-btn"
                onClick={() => setActiveTab('kpi')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'kpi'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Diagram KPI</span>
              </button>
            </div>

            {/* Site selector */}
            <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
              <select
                id="tasks-project-select"
                value={activeProjectFilter}
                onChange={(e) => setActiveProjectFilter(e.target.value)}
                disabled={currentUser?.isLocationLocked && currentUser.assignedProjectId !== 'ALL'}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2 disabled:opacity-70"
              >
                {currentUser?.assignedProjectId === 'ALL' || !currentUser?.isLocationLocked ? (
                  <option value="ALL" className="bg-slate-900 text-white">
                    📍 Semua Lokasi Proyek
                  </option>
                ) : null}
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    📍 {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Download Report Button (Laporan Tugas Selesai Beserta Foto) */}
            <button
              id="download-tasks-report-btn"
              type="button"
              onClick={() => {
                setDownloadTargetTask(null);
                setShowDownloadModal(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              title="Unduh Laporan Tugas Selesai Beserta Foto & Detail QC"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Laporan Selesai</span>
            </button>

            {/* Add Task Button (Supervisor / Admin / PM Action) */}
            <button
              id="add-adhoc-task-btn"
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Berikan Tugas Tambahan Harian</span>
            </button>

            {/* Clear All Tasks Button (if tasks exist) */}
            {tasks.length > 0 && (
              <button
                id="clear-all-tasks-btn"
                onClick={handleClearAllTasks}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border font-semibold text-xs transition cursor-pointer ${
                  canDeleteTasks
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400'
                    : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-500'
                }`}
                title={
                  canDeleteTasks
                    ? 'Hapus semua data tugas kebersihan di board'
                    : 'Akses Terbatas: Hanya Super Admin (HQ) atau akun yang diizinkan Super Admin yang dapat mengosongkan board'
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Board</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar (Only show on Board tab) */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-slate-800">
            {/* Search */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                id="task-search-input"
                type="text"
                placeholder="Cari area, Team Leader, pemberi tugas, catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            {/* Shift Filter */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
              <span className="text-xs text-slate-400 shrink-0">Shift:</span>
              <select
                id="task-shift-filter"
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL">Semua Shift</option>
                <option value="Pagi">Pagi (06:00 - 14:00)</option>
                <option value="Siang">Siang (14:00 - 22:00)</option>
                <option value="Malam">Malam (22:00 - 06:00)</option>
                <option value="General">General (08:00 - 17:00)</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center space-x-2">
              <span className="text-xs text-slate-400 shrink-0">Prioritas:</span>
              <select
                id="task-priority-filter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL">Semua Prioritas</option>
                <option value="Urgent">🔥 Urgent</option>
                <option value="Tinggi">⚡ Tinggi</option>
                <option value="Sedang">Sedang</option>
                <option value="Rutin">Rutin</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: KANBAN BOARD 4 COLUMNS */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            // Grouping for 'todo' column: Group by Lokasi Tugas (Project)
            const groupedTodoByLocation: Record<string, CleaningTask[]> = {};
            if (col.id === 'todo') {
              colTasks.forEach((t) => {
                const key = t.projectId || 'proj-1';
                if (!groupedTodoByLocation[key]) {
                  groupedTodoByLocation[key] = [];
                }
                groupedTodoByLocation[key].push(t);
              });
            }

            // Helper to render individual task card
            const renderCard = (task: CleaningTask) => {
              const totalCount = task.checklist.length;
              const doneCount = task.checklist.filter((c) => c.done).length;
              const photoCount = task.checklist.filter((c) => Boolean(c.photo)).length;
              const allDone = totalCount > 0 && doneCount === totalCount;
              const allPhotosUploaded = totalCount > 0 && photoCount === totalCount;
              const targetProject = projects.find((p) => p.id === task.projectId);

              return (
                <div
                  key={task.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl shadow-md space-y-2.5 transition-all text-xs relative group"
                >
                  {/* Card Top: Priority, Repeat Count, Time, & Delete Action */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center space-x-1">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          task.priority === 'Urgent'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : task.priority === 'Tinggi'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {task.priority}
                      </span>

                      {task.repeatCount && task.repeatCount > 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-0.5">
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{task.repeatCount}x Diulang</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {task.targetCompletionTime && (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Target: {task.targetCompletionTime}</span>
                        </span>
                      )}

                      {/* Delete Task Button - Restricted to Super Admin or Authorized User */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          canDeleteTasks
                            ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/20'
                            : 'text-slate-700 hover:text-slate-500 hover:bg-slate-800'
                        }`}
                        title={
                          canDeleteTasks
                            ? `Hapus Tugas: ${task.areaName}`
                            : 'Akses Terbatas: Hanya Super Admin (HQ) atau pengguna berizin yang dapat menghapus tugas ini'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Area Name & Location */}
                  <div>
                    <h4 className="font-bold text-white text-sm leading-snug">
                      {task.areaName}
                    </h4>
                    {targetProject && (
                      <span className="text-[10px] text-amber-400/80 font-semibold flex items-center space-x-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-amber-400/70 shrink-0" />
                        <span className="truncate">{targetProject.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Delegation Info: Assigner & Assignee */}
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 space-y-1 text-[10.5px]">
                    {/* Assignee: Team Leader */}
                    <div className="flex items-center space-x-1 text-slate-300">
                      <Users className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-slate-400">Team Leader:</span>
                      <span className="font-semibold text-white truncate">
                        {task.assignedLeaderName || task.assignedEmployees.join(', ')}
                      </span>
                    </div>

                    {/* Assigner: Supervisor / Admin */}
                    {task.assignedBy && (
                      <div className="flex items-center space-x-1 text-slate-400">
                        <UserCheck className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>Pemberi:</span>
                        <span className="text-slate-300 truncate">{task.assignedBy}</span>
                      </div>
                    )}
                  </div>

                  {/* CHECKLIST & 1 CHECKLIST = 1 PHOTO UPLOAD SECTION */}
                  <div className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800 space-y-2">
                    {/* Checklist Header & Photo Progress */}
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-slate-400">Checklist & Foto Bukti:</span>
                      <span
                        className={
                          allPhotosUploaded
                            ? 'text-emerald-400 font-bold flex items-center space-x-0.5'
                            : 'text-amber-400'
                        }
                      >
                        {allPhotosUploaded && <CheckCircle2 className="w-3 h-3" />}
                        <span>
                          {photoCount}/{totalCount} Foto ({doneCount}/{totalCount} Cek)
                        </span>
                      </span>
                    </div>

                    {/* Checklist Items Loop with photo directly below each item */}
                    <div className="space-y-2 pt-1 border-t border-slate-800/80">
                      {task.checklist.map((item, idx) => {
                        const hasPhoto = Boolean(item.photo);

                        return (
                          <div
                            key={item.id}
                            className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-1.5"
                          >
                            {/* Item text & checkbox */}
                            <div className="flex items-start space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleChecklist(task.id, item.id)}
                                className="text-slate-400 hover:text-amber-400 cursor-pointer shrink-0 mt-0.5"
                                title={task.status === 'todo' ? 'Centang item untuk mulai pengerjaan' : 'Ubah status ceklist'}
                              >
                                {item.done ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-500" />
                                )}
                              </button>
                              <span
                                className={`text-[11px] leading-tight flex-1 ${
                                  item.done ? 'text-slate-300 font-medium' : 'text-slate-400'
                                }`}
                              >
                                <span className="font-mono text-slate-500 text-[10px]">#{idx + 1}</span> {item.text}
                              </span>
                            </div>

                            {/* Photo display / Upload trigger directly underneath item */}
                            <div className="pl-5">
                              {hasPhoto ? (
                                /* Attached Photo Thumbnail */
                                <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-md border border-slate-800">
                                  <div
                                    onClick={() =>
                                      setActivePhotoViewer({
                                        url: item.photo!,
                                        title: `Item #${idx + 1}: ${item.text} (${task.areaName})`
                                      })
                                    }
                                    className="relative w-9 h-9 rounded overflow-hidden border border-slate-700 bg-slate-900 shrink-0 cursor-pointer group"
                                  >
                                    <img
                                      src={item.photo}
                                      alt={item.text}
                                      className="w-full h-full object-cover group-hover:scale-110 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                      <Eye className="w-3 h-3 text-amber-300" />
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <span className="text-[9.5px] text-emerald-400 font-bold flex items-center space-x-0.5 truncate">
                                      <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                                      <span>Foto Terpasang</span>
                                    </span>
                                    <span className="text-[8.5px] text-slate-500 block truncate">
                                      Klik untuk zoom
                                    </span>
                                  </div>

                                  {/* Action to change photo */}
                                  {task.status !== 'done' && (
                                    <button
                                      type="button"
                                      onClick={() => handleTriggerDirectUpload(task.id, item.id)}
                                      className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9.5px] font-semibold transition cursor-pointer shrink-0"
                                      title="Ganti foto item ini"
                                    >
                                      Ganti
                                    </button>
                                  )}
                                </div>
                              ) : (
                                /* Upload Photo Trigger directly underneath item */
                                task.status !== 'done' && (
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerDirectUpload(task.id, item.id)}
                                    className="w-full py-1 px-2 rounded border border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-amber-300 text-[10px] font-medium flex items-center justify-center space-x-1.5 transition cursor-pointer"
                                  >
                                    <Camera className="w-3 h-3 text-amber-400" />
                                    <span>Upload Foto Item #{idx + 1}</span>
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* QC Status Badge & Feedback (If any) */}
                  {task.qcStatus && task.qcStatus !== 'Pending' && (
                    <div
                      className={`p-2 rounded-lg border text-[10.5px] ${
                        task.qcStatus === 'Sesuai'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : task.qcStatus === 'Maksimalkan'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center space-x-1 font-bold">
                        {task.qcStatus === 'Sesuai' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {task.qcStatus === 'Maksimalkan' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {task.qcStatus === 'Ulangi' && <RotateCcw className="w-3.5 h-3.5" />}
                        <span>Penilaian QC: {task.qcStatus}</span>
                      </div>
                      {task.qcFeedback && (
                        <p className="text-[10px] mt-0.5 opacity-90 italic">
                          "{task.qcFeedback}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {task.notes && (
                    <p className="text-[10px] text-slate-400 italic bg-slate-950 p-1.5 rounded border border-slate-800/80">
                      "{task.notes}"
                    </p>
                  )}

                  {/* Actions by Column */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5">
                    {/* 1. TO-DO Actions: Start Working */}
                    {col.id === 'todo' && (
                      <button
                        type="button"
                        id={`start-task-btn-${task.id}`}
                        onClick={() => handleStartTask(task.id)}
                        className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-1 shadow transition cursor-pointer"
                      >
                        <span>Mulai Kerjakan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* 2. IN_PROGRESS Actions: Upload Photo Evidence & Move to Audit */}
                    {col.id === 'in_progress' && (
                      <div className="w-full space-y-1.5">
                        {allPhotosUploaded && allDone ? (
                          <button
                            type="button"
                            id={`move-to-audit-btn-${task.id}`}
                            onClick={() => handleMoveToAuditDirectly(task.id)}
                            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-purple-600/30 transition cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Pindah ke Kolom Audit (Foto Lengkap)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={`upload-photo-btn-${task.id}`}
                            onClick={() => {
                              setActiveUploadTask(task);
                              setActiveUploadChecklistId(undefined);
                            }}
                            className="w-full py-1.5 px-3 bg-slate-800 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5 shadow transition cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>
                              Lengkapi Foto & Ceklist ({photoCount}/{totalCount} Foto)
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* 3. REVIEW Actions: Supervisor Audit QC (Sesuai / Maksimalkan / Ulangi) */}
                    {col.id === 'review' && (
                      <button
                        type="button"
                        id={`audit-qc-btn-${task.id}`}
                        onClick={() => setActiveQCTask(task)}
                        className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Audit QC ({photoCount} Foto)</span>
                      </button>
                    )}

                    {/* 4. DONE Verified Indicator & Download Button */}
                    {col.id === 'done' && (
                      <div className="w-full space-y-1.5">
                        <div className="w-full flex items-center justify-between text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
                          <span className="flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>QC Verified (Sesuai)</span>
                          </span>
                          {task.durationMinutes && (
                            <span className="text-[10px] text-slate-300 font-mono">
                              ⏱ {task.durationMinutes} Mnt
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          id={`download-card-task-btn-${task.id}`}
                          onClick={() => {
                            setDownloadTargetTask(task);
                            setShowDownloadModal(true);
                          }}
                          className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg font-semibold text-[11px] flex items-center justify-center space-x-1.5 border border-emerald-500/30 transition cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Unduh Dokumen Laporan</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div
                key={col.id}
                className={`rounded-2xl border ${col.color} p-3 flex flex-col justify-between min-h-[560px] shadow-lg`}
              >
                <div>
                  {/* Column Header */}
                  <div className="pb-3 mb-3 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs tracking-tight">
                        {col.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}
                      >
                        {colTasks.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      {col.description}
                    </p>
                  </div>

                  {/* Task Cards List */}
                  <div className="space-y-3">
                    {colTasks.length === 0 ? (
                      <div className="py-12 text-center text-slate-600 text-xs italic flex flex-col items-center justify-center space-y-1">
                        <span>Tidak ada tugas pada kolom ini</span>
                      </div>
                    ) : col.id === 'todo' && groupedTodoByLocation ? (
                      /* LIST TUGAS: Dipisahkan per Lokasi Tugas */
                      <div className="space-y-3.5">
                        {Object.entries(groupedTodoByLocation).map(([locProjectId, locTasks]) => {
                          const locProject = projects.find((p) => p.id === locProjectId);
                          return (
                            <div
                              key={locProjectId}
                              className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-2.5 space-y-2.5 shadow-inner"
                            >
                              {/* Location Section Separator Header */}
                              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 px-1">
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="font-bold text-white text-[11px] block truncate">
                                      {locProject ? locProject.name : `Lokasi Proyek (${locProjectId})`}
                                    </span>
                                    <span className="text-[9.5px] text-slate-400 block truncate">
                                      {locProject?.client || 'Area Tugas Operasional'}
                                    </span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-bold text-[9.5px] shrink-0">
                                  {locTasks.length} Tugas
                                </span>
                              </div>

                              {/* Task Cards in this Location */}
                              <div className="space-y-2.5">
                                {locTasks.map((task) => renderCard(task))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* In Progress / Review / Done Columns */
                      colTasks.map((task) => renderCard(task))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: KPI DIAGRAMS & ANALYTICS */}
      {activeTab === 'kpi' && (
        <TaskKPIView
          tasks={tasks}
          projects={projects}
          employees={employees}
          selectedProjectId={activeProjectFilter}
        />
      )}

      {/* MODAL 1: Create New Ad-hoc Task */}
      {showAddTaskModal && (
        <NewAdHocTaskModal
          projects={projects}
          activeProjectId={activeProjectFilter === 'ALL' ? projects[0]?.id || 'proj-1' : activeProjectFilter}
          employees={employees}
          users={users}
          currentUser={currentUser}
          userRole={userRole}
          onClose={() => setShowAddTaskModal(false)}
          onSave={handleSaveNewTask}
        />
      )}

      {/* MODAL 2: Upload Photo Evidence for each checklist item */}
      {activeUploadTask && (
        <TaskPhotoUploadModal
          task={activeUploadTask}
          initialChecklistId={activeUploadChecklistId}
          onClose={() => {
            setActiveUploadTask(null);
            setActiveUploadChecklistId(undefined);
          }}
          onSubmit={handlePhotoSubmitted}
          onSaveDraft={handleSaveDraftProgress}
          onOpenPhotoViewer={(url, title) => setActivePhotoViewer({ url, title })}
        />
      )}

      {/* MODAL 3: Audit QC Review (Sesuai / Maksimalkan / Ulangi) */}
      {activeQCTask && (
        <TaskQCModal
          task={activeQCTask}
          reviewerName={
            currentUser ? `${currentUser.name} (${currentUser.role})` : 'Supervisor Lapangan'
          }
          onClose={() => setActiveQCTask(null)}
          onDecision={handleQCDecision}
          onOpenPhotoViewer={(url, title) => setActivePhotoViewer({ url, title })}
        />
      )}

      {/* MODAL 4: Full-Screen Photo Viewer */}
      {activePhotoViewer && (
        <TaskPhotoViewerModal
          photoUrl={activePhotoViewer.url}
          title={activePhotoViewer.title}
          onClose={() => setActivePhotoViewer(null)}
        />
      )}

      {/* MODAL 5: Download & Print Completed Tasks Report */}
      <TaskDownloadReportModal
        isOpen={showDownloadModal}
        onClose={() => {
          setShowDownloadModal(false);
          setDownloadTargetTask(null);
        }}
        tasks={tasks}
        projects={projects}
        initialProjectId={activeProjectFilter}
        initialTask={downloadTargetTask}
      />

      {/* CONFIRM DELETE SINGLE TASK MODAL */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        title="Hapus Tugas Kebersihan Area"
        message={`Apakah Anda yakin ingin menghapus tugas area "${taskToDelete?.areaName}" (${taskToDelete?.shift})? Seluruh riwayat checklist dan foto bukti pada kartu ini akan dihapus.`}
        confirmText="Ya, Hapus Tugas"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={confirmExecuteDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />

      {/* CONFIRM CLEAR ALL TASKS MODAL */}
      <ConfirmModal
        isOpen={isClearAllConfirmOpen}
        title="Kosongkan Semua Tugas Board"
        message="Hapus dan kosongkan semua data tugas kebersihan di Rajawali Boards? Seluruh antrean tugas, checklist, foto sebelum/sesudah, dan riwayat QC akan dibersihkan."
        confirmText="Ya, Kosongkan Board"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={confirmExecuteClearAllTasks}
        onCancel={() => setIsClearAllConfirmOpen(false)}
      />

      {/* ACCESS DENIED MODAL */}
      <ConfirmModal
        isOpen={Boolean(deniedMessage)}
        title="Akses Ditolak (Izin Khusus)"
        message={deniedMessage || ''}
        confirmText="Mengerti"
        cancelText="Tutup"
        confirmVariant="warning"
        onConfirm={() => setDeniedMessage(null)}
        onCancel={() => setDeniedMessage(null)}
      />
    </div>
  );
};
