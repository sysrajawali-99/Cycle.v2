import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Layers,
  Users,
  Sparkles,
  ArrowUpDown,
  Check,
  Edit3,
  Trash2,
  ShieldCheck,
  Clock,
  Phone,
  MapPin,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Info,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  Footprints,
  Droplets,
  Zap,
  Building
} from 'lucide-react';
import { Project, FloorType, UserRole } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

interface ProjectLocationSettingsProps {
  projects: Project[];
  selectedProjectId: string;
  onUpdateProjects: (updatedProjects: Project[]) => void;
  userRole?: UserRole;
}

const AVAILABLE_FLOOR_TYPES: {
  id: FloorType;
  label: string;
  description: string;
  color: string;
  recommendedChemical: string;
}[] = [
  {
    id: 'Marmer',
    label: 'Marmer (Marble)',
    description: 'Batu alam sensitif asam, butuh kristalisasi rutin',
    color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    recommendedChemical: 'Marble Restorer / Neutral Cleaner (pH 7.0)'
  },
  {
    id: 'Granit',
    label: 'Granit (Granite)',
    description: 'Batu keras tahan gores, gloss buffing berkala',
    color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    recommendedChemical: 'Granite Polish & High-Speed Buffing Compound'
  },
  {
    id: 'Kramik',
    label: 'Kramik (Ceramic / Homogeneous Tile)',
    description: 'Ubin porselen umum dan anti slip toilet',
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    recommendedChemical: 'All-Purpose Floor Cleaner & Grout Cleaner'
  },
  {
    id: 'Kayu',
    label: 'Kayu (Wood / Parquet / Vinyl)',
    description: 'Sensitif terhadap genangan air berlebih',
    color: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    recommendedChemical: 'Wood Care Polish & Damp Mop Neutralizer'
  },
  {
    id: 'Concrete',
    label: 'Concrete (Semen / Beton / Epoxy)',
    description: 'Area basement, pabrik, loading dock & parkir',
    color: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
    recommendedChemical: 'Heavy Duty Degreaser & Industrial Floor Scrub'
  }
];

