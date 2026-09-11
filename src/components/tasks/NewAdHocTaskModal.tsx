import React, { useState, useMemo } from 'react';
import {
  Plus,
  X,
  Building2,
  Users,
  Clock,
  AlertTriangle,
  FileCheck2,
  Sparkles,
  UserCheck,
  Send
} from 'lucide-react';
import {
  Project,
  Employee,
  UserAccount,
  UserRole,
  CleaningTask,
  ShiftType,
  TaskCategoryType
} from '../../types';

interface NewAdHocTaskModalProps {
  projects: Project[];
  activeProjectId: string;
  employees: Employee[];
  users: UserAccount[];
  currentUser: UserAccount | null;
  userRole: UserRole;
  onClose: () => void;
  onSave: (task: CleaningTask) => void;
}

export const NewAdHocTaskModal: React.FC<NewAdHocTaskModalProps> = ({
  projects,
  activeProjectId,
  employees,
  users,
  currentUser,
  userRole,
  onClose,
  onSave
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId);
  const [areaName, setAreaName] = useState<string>('');
  const [taskType, setTaskType] = useState<TaskCategoryType>('Tugas Tambahan Harian');
  const [frequency, setFrequency] = useState<'Harian' | 'Per-Shift' | 'Mingguan' | 'Deep Cleaning'>('Harian');
  const [shift, setShift] = useState<ShiftType>('Pagi (06:00 - 14:00)');
  const [priority, setPriority] = useState<'Rutin' | 'Sedang' | 'Tinggi' | 'Urgent'>('Tinggi');
  const [targetTime, setTargetTime] = useState<string>('12:00');
  const [assignedLeader, setAssignedLeader] = useState<string>('');
  const [assignerName, setAssignerName] = useState<string>(
    currentUser ? `${currentUser.name} (${currentUser.role})` : 'Supervisor Lapangan'
  );
  const [checklistText, setChecklistText] = useState<string>(
    'Inspeksi & sweeping area secara menyeluruh\nMopping lantai dengan Neutral Cleaner / Karbol\nPembersihan debu & kaca partisi\nPengosongan tempat sampah & sanitasi area'
  );
  const [notes, setNotes] = useState<string>('');

  // Eligible Team Leaders / Supervisors for the selected project
  const eligibleLeaders = useMemo(() => {
    // 1. Check Employees in this project with position Team Leader or Supervisor
    const projectEmps = employees.filter(
      (e) =>
        e.projectId === selectedProjectId &&
        e.status === 'Aktif' &&
        (e.position === 'Team Leader' || e.position === 'Supervisor')
    );

    // 2. Also check UserAccounts with supervisor role assigned to this project
    const projectUsers = users.filter(
      (u) =>
        u.status === 'Aktif' &&
        (u.assignedProjectId === selectedProjectId || u.assignedProjectId === 'ALL') &&
        (u.role === 'Supervisor Lapangan' || u.role.includes('Admin'))
    );

    const leaderOptions: { id: string; name: string; title: string }[] = [];

    projectEmps.forEach((emp) => {
      leaderOptions.push({
        id: emp.id,
        name: `${emp.name} (Team Leader)`,
        title: `${emp.name} - Team Leader (${emp.shift})`
      });
    });

    // Fallback if no specific Team Leader in employees list, include all active employees as candidate leaders
    if (leaderOptions.length === 0) {
      const anyEmps = employees.filter(
        (e) => e.projectId === selectedProjectId && e.status === 'Aktif'
      );
      anyEmps.forEach((emp) => {
        leaderOptions.push({
          id: emp.id,
          name: `${emp.name} (${emp.position})`,
          title: `${emp.name} - ${emp.position}`
        });
      });
    }

    return leaderOptions;
  }, [employees, users, selectedProjectId]);

  // Set default assigned leader when list is populated
  React.useEffect(() => {
    if (eligibleLeaders.length > 0 && !assignedLeader) {
      setAssignedLeader(eligibleLeaders[0].name);
    }
  }, [eligibleLeaders, assignedLeader]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim() || !assignedLeader.trim()) return;

    const checklist = checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, idx) => ({
        id: `chk-${Date.now()}-${idx}`,
        text: line,
        done: false
      }));

    const leaderNameClean = assignedLeader.split('(')[0].trim() || assignedLeader.trim();

    const newTask: CleaningTask = {
      id: `tsk-${Date.now()}`,
      projectId: selectedProjectId,
      areaName: areaName.trim(),
      taskType: taskType,
      frequency: frequency,
      assignedBy: assignerName,
      assignedByRole: currentUser?.role || 'Supervisor Lapangan',
      assignedEmployees: [assignedLeader.trim()],
      assignedLeaderName: leaderNameClean,
      shift: shift,
      status: 'todo', // Awal: List Tugas
      priority: priority,
      targetCompletionTime: targetTime,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      checklist: checklist.length > 0 ? checklist : [{ id: 'chk-1', text: 'Selesaikan area sesuai SOP', done: false }],
      notes: notes,
      qcStatus: 'Pending',
      repeatCount: 0,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onSave(newTask);
  };

  const selectedProjObj = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Berikan Tugas Tambahan Harian (Ad-hoc Task)
              </h3>
              <p className="text-[11px] text-slate-400">
                Delegasikan tugas kebersihan harian kepada <b>Team Leader / Supervisor Area</b>.
              </p>
            </div>
          </div>
          <button
            id="close-new-adhoc-task-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Assigner Info Banner */}
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 flex items-start space-x-2.5 text-[11px] text-blue-200">
            <UserCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Pemberi Tugas (Assigner):</span> {assignerName}
              <p className="text-[10px] text-blue-300/80 mt-0.5">
                Tugas akan langsung masuk ke <b>"List Tugas"</b> Team Leader yang dipilih, siap dikerjakan & diaudit QC.
              </p>
            </div>
          </div>

          {/* Project & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Lokasi Gedung / Proyek:
              </label>
              <div className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <select
                  id="new-task-project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none w-full cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nama Area / Ruangan Spesifik: <span className="text-rose-400">*</span>
              </label>
              <input
                id="new-task-area-input"
                type="text"
                required
                placeholder="Contoh: Restroom Barat Lt. 2 / Lobby VIP"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          {/* Assignee Team Leader Selection - Manual Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-300 font-semibold">
                Penerima Tugas (Team Leader / Supervisor Area): <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Input Manual
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-700 focus-within:border-amber-500 rounded-xl px-3 py-2 text-white flex items-center space-x-2 transition">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                id="new-task-leader-manual-input"
                type="text"
                required
                placeholder="Ketik manual nama Team Leader / Supervisor Area (misal: Budi Santoso)..."
                value={assignedLeader}
                onChange={(e) => setAssignedLeader(e.target.value)}
                list="eligible-leaders-datalist"
                className="bg-transparent text-white text-xs font-semibold placeholder-slate-500 focus:outline-none w-full"
              />
              {assignedLeader && (
                <button
                  type="button"
                  onClick={() => setAssignedLeader('')}
                  className="text-slate-500 hover:text-white text-xs p-1"
                  title="Hapus isian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Datalist for manual autocomplete assistance */}
            <datalist id="eligible-leaders-datalist">
              {eligibleLeaders.map((lead) => (
                <option key={lead.id} value={lead.name} />
              ))}
            </datalist>

            {/* Quick Suggestion Chips if available */}
            {eligibleLeaders.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400">Saran cepat:</span>
                {eligibleLeaders.slice(0, 4).map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setAssignedLeader(lead.name)}
                    className="text-[10px] bg-slate-800/90 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 transition cursor-pointer"
                  >
                    + {lead.name}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1.5">
              * Diisi secara manual sesuai personil bertugas di lapangan.
            </p>
          </div>

          {/* Task Type, Priority, Shift, Target Time */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Kategori:</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="Tugas Tambahan Harian">Tugas Tambahan</option>
                <option value="Special Request">Special Request</option>
                <option value="Deep Cleaning">Deep Cleaning</option>
                <option value="Daily Routine">Daily Routine</option>
                <option value="Audit Finding">Audit Finding</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Prioritas:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="Urgent">🔥 Urgent</option>
                <option value="Tinggi">⚡ Tinggi</option>
                <option value="Sedang">Normal / Sedang</option>
                <option value="Rutin">Rutin</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Shift:</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="Pagi (06:00 - 14:00)">Pagi</option>
                <option value="Siang (14:00 - 22:00)">Siang</option>
                <option value="Malam (22:00 - 06:00)">Malam</option>
                <option value="General (08:00 - 17:00)">General</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Selesai:</label>
              <input
                type="text"
                placeholder="11:30 / 15:00"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-xs text-center"
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-semibold">
                Item Checklist Tindakan (1 baris per item):
              </label>
              <span className="text-[10px] text-amber-400 font-medium">1 Checklist = 1 Upload Foto</span>
            </div>
            <textarea
              rows={4}
              required
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              💡 <b>Ketentuan:</b> Setiap 1 baris checklist mewajibkan 1 upload foto bukti pengerjaan (misal ada 10 list = wajib 10 foto) yang akan diupload tepat di bawah item checklist terkait.
            </p>
          </div>

          {/* Notes & Special Instructions */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Catatan & Instruksi Khusus Supervisor:
            </label>
            <input
              type="text"
              placeholder="Contoh: Pastikan cermin tanpa noda sidik jari sebelum jam kunjungan VIP..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              id="submit-create-adhoc-task-btn"
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simpan & Tugaskan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