export const ProjectLocationSettings: React.FC<ProjectLocationSettingsProps> = ({
  projects,
  selectedProjectId,
  onUpdateProjects,
  userRole
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [floorTypeFilter, setFloorTypeFilter] = useState<string>('ALL');
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [printProject, setPrintProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    id: string;
    code: string;
    name: string;
    type: Project['type'];
    address: string;
    siteSupervisor: string;
    phone: string;
    clientName: string;
    operationalHours: string;
    totalAreaM2: number;
    manpowerCount: number;
    floorCount: number;
    passengerLiftCount: number;
    serviceLiftCount: number;
    escalatorCount: number;
    travelatorCount: number;
    lobbyCount: number;
    basementParkingCount: number;
    upperParkingCount: number;
    totalToiletCount: number;
    cubicleCount: number;
    urinalCount: number;
    washbasinCount: number;
    toiletPointsPerFloorPW: string;
    floorTypes: FloorType[];
    notes: string;
  }>({
    id: '',
    code: '',
    name: '',
    type: 'Mall',
    address: '',
    siteSupervisor: '',
    phone: '',
    clientName: '',
    operationalHours: '10:00 - 22:00 WIB',
    totalAreaM2: 25000,
    manpowerCount: 12,
    floorCount: 5,
    passengerLiftCount: 4,
    serviceLiftCount: 2,
    escalatorCount: 6,
    travelatorCount: 0,
    lobbyCount: 2,
    basementParkingCount: 2,
    upperParkingCount: 0,
    totalToiletCount: 16,
    cubicleCount: 48,
    urinalCount: 32,
    washbasinCount: 40,
    toiletPointsPerFloorPW: '2 Pria / 2 Wanita per lantai',
    floorTypes: ['Marmer', 'Granit', 'Kramik'],
    notes: ''
  });

  // Filter projects based on selectedProjectId and local filters
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Global location scope
      if (selectedProjectId !== 'ALL' && p.id !== selectedProjectId) {
        return false;
      }
      // Search term
      if (
        searchTerm &&
        !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.code.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.siteSupervisor.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.address.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'ALL' && p.type !== typeFilter) {
        return false;
      }
      // Floor type filter
      if (floorTypeFilter !== 'ALL') {
        const types = p.floorTypes || [];
        if (!types.includes(floorTypeFilter as FloorType)) {
          return false;
        }
      }
      return true;
    });
  }, [projects, selectedProjectId, searchTerm, typeFilter, floorTypeFilter]);

  // Aggregate KPI Calculations
  const stats = useMemo(() => {
    const list = selectedProjectId === 'ALL' ? projects : projects.filter((p) => p.id === selectedProjectId);
    const totalProjects = list.length;
    const totalManpower = list.reduce((acc, curr) => acc + (curr.manpowerCount || curr.activeCleanersCount || 0), 0);
    const totalFloors = list.reduce((acc, curr) => acc + (curr.floorCount || 0), 0);
    const totalPassengerLifts = list.reduce((acc, curr) => acc + (curr.passengerLiftCount || 0), 0);
    const totalServiceLifts = list.reduce((acc, curr) => acc + (curr.serviceLiftCount || 0), 0);
    const totalEscalators = list.reduce((acc, curr) => acc + (curr.escalatorCount || 0), 0);
    const totalTravelators = list.reduce((acc, curr) => acc + (curr.travelatorCount || 0), 0);
    const totalVerticalTransport = totalPassengerLifts + totalServiceLifts + totalEscalators + totalTravelators;
    const totalToilets = list.reduce((acc, curr) => acc + (curr.totalToiletCount || 0), 0);
    const totalCubicles = list.reduce((acc, curr) => acc + (curr.cubicleCount || 0), 0);
    const totalUrinals = list.reduce((acc, curr) => acc + (curr.urinalCount || 0), 0);
    const totalWashbasins = list.reduce((acc, curr) => acc + (curr.washbasinCount || 0), 0);
    const totalBasement = list.reduce((acc, curr) => acc + (curr.basementParkingCount || 0), 0);
    const totalUpperParking = list.reduce((acc, curr) => acc + (curr.upperParkingCount || 0), 0);
    const totalLobbies = list.reduce((acc, curr) => acc + (curr.lobbyCount || 0), 0);

    return {
      totalProjects,
      totalManpower,
      totalFloors,
      totalPassengerLifts,
      totalServiceLifts,
      totalEscalators,
      totalTravelators,
      totalVerticalTransport,
      totalToilets,
      totalCubicles,
      totalUrinals,
      totalWashbasins,
      totalBasement,
      totalUpperParking,
      totalLobbies
    };
  }, [projects, selectedProjectId]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormData({
      id: `proj-${Date.now()}`,
      code: `LOC-${String(projects.length + 1).padStart(2, '0')}`,
      name: '',
      type: 'Mall',
      address: '',
      siteSupervisor: '',
      phone: '',
      clientName: '',
      operationalHours: '08:00 - 22:00 WIB',
      totalAreaM2: 25000,
      manpowerCount: 10,
      floorCount: 5,
      passengerLiftCount: 4,
      serviceLiftCount: 2,
      escalatorCount: 4,
      travelatorCount: 0,
      lobbyCount: 1,
      basementParkingCount: 2,
      upperParkingCount: 0,
      totalToiletCount: 12,
      cubicleCount: 36,
      urinalCount: 24,
      washbasinCount: 30,
      toiletPointsPerFloorPW: '2 Pria / 2 Wanita per lantai',
      floorTypes: ['Granit', 'Kramik'],
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (proj: Project) => {
    setEditingProject(proj);
    setFormData({
      id: proj.id,
      code: proj.code || '',
      name: proj.name || '',
      type: proj.type || 'Mall',
      address: proj.address || '',
      siteSupervisor: proj.siteSupervisor || '',
      phone: proj.phone || '',
      clientName: proj.clientName || '',
      operationalHours: proj.operationalHours || '08:00 - 22:00 WIB',
      totalAreaM2: proj.totalAreaM2 || 25000,
      manpowerCount: proj.manpowerCount ?? proj.activeCleanersCount ?? 10,
      floorCount: proj.floorCount ?? 5,
      passengerLiftCount: proj.passengerLiftCount ?? 0,
      serviceLiftCount: proj.serviceLiftCount ?? 0,
      escalatorCount: proj.escalatorCount ?? 0,
      travelatorCount: proj.travelatorCount ?? 0,
      lobbyCount: proj.lobbyCount ?? 1,
      basementParkingCount: proj.basementParkingCount ?? 0,
      upperParkingCount: proj.upperParkingCount ?? 0,
      totalToiletCount: proj.totalToiletCount ?? 0,
      cubicleCount: proj.cubicleCount ?? 0,
      urinalCount: proj.urinalCount ?? 0,
      washbasinCount: proj.washbasinCount ?? 0,
      toiletPointsPerFloorPW: proj.toiletPointsPerFloorPW || '2 Pria / 2 Wanita per lantai',
      floorTypes: proj.floorTypes || ['Granit', 'Kramik'],
      notes: proj.notes || ''
    });
    setIsModalOpen(true);
  };

  // Toggle Floor Type Selection in form
  const handleToggleFloorType = (type: FloorType) => {
    setFormData((prev) => {
      const exists = prev.floorTypes.includes(type);
      if (exists) {
        if (prev.floorTypes.length === 1) {
          alert('Minimal harus memilih 1 jenis lantai gedung.');
          return prev;
        }
        return { ...prev, floorTypes: prev.floorTypes.filter((t) => t !== type) };
      } else {
        return { ...prev, floorTypes: [...prev.floorTypes, type] };
      }
    });
  };

  // Save Project (Add or Update)
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Mohon isi nama lokasi project.');
      return;
    }

    const payload: Project = {
      id: editingProject ? editingProject.id : formData.id || `proj-${Date.now()}`,
      code: formData.code.trim() || `LOC-${Date.now().toString().slice(-3)}`,
      name: formData.name.trim(),
      type: formData.type,
      address: formData.address.trim(),
      siteSupervisor: formData.siteSupervisor.trim(),
      phone: formData.phone.trim(),
      activeCleanersCount: Number(formData.manpowerCount) || 0,
      manpowerCount: Number(formData.manpowerCount) || 0,
      floorCount: Number(formData.floorCount) || 0,
      passengerLiftCount: Number(formData.passengerLiftCount) || 0,
      serviceLiftCount: Number(formData.serviceLiftCount) || 0,
      escalatorCount: Number(formData.escalatorCount) || 0,
      travelatorCount: Number(formData.travelatorCount) || 0,
      lobbyCount: Number(formData.lobbyCount) || 0,
      basementParkingCount: Number(formData.basementParkingCount) || 0,
      upperParkingCount: Number(formData.upperParkingCount) || 0,
      totalToiletCount: Number(formData.totalToiletCount) || 0,
      cubicleCount: Number(formData.cubicleCount) || 0,
      urinalCount: Number(formData.urinalCount) || 0,
      washbasinCount: Number(formData.washbasinCount) || 0,
      toiletPointsPerFloorPW: formData.toiletPointsPerFloorPW.trim(),
      floorTypes: formData.floorTypes,
      clientName: formData.clientName.trim(),
      operationalHours: formData.operationalHours.trim(),
      totalAreaM2: Number(formData.totalAreaM2) || 0,
      notes: formData.notes.trim(),
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (editingProject) {
      const updatedList = projects.map((p) => (p.id === editingProject.id ? payload : p));
      onUpdateProjects(updatedList);
    } else {
      const updatedList = [...projects, payload];
      onUpdateProjects(updatedList);
    }

    setIsModalOpen(false);
    setEditingProject(null);
  };

  // Delete Project Handlers
  const handleDeleteProject = (proj: Project) => {
    setProjectToDelete(proj);
  };

  const confirmExecuteDeleteProject = () => {
    if (!projectToDelete) return;
    const updated = projects.filter((p) => p.id !== projectToDelete.id);
    onUpdateProjects(updated);
    if (selectedProjectForDetail?.id === projectToDelete.id) {
      setSelectedProjectForDetail(null);
    }
    if (editingProject?.id === projectToDelete.id) {
      setIsModalOpen(false);
      setEditingProject(null);
    }
    setProjectToDelete(null);
  };

  // Print / Export
  const handlePrintSpecs = () => {
    if (selectedProjectId !== 'ALL') {
      const activeProj = projects.find((p) => p.id === selectedProjectId) || projects[0];
      setPrintProject(activeProj);
    } else if (filteredProjects.length > 0) {
      setPrintProject(filteredProjects[0]);
    } else if (projects.length > 0) {
      setPrintProject(projects[0]);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl shadow-inner">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Pengaturan Lokasi Project
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-slate-950 rounded-md">
                    Modul 10 Terpadu
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Spesifikasi infrastruktur gedung, transportasi vertikal, fasilitas sanitasi toilet, dan manajemen jenis lantai.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="print-project-specs-btn"
              onClick={handlePrintSpecs}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Cetak Spesifikasi</span>
            </button>

            {userRole !== 'Admin Lokasi 1' && userRole !== 'Admin Lokasi 2' && (
              <button
                id="add-new-project-btn"
                onClick={handleOpenAddModal}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Lokasi Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Scope Notification if specific project is locked */}
        {selectedProjectId !== 'ALL' && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                Menampilkan spesifikasi khusus lokasi:{' '}
                <strong>{projects.find((p) => p.id === selectedProjectId)?.name}</strong>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Gunakan pemilih lokasi di navbar atas untuk melihat seluruh gedung HQ.
            </span>
          </div>
        )}
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Lokasi</span>
            <Building className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.totalProjects}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Situs Operasional</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Manpower</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{stats.totalManpower}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Personil Cleaner Aktif</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Lantai</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400">{stats.totalFloors}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Lantai Dikelola</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Lift & Eskalator</span>
            <ArrowUpDown className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400">{stats.totalVerticalTransport}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.totalPassengerLifts + stats.totalServiceLifts} Lift • {stats.totalEscalators + stats.totalTravelators} Esk/Trav
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Toilet</span>
            <Droplets className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-400">{stats.totalToilets}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{stats.totalCubicles} Kubikal Sanitasi</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Parkir & Lobby</span>
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-400">
            {stats.totalBasement + stats.totalUpperParking}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{stats.totalLobbies} Lobby Utama</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="search-projects-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari lokasi, kode, supervisor, alamat..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Tipe Gedung Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Tipe:</span>
            <select
              id="filter-project-type-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tipe Proyek</option>
              <option value="Mall">Mall / Pusat Belanja</option>
              <option value="Rumah Sakit">Rumah Sakit</option>
              <option value="Perkantoran">Gedung Perkantoran</option>
              <option value="Apartemen">Apartemen / Residensial</option>
              <option value="Pabrik / Industri">Pabrik & Industri</option>
              <option value="Hotel">Hotel & Hospitality</option>
            </select>
          </div>

          {/* Jenis Lantai Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>Lantai:</span>
            <select
              id="filter-floor-type-select"
              value={floorTypeFilter}
              onChange={(e) => setFloorTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Jenis Lantai</option>
              <option value="Marmer">✨ Marmer (Marble)</option>
              <option value="Granit">💎 Granit (Granite)</option>
              <option value="Kramik">🧱 Kramik (Ceramic)</option>
              <option value="Kayu">🪵 Kayu (Parquet)</option>
              <option value="Concrete">🏗️ Concrete (Beton/Semen)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Project Location Specifications Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((project) => {
          const currentFloorTypes = project.floorTypes || ['Kramik'];

          return (
            <div
              key={project.id}
              id={`project-card-${project.id}`}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-lg transition duration-150 flex flex-col justify-between"
            >
              {/* Header Box */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                      {project.code.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white truncate">{project.name}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          {project.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 truncate">
                        <span className="font-semibold text-amber-400">{project.type}</span>
                        <span>•</span>
                        <span>SPV: {project.siteSupervisor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      id={`print-project-${project.id}-btn`}
                      onClick={() => setPrintProject(project)}
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 transition cursor-pointer text-xs font-semibold"
                      title={`Cetak Form Spesifikasi ${project.name}`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Form</span>
                    </button>
                    <button
                      id={`edit-project-${project.id}-btn`}
                      onClick={() => handleOpenEditModal(project)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="Edit Spesifikasi Lokasi"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-project-${project.id}-btn`}
                      onClick={() => handleDeleteProject(project)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition cursor-pointer"
                      title={`Hapus Lokasi Project ${project.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 text-xs text-slate-400 flex items-start space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span className="truncate">{project.address}</span>
                </div>
              </div>

              {/* Specification Grid (Item a through o) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                {/* 1. Manpower & Struktur Lantai */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Struktur & Manpower</span>
                    <span className="text-amber-400 font-semibold">{project.floorCount || 0} Lantai</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500">b. Manpower</div>
                      <div className="font-bold text-emerald-400 text-sm">
                        {project.manpowerCount ?? project.activeCleanersCount ?? 0} Personil
                      </div>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500">c. Jumlah Lantai</div>
                      <div className="font-bold text-blue-400 text-sm">
                        {project.floorCount ?? 0} Lantai
                      </div>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500">h. Lobby</div>
                      <div className="font-bold text-white text-sm">
                        {project.lobbyCount ?? 0} Titik
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded-lg text-slate-300">
                      <span className="text-[11px]">i. Parkir Basement:</span>
                      <span className="font-bold text-amber-300">{project.basementParkingCount ?? 0} Lt</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded-lg text-slate-300">
                      <span className="text-[11px]">j. Lantai Parkir Atas:</span>
                      <span className="font-bold text-amber-300">{project.upperParkingCount ?? 0} Lt</span>
                    </div>
                  </div>
                </div>

                {/* 2. Transportasi Vertikal (d, e, f, g) */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Transportasi Vertikal</span>
                    <span className="text-purple-400 font-semibold">
                      {(project.passengerLiftCount || 0) +
                        (project.serviceLiftCount || 0) +
                        (project.escalatorCount || 0) +
                        (project.travelatorCount || 0)}{' '}
                      Unit Total
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-400 truncate">d. Lift Org</div>
                      <div className="font-bold text-white text-sm">{project.passengerLiftCount ?? 0}</div>
                    </div>
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-400 truncate">e. Lift Serv</div>
                      <div className="font-bold text-white text-sm">{project.serviceLiftCount ?? 0}</div>
                    </div>
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-400 truncate">f. Eskalator</div>
                      <div className="font-bold text-white text-sm">{project.escalatorCount ?? 0}</div>
                    </div>
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[9px] text-slate-400 truncate">g. Travalator</div>
                      <div className="font-bold text-white text-sm">{project.travelatorCount ?? 0}</div>
                    </div>
                  </div>
                </div>

                {/* 3. Sanitasi & Fasilitas Toilet (k, l, m, n, o) */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Fasilitas Sanitasi & Toilet</span>
                    <span className="text-teal-400 font-semibold">
                      k. {project.totalToiletCount ?? 0} Toilet
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">l. Kubikal</div>
                      <div className="font-bold text-teal-300 text-sm">{project.cubicleCount ?? 0}</div>
                    </div>
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">m. Urinal</div>
                      <div className="font-bold text-teal-300 text-sm">{project.urinalCount ?? 0}</div>
                    </div>
                    <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400">n. Washtafel</div>
                      <div className="font-bold text-teal-300 text-sm">{project.washbasinCount ?? 0}</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">o. Titik Toilet Per Lantai (P/W):</span>
                    <span className="font-semibold text-slate-200 text-right truncate max-w-[200px]">
                      {project.toiletPointsPerFloorPW || '-'}
                    </span>
                  </div>
                </div>

                {/* 4. Jenis Lantai (Multi-select) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Spesifikasi Jenis Lantai</span>
                    <span className="text-[10px] text-slate-500">Multi-Select</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_FLOOR_TYPES.map((ft) => {
                      const isSelected = currentFloorTypes.includes(ft.id);
                      if (!isSelected) return null;
                      return (
                        <div
                          key={ft.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 ${ft.color}`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{ft.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes & Operational Info */}
                {project.notes && (
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{project.notes}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Details */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Kontak: {project.phone || '-'}</span>
                <span>Jam Ops: {project.operationalHours || '24 Jam'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
            🔍
          </div>
          <h3 className="font-bold text-white text-base">Lokasi Project Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tidak ada data lokasi yang sesuai dengan pencarian "{searchTerm}" atau filter yang dipilih.
          </p>
        </div>
      )}

      {/* Guide & Chemical Reference Box for Floor Types */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Panduan Standar Perawatan Berdasarkan Jenis Lantai (K3 & Chemical SOP)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AVAILABLE_FLOOR_TYPES.map((ft) => (
            <div key={ft.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">{ft.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Standar K3</span>
              </div>
              <p className="text-[11px] text-slate-400">{ft.description}</p>
              <div className="text-[10px] text-amber-300 font-medium pt-1 border-t border-slate-800/80">
                🧪 Chemical: {ft.recommendedChemical}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Add / Edit Project Location */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingProject ? 'Edit Spesifikasi Lokasi Project' : 'Tambah Lokasi Project Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lengkapi seluruh spesifikasi gedung (a s/d o) dan jenis lantai yang dikelola.
                  </p>
                </div>
              </div>
              <button
                id="close-project-modal-btn"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProject} className="space-y-4">
              {/* SECTION A: INFORMASI POKOK */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  1. Informasi Identitas Proyek
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      a. Nama Lokasi Project *
                    </label>
                    <input
                      type="text"
                      id="input-project-name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Mall Gandaria City"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Kode Proyek *
                    </label>
                    <input
                      type="text"
                      id="input-project-code"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="MGC-01"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Tipe Proyek Gedung
                    </label>
                    <select
                      id="select-project-type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Mall">Mall / Pusat Belanja</option>
                      <option value="Rumah Sakit">Rumah Sakit</option>
                      <option value="Perkantoran">Perkantoran</option>
                      <option value="Apartemen">Apartemen</option>
                      <option value="Pabrik / Industri">Pabrik / Industri</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Universitas">Universitas</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Site Supervisor / PIC
                    </label>
                    <input
                      type="text"
                      id="input-project-supervisor"
                      value={formData.siteSupervisor}
                      onChange={(e) => setFormData({ ...formData, siteSupervisor: e.target.value })}
                      placeholder="Nama Supervisor"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      No. Telepon / Hotline
                    </label>
                    <input
                      type="text"
                      id="input-project-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Alamat Lengkap Gedung
                  </label>
                  <input
                    type="text"
                    id="input-project-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Jl. Raya Utama No. XX, Jakarta..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* SECTION B: MANPOWER & STRUKTUR GEDUNG (b, c, h, i, j) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  2. Manpower & Struktur Fisik Gedung
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      b. Jml Manpower *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      id="input-manpower-count"
                      value={formData.manpowerCount}
                      onChange={(e) => setFormData({ ...formData, manpowerCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      c. Jml Lantai *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      id="input-floor-count"
                      value={formData.floorCount}
                      onChange={(e) => setFormData({ ...formData, floorCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      h. Jml Lobby
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-lobby-count"
                      value={formData.lobbyCount}
                      onChange={(e) => setFormData({ ...formData, lobbyCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      i. Parkir Basement
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-basement-count"
                      value={formData.basementParkingCount}
                      onChange={(e) => setFormData({ ...formData, basementParkingCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      j. Parkir Atas
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-upper-parking-count"
                      value={formData.upperParkingCount}
                      onChange={(e) => setFormData({ ...formData, upperParkingCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: TRANSPORTASI VERTIKAL (d, e, f, g) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  3. Transportasi Vertikal & Eskalator
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      d. Lift Penumpang
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-passenger-lift"
                      value={formData.passengerLiftCount}
                      onChange={(e) => setFormData({ ...formData, passengerLiftCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      e. Lift Service
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-service-lift"
                      value={formData.serviceLiftCount}
                      onChange={(e) => setFormData({ ...formData, serviceLiftCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      f. Jumlah Eskalator
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-escalator-count"
                      value={formData.escalatorCount}
                      onChange={(e) => setFormData({ ...formData, escalatorCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      g. Jumlah Travalator
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-travelator-count"
                      value={formData.travelatorCount}
                      onChange={(e) => setFormData({ ...formData, travelatorCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: SANITASI & TOILET (k, l, m, n, o) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  4. Sanitasi Toilet & Titik Per Lantai
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      k. Total Toilet
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-total-toilets"
                      value={formData.totalToiletCount}
                      onChange={(e) => setFormData({ ...formData, totalToiletCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      l. Jumlah Kubikal
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-cubicle-count"
                      value={formData.cubicleCount}
                      onChange={(e) => setFormData({ ...formData, cubicleCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      m. Jumlah Urinal
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-urinal-count"
                      value={formData.urinalCount}
                      onChange={(e) => setFormData({ ...formData, urinalCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      n. Jumlah Washtafel
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="input-washbasin-count"
                      value={formData.washbasinCount}
                      onChange={(e) => setFormData({ ...formData, washbasinCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    o. Jumlah Titik Toilet Per Lantai Pria / Wanita (P/W)
                  </label>
                  <input
                    type="text"
                    id="input-toilet-pw-points"
                    value={formData.toiletPointsPerFloorPW}
                    onChange={(e) => setFormData({ ...formData, toiletPointsPerFloorPW: e.target.value })}
                    placeholder="Contoh: 4 Pria / 4 Wanita per lantai"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* SECTION E: JENIS LANTAI (MULTI-SELECT CHOICES) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    5. Spesifikasi Jenis Lantai (Pilih beberapa sekaligus)
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Terpilih: {formData.floorTypes.length} Jenis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {AVAILABLE_FLOOR_TYPES.map((ft) => {
                    const isSelected = formData.floorTypes.includes(ft.id);
                    return (
                      <div
                        key={ft.id}
                        id={`modal-select-floor-${ft.id}`}
                        onClick={() => handleToggleFloorType(ft.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-start space-x-3 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-bold text-xs ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                            {ft.label}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                            {ft.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION F: CATATAN TAMBAHAN */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Catatan Khusus & Protokol K3 Lapangan
                </label>
                <textarea
                  id="input-project-notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan jadwal buffing marmer, area steril, atau akses limbah..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between space-x-3 pt-3 border-t border-slate-800">
                {editingProject ? (
                  <button
                    type="button"
                    id="delete-current-project-btn"
                    onClick={() => handleDeleteProject(editingProject)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-semibold text-xs rounded-xl cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Lokasi Ini</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    id="cancel-project-form-btn"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    id="submit-project-form-btn"
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {editingProject ? 'Simpan Perubahan Spesifikasi' : 'Tambah Lokasi Baru'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CETAK FORM SPESIFIKASI LOKASI PROJECT */}
      {printProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Top Control Bar (Screen Only) */}
            <div className="bg-slate-950 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between no-print shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
                    <span>Pratinjau Formulir Spesifikasi Lokasi</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                      {printProject.code}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Formulir resmi data teknis, infrastruktur, manpower, dan spesifikasi lantai {printProject.name}.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="do-print-project-form-btn"
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang (Print / PDF)</span>
                </button>
                <button
                  id="close-print-modal-btn"
                  onClick={() => setPrintProject(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Form Document Sheet (Paper Style) */}
            <div className="overflow-y-auto p-4 sm:p-6 bg-slate-950/70 flex justify-center">
              <div
                id={`printable-spec-form-${printProject.id}`}
                className="bg-white text-slate-900 w-full max-w-3xl p-6 sm:p-8 rounded-xl shadow-xl border border-slate-300 space-y-5 print:shadow-none print:border-none print:p-0 print:m-0 font-sans text-xs"
              >
                {/* 1. KOP SURAT / OFFICIAL HEADER */}
                <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-base">
                        🦅
                      </div>
                      <div>
                        <h2 className="text-base font-black tracking-tight text-slate-950 uppercase">
                          PT RAJAWALI PRIMA SERVICE
                        </h2>
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                          Integrated Facility Management & Cleaning Services
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-500 pt-1 leading-tight">
                      Gedung Menara Rajawali Lt. 12, Jl. Gatot Subroto Kav. 71-73, Jakarta Selatan 12870<br />
                      Hotline: (021) 555-8989 • Email: operations@rajawaliprima.co.id • Web: www.rajawaliprima.co.id
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-[9px] font-mono font-bold text-slate-800">
                      NO: FORM/OPS/SPEC/{printProject.code}/{new Date().getFullYear()}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1">
                      Tgl Dokumen: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-[9px] font-semibold text-emerald-700 mt-0.5">
                      STATUS: TERVERIFIKASI RESMI
                    </div>
                  </div>
                </div>

                {/* 2. FORM TITLE (SESUAI FORM YANG DISEDIAKAN) */}
                <div className="text-center py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-950 uppercase">
                    FORMULIR SPESIFIKASI PROYEK & FASILITAS GEDUNG
                  </h1>
                  <p className="text-[10px] text-slate-700 font-medium">
                    Dokumen Standar Spesifikasi Fisik, Transportasi Vertikal, Fasilitas Sanitasi Toilet & Manajemen Jenis Lantai
                  </p>
                </div>

                {/* 3. BAGIAN I: IDENTITAS & PROFIL LOKASI (Item a & metadata) */}
                <div className="space-y-1.5">
                  <div className="bg-slate-900 text-white font-bold px-3 py-1 text-[11px] uppercase tracking-wide rounded-t">
                    BAGIAN I: IDENTITAS & PROFIL LOKASI PROYEK
                  </div>
                  <div className="border border-slate-300 rounded-b p-3 bg-slate-50/50 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 text-[10px] block">a. Nama Lokasi Proyek:</span>
                        <strong className="text-slate-900 text-xs">{printProject.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Kode Lokasi Proyek:</span>
                        <strong className="text-amber-800 font-mono text-xs">{printProject.code}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Tipe Proyek Gedung:</span>
                        <strong className="text-slate-900 text-xs">{printProject.type}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Site Supervisor / PIC:</span>
                        <strong className="text-slate-900">{printProject.siteSupervisor || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">No. Telepon / Hotline:</span>
                        <span className="text-slate-800 font-mono">{printProject.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Jam Operasional Pembersihan:</span>
                        <span className="text-slate-800">{printProject.operationalHours || '08:00 - 22:00 WIB'}</span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-500 text-[10px] block">Alamat Lengkap Situs:</span>
                      <span className="text-slate-800 leading-snug">{printProject.address || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 4. BAGIAN II: SPESIFIKASI INFRASTRUKTUR & FASILITAS GEDUNG (Item b s/d o) */}
                <div className="space-y-1.5">
                  <div className="bg-slate-900 text-white font-bold px-3 py-1 text-[11px] uppercase tracking-wide rounded-t">
                    BAGIAN II: RINCIAN SPESIFIKASI INFRASTRUKTUR & FASILITAS (Item b s/d o)
                  </div>
                  <div className="border border-slate-300 rounded-b overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                          <th className="py-1.5 px-3 w-12 text-center border-r border-slate-300">Kode</th>
                          <th className="py-1.5 px-3 border-r border-slate-300">Parameter Spesifikasi Gedung</th>
                          <th className="py-1.5 px-3 w-40 text-right">Kuantitas / Rincian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {/* Struktur & Manpower */}
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">b</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Manpower (Personil Cleaner Aktif)
                          </td>
                          <td className="py-1.5 px-3 text-right font-black text-emerald-800">
                            {printProject.manpowerCount ?? printProject.activeCleanersCount ?? 0} Personil
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50 hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">c</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Lantai Bangunan yang Dikelola
                          </td>
                          <td className="py-1.5 px-3 text-right font-black text-blue-800">
                            {printProject.floorCount ?? 0} Lantai
                          </td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">h</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Lobby Utama & Akses Masuk
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                            {printProject.lobbyCount ?? 0} Titik Lobby
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50 hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">i</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Lantai Parkir Basement
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                            {printProject.basementParkingCount ?? 0} Lantai
                          </td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">j</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Lantai Parkir Atas (Elevated Parking)
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                            {printProject.upperParkingCount ?? 0} Lantai
                          </td>
                        </tr>

                        {/* Transportasi Vertikal */}
                        <tr className="bg-slate-100/70 border-t border-b border-slate-300 font-bold text-slate-900">
                          <td colSpan={3} className="py-1 px-3 text-[10px] uppercase tracking-wider text-purple-900 bg-purple-50">
                            Transportasi Vertikal (Lift & Tangga Berjalan)
                          </td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">d</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Lift Penumpang (Passenger Elevator)
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-purple-900">
                            {printProject.passengerLiftCount ?? 0} Unit
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50 hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">e</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Lift Service (Service / Cargo Elevator)
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-purple-900">
                            {printProject.serviceLiftCount ?? 0} Unit
                          </td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">f</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Eskalator (Moving Stairs)
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-purple-900">
                            {printProject.escalatorCount ?? 0} Unit
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50 hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">g</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Travalator (Moving Walkways)
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-purple-900">
                            {printProject.travelatorCount ?? 0} Unit
                          </td>
                        </tr>

                        {/* Sanitasi & Toilet */}
                        <tr className="bg-slate-100/70 border-t border-b border-slate-300 font-bold text-slate-900">
                          <td colSpan={3} className="py-1 px-3 text-[10px] uppercase tracking-wider text-teal-900 bg-teal-50">
                            Fasilitas Sanitasi & Titik Toilet Gedung
                          </td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">k</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Keseluruhan Ruang Toilet
                          </td>
                          <td className="py-1.5 px-3 text-right font-black text-teal-900">
                            {printProject.totalToiletCount ?? 0} Ruang Toilet
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50 hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">l</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Kubikal Kloset Sanitasi
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                            {printProject.cubicleCount ?? 0} Kubikal
                          </td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">m</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Unit Urinal Pria
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                            {printProject.urinalCount ?? 0} Unit
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50 hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">n</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Unit Washtafel / Bak Cuci Tangan
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                            {printProject.washbasinCount ?? 0} Unit
                          </td>
                        </tr>
                        <tr className="bg-white hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-bold text-center border-r border-slate-200 text-slate-600">o</td>
                          <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            Jumlah Titik Sebaran Toilet Per Lantai (Pria / Wanita)
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                            {printProject.toiletPointsPerFloorPW || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. BAGIAN III: SPESIFIKASI JENIS LANTAI (MULTI-SELECT) & REKOMENDASI CHEMICAL */}
                <div className="space-y-1.5 page-break-inside-avoid">
                  <div className="bg-slate-900 text-white font-bold px-3 py-1 text-[11px] uppercase tracking-wide rounded-t flex items-center justify-between">
                    <span>BAGIAN III: SPESIFIKASI JENIS LANTAI & STANDAR CHEMICAL K3</span>
                    <span className="text-[9px] font-normal text-amber-300">
                      Terpasang: {(printProject.floorTypes || []).length} Jenis Material
                    </span>
                  </div>
                  <div className="border border-slate-300 rounded-b p-3 bg-slate-50/50 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_FLOOR_TYPES.map((ft) => {
                        const isInstalled = (printProject.floorTypes || []).includes(ft.id);
                        if (!isInstalled) return null;

                        return (
                          <div key={ft.id} className="bg-white border border-slate-300 rounded-lg p-2.5 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-[11px] flex items-center space-x-1.5">
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span>{ft.label}</span>
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                Terverifikasi
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-600 leading-tight">
                              {ft.description}
                            </div>
                            <div className="text-[9px] font-semibold text-amber-800 pt-1 border-t border-slate-100">
                              🧪 Standar Chemical: {ft.recommendedChemical}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 6. BAGIAN IV: CATATAN KHUSUS LAPANGAN & PROTOKOL K3 */}
                {printProject.notes && (
                  <div className="space-y-1 page-break-inside-avoid">
                    <div className="bg-slate-800 text-white font-bold px-3 py-1 text-[10px] uppercase tracking-wide rounded-t">
                      BAGIAN IV: CATATAN KHUSUS LAPANGAN & PROTOKOL K3
                    </div>
                    <div className="border border-slate-300 rounded-b p-2.5 bg-slate-50 text-[10px] text-slate-700 leading-relaxed">
                      {printProject.notes}
                    </div>
                  </div>
                )}

                {/* 7. BAGIAN V: LEMBAR PENGESAHAN & TANDA TANGAN RESMI */}
                <div className="pt-4 border-t-2 border-slate-300 page-break-inside-avoid">
                  <div className="text-[10px] font-bold text-slate-700 text-center uppercase tracking-wider mb-3">
                    LEMBAR PENGESAHAN DOKUMEN SPESIFIKASI PROYEK & FASILITAS GEDUNG
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-12">
                      <div className="text-[10px] text-slate-600 font-semibold">
                        Disiapkan Oleh:<br />
                        <strong>Site Supervisor (PIC)</strong>
                      </div>
                      <div className="border-b border-slate-900 mx-4 pt-4">
                        <span className="font-bold text-[11px] text-slate-900">{printProject.siteSupervisor || 'Supervisor Lokasi'}</span>
                      </div>
                      <div className="text-[9px] text-slate-500">Tgl: ....................................</div>
                    </div>

                    <div className="space-y-12">
                      <div className="text-[10px] text-slate-600 font-semibold">
                        Diverifikasi Oleh:<br />
                        <strong>Facility Manager / Klien</strong>
                      </div>
                      <div className="border-b border-slate-900 mx-4 pt-4">
                        <span className="font-bold text-[11px] text-slate-900">(...........................................)</span>
                      </div>
                      <div className="text-[9px] text-slate-500">Tgl: ....................................</div>
                    </div>

                    <div className="space-y-12">
                      <div className="text-[10px] text-slate-600 font-semibold">
                        Disetujui Oleh:<br />
                        <strong>Operations Director (HQ)</strong>
                      </div>
                      <div className="border-b border-slate-900 mx-4 pt-4">
                        <span className="font-bold text-[11px] text-slate-900">PT Rajawali Prima Service</span>
                      </div>
                      <div className="text-[9px] text-slate-500">Tgl: ....................................</div>
                    </div>
                  </div>
                </div>

                {/* Document Footer Stamp */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
                  <span>Sistem Informasi Manajemen Terpadu Eagle Services</span>
                  <span>Dokumen Rahasia & Standar Operasional Resmi</span>
                  <span>Halaman 1 dari 1</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Control Bar */}
            <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-800 flex items-center justify-between no-print shrink-0">
              <span className="text-xs text-slate-400">
                Tip: Gunakan opsi printer "Save as PDF" di browser untuk mengunduh dokumen resmi dalam format PDF.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  id="bottom-close-print-modal-btn"
                  onClick={() => setPrintProject(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  id="bottom-do-print-btn"
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Form Spesifikasi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS LOKASI PROJECT */}
      <ConfirmModal
        isOpen={Boolean(projectToDelete)}
        title="Hapus Lokasi Project"
        message={`Apakah Anda yakin ingin menghapus data lokasi project "${projectToDelete?.name}" (${projectToDelete?.code})? Lokasi ini akan dihapus dari daftar operasional.`}
        confirmText="Ya, Hapus Lokasi"
        cancelText="Batal"
        confirmVariant="danger"
        onConfirm={confirmExecuteDeleteProject}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};

