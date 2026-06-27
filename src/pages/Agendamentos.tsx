import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Plus, X, ChevronLeft, ChevronRight, 
  CheckCircle, PlayCircle, XCircle, Trash2, Edit2, List, Grid, DollarSign, Search
} from 'lucide-react';
import { 
  subscribeAppointments, saveAppointment, type Appointment, addPatientToDailyFlow,
  subscribeCustomers, type Customer,
  subscribeServices, type ClinicService,
  subscribeStaff, type StaffMember,
  type AppUser,
  type MedicalRecord,
  getCustomer,
  saveNotificationLog
} from '../services/dataService';
import { sendWhatsAppMessage, templates } from '../services/whatsappService';
import ProntuarioModal from '../components/ProntuarioModal';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS = {
  'scheduled': 'bg-blue-100 border-blue-300 text-blue-700',
  'confirmed': 'bg-emerald-100 border-emerald-300 text-emerald-700',
  'in_progress': 'bg-amber-100 border-amber-300 text-amber-700',
  'completed': 'bg-slate-100 border-slate-300 text-slate-700',
  'cancelled': 'bg-red-100 border-red-300 text-red-700',
  'no_show': 'bg-purple-100 border-purple-300 text-purple-700',
};

const STATUS_LABELS = {
  'scheduled': 'Agendado',
  'confirmed': 'Confirmado',
  'in_progress': 'Em Atendimento',
  'completed': 'Concluído',
  'cancelled': 'Cancelado',
  'no_show': 'Não Compareceu'
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Seg
  return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const formatISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const addMinutes = (t: string, mins: number) => {
  const total = timeToMinutes(t) + mins;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function Agendamentos({ userProfile }: { userProfile: AppUser | null }) {
  const { t } = useTranslation(['medical', 'common']);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingApt, setEditingApt] = useState<Partial<Appointment> | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  // Autocomplete states
  const [clientSearch, setClientSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);

  const [sendWaConfirmation, setSendWaConfirmation] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    const unsubApts = subscribeAppointments(setAppointments);
    const unsubCust = subscribeCustomers(setCustomers);
    const unsubServ = subscribeServices(setServices);
    const unsubStaff = subscribeStaff(setStaff);
    return () => { unsubApts(); unsubCust(); unsubServ(); unsubStaff(); };
  }, []);

  const weekStart = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 6 }).map((_, i) => addDays(weekStart, i)); // Seg a Sab

  const filteredAppointments = useMemo(() => {
    if (viewMode === 'day') {
      const dateStr = formatISO(currentDate);
      return appointments.filter(a => a.date === dateStr);
    } else {
      const startStr = formatISO(weekDays[0]);
      const endStr = formatISO(weekDays[5]);
      return appointments.filter(a => a.date >= startStr && a.date <= endStr);
    }
  }, [appointments, viewMode, currentDate, weekDays]);

  const handlePrev = () => setCurrentDate(addDays(currentDate, viewMode === 'week' ? -7 : -1));
  const handleNext = () => setCurrentDate(addDays(currentDate, viewMode === 'week' ? 7 : 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleGridClick = (dateStr: string, timeStr: string) => {
    setEditingApt({
      date: dateStr,
      startTime: timeStr,
      status: 'scheduled',
      endTime: addMinutes(timeStr, 30),
      createdAt: new Date().toISOString()
    });
    setClientSearch('');
    setShowModal(true);
  };

  const handleAptClick = (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedApt(apt);
    setShowDetails(true);
  };

  const saveApt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt?.clientId || !editingApt?.patientId || !editingApt?.serviceId) {
      alert("Preencha os campos obrigatórios (Cliente, Paciente, Serviço)");
      return;
    }
    
    try {
      await saveAppointment(editingApt as Appointment);
      setShowModal(false);

      if (sendWaConfirmation && editingApt.clientId) {
        const c = await getCustomer(editingApt.clientId);
        if (c?.telefone) {
          const sName = services.find(s => s.id === editingApt.serviceId)?.name || 'Serviço';
          const msg = templates.appointmentConfirmation(
            c.nome, editingApt.patientName!, editingApt.date!.split('-').reverse().join('/'), editingApt.startTime!, sName
          );
          const ok = await sendWhatsAppMessage(c.telefone, msg);
          await saveNotificationLog({
            id: `notif_${Date.now()}`,
            type: 'confirmation',
            appointmentId: editingApt.id,
            clientName: c.nome,
            phone: c.telefone,
            message: msg,
            status: ok ? 'sent' : 'failed',
            sentAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      alert("Erro ao salvar agendamento");
    }
  };

  const handleManualReminder = async (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const c = await getCustomer(apt.clientId);
      if (!c?.telefone) return alert('Cliente não possui telefone cadastrado.');
      
      const msg = templates.appointmentReminder(
        c.nome, apt.patientName, apt.date.split('-').reverse().join('/'), apt.startTime, 'ClinicOS'
      );
      const ok = await sendWhatsAppMessage(c.telefone, msg);
      await saveNotificationLog({
        id: `notif_${Date.now()}`,
        type: 'reminder',
        appointmentId: apt.id,
        clientName: c.nome,
        phone: c.telefone,
        message: msg,
        status: ok ? 'sent' : 'failed',
        sentAt: new Date().toISOString()
      });
      if (ok) alert('Lembrete enviado com sucesso!');
      else alert('Falha ao enviar lembrete. Verifique as configurações de Integração.');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar lembrete.');
    }
  };

  const handleStatusChange = async (apt: Appointment, newStatus: Appointment['status']) => {
    try {
      const updated = { ...apt, status: newStatus };
      await saveAppointment(updated);
      setSelectedApt(updated);

      if (newStatus === 'in_progress') {
        await addPatientToDailyFlow(apt.date, {
          _id: `reg_${Date.now()}`,
          cliente: apt.clientName,
          animal: apt.patientName,
          procedimento: apt.serviceName,
          maquininha: '',
          pagamento: '',
          valor: '',
          observacoes: 'Via Agendamento',
          pago: false,
          isManual: false
        });
        alert("Paciente enviado para fila de atendimento!");
      }
    } catch (err) {
      alert("Erro ao atualizar status");
    }
  };

  const handleCobrar = (apt: Appointment) => {
    window.location.href = `/?tab=caixa&serviceId=${apt.serviceId}&clientId=${apt.clientId}&clientName=${encodeURIComponent(apt.clientName)}&animalName=${encodeURIComponent(apt.patientName)}`;
  };

  const renderWeekGrid = () => {
    const hours = Array.from({ length: 14 }).map((_, i) => i + 7); // 07 to 20
    const cellHeight = 60; // px per hour
    
    return (
      <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-sm relative">
        <div className="flex border-b border-slate-100 sticky top-0 bg-white z-20">
          <div className="w-16 flex-shrink-0 border-r border-slate-100 bg-slate-50" />
          {weekDays.map(d => {
            const isToday = formatISO(d) === formatISO(new Date());
            return (
              <div key={d.toISOString()} className={`flex-1 text-center py-3 border-r border-slate-100 ${isToday ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}>
                <div className="text-xs font-bold uppercase">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                <div className={`text-xl font-black ${isToday ? 'text-emerald-700' : 'text-slate-800'}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        <div className="relative flex">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 bg-slate-50 border-r border-slate-100 relative">
            {hours.map(h => (
              <div key={h} className="text-[10px] text-slate-400 font-bold text-right pr-2 pt-1 border-b border-slate-100" style={{ height: cellHeight }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Days columns */}
          {weekDays.map(d => {
            const dateStr = formatISO(d);
            const dayApts = filteredAppointments.filter(a => a.date === dateStr);
            return (
              <div key={d.toISOString()} className="flex-1 relative border-r border-slate-100" style={{ height: hours.length * cellHeight }}>
                {/* Background grid for clicking */}
                {hours.map((h, i) => (
                  <div key={h} className="absolute w-full border-b border-slate-100" style={{ top: i * cellHeight, height: cellHeight }}>
                    <div onClick={() => handleGridClick(dateStr, `${String(h).padStart(2, '0')}:00`)} className="h-1/2 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 border-dashed" />
                    <div onClick={() => handleGridClick(dateStr, `${String(h).padStart(2, '0')}:30`)} className="h-1/2 cursor-pointer hover:bg-slate-50 transition-colors" />
                  </div>
                ))}

                {/* Events */}
                {dayApts.map(apt => {
                  const startMins = timeToMinutes(apt.startTime) - 7 * 60;
                  const endMins = timeToMinutes(apt.endTime) - 7 * 60;
                  const top = (startMins / 60) * cellHeight;
                  const height = ((endMins - startMins) / 60) * cellHeight;
                  
                  return (
                    <div 
                      key={apt.id} 
                      onClick={(e) => handleAptClick(apt, e)}
                      className={`absolute left-1 right-1 rounded-md border-l-4 p-1.5 cursor-pointer shadow-sm overflow-hidden z-10 transition-transform hover:scale-[1.02] ${STATUS_COLORS[apt.status]}`}
                      style={{ top, height, minHeight: 24 }}
                    >
                      <div className="text-[10px] font-bold leading-tight truncate">{apt.patientName}</div>
                      <div className="text-[9px] opacity-80 leading-tight truncate">{apt.serviceName}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayList = () => {
    const dayApts = filteredAppointments;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Horário</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente/Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Serviço</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {dayApts.map(apt => (
              <tr key={apt.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={(e) => handleAptClick(apt, e)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-bold text-slate-700 text-sm">{apt.startTime} - {apt.endTime}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800 text-sm">{apt.patientName}</div>
                  <div className="text-xs text-slate-500">{apt.clientName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-700">{apt.serviceName}</div>
                  {apt.professionalName && <div className="text-[11px] text-slate-400">Dr(a) {apt.professionalName}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[11px] font-bold ${STATUS_COLORS[apt.status]}`}>
                    {STATUS_LABELS[apt.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                   {apt.status === 'scheduled' && (
                     <>
                       <button onClick={() => handleStatusChange(apt, 'confirmed')} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded hover:bg-emerald-100">Confirmar</button>
                       <button onClick={(e) => handleManualReminder(apt, e)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 flex items-center gap-1 ml-1" title="Enviar Lembrete">📱</button>
                     </>
                   )}
                   {apt.status === 'confirmed' && (
                     <>
                       <button onClick={() => handleStatusChange(apt, 'in_progress')} className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded hover:bg-amber-100">Iniciar</button>
                       <button onClick={(e) => handleManualReminder(apt, e)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded hover:bg-indigo-100 flex items-center gap-1 ml-1" title="Enviar Lembrete">📱</button>
                     </>
                   )}
                   {apt.status === 'in_progress' && (
                     <button onClick={() => handleStatusChange(apt, 'completed')} className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200">Concluir</button>
                   )}
                   {apt.status === 'completed' && (
                     <button onClick={() => handleCobrar(apt)} className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-200 flex items-center gap-1 ml-auto">
                       <DollarSign className="w-3 h-3" /> Cobrar
                     </button>
                   )}
                </td>
              </tr>
            ))}
            {dayApts.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum agendamento para esta data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const selectedClient = customers.find(c => c.id === editingApt?.clientId);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t('medical:appointments.title', 'Agendamentos')}</h1>
          <p className="text-sm font-medium text-slate-500">{t('medical:appointments.subtitle', 'Gestão de consultas e fila')}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${viewMode === 'week' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Grid className="w-4 h-4" /> Semana
          </button>
          <button 
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${viewMode === 'day' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <List className="w-4 h-4" /> Dia
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 font-bold text-slate-700 text-sm min-w-[200px] text-center">
             {viewMode === 'week' 
               ? `Semana de ${weekDays[0].getDate()} a ${weekDays[5].getDate()} ${weekDays[5].toLocaleDateString('pt-BR', { month: 'short' })}`
               : currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
             }
          </div>
          <button onClick={handleNext} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={handleToday} className="ml-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors">Hoje</button>
        </div>
        <button 
          onClick={() => {
            setEditingApt({ date: formatISO(currentDate), startTime: '09:00', endTime: '09:30', status: 'scheduled' });
            setClientSearch('');
            setShowModal(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-5 h-5" /> {t('medical:appointments.new_appointment', 'Novo Agendamento')}
        </button>
      </div>

      {viewMode === 'week' ? renderWeekGrid() : renderDayList()}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      {showModal && editingApt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-500" /> 
                {editingApt.id ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={saveApt} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Data*</label>
                  <input type="date" required value={editingApt.date} onChange={e => setEditingApt({...editingApt, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Horário*</label>
                  <div className="flex items-center gap-2">
                    <input type="time" required value={editingApt.startTime} onChange={e => setEditingApt({...editingApt, startTime: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm" />
                    <span className="text-slate-400">até</span>
                    <input type="time" required value={editingApt.endTime} onChange={e => setEditingApt({...editingApt, endTime: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm" />
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5 relative">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Buscar Cliente*</label>
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input 
                       type="text" 
                       value={clientSearch}
                       onChange={e => {
                         setClientSearch(e.target.value);
                         setShowClientResults(true);
                       }}
                       onFocus={() => setShowClientResults(true)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm" 
                       placeholder="Nome ou telefone..." 
                     />
                  </div>
                  {showClientResults && clientSearch.length > 1 && (
                     <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                        {customers.filter(c => c.nome.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                          <div 
                            key={c.id} 
                            className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                            onClick={() => {
                              setEditingApt({...editingApt, clientId: c.id, clientName: c.nome, patientId: '', patientName: ''});
                              setClientSearch(c.nome);
                              setShowClientResults(false);
                            }}
                          >
                            <div className="text-sm font-bold text-slate-700">{c.nome}</div>
                            <div className="text-[11px] text-slate-500">{c.telefone}</div>
                          </div>
                        ))}
                     </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Paciente*</label>
                  <select 
                    required 
                    value={editingApt.patientName || ''} 
                    onChange={e => {
                      const an = selectedClient?.animais?.find(a => a.nome === e.target.value);
                      setEditingApt({...editingApt, patientId: an?.nome, patientName: an?.nome});
                    }} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm disabled:opacity-50"
                    disabled={!selectedClient}
                  >
                    <option value="">Selecione...</option>
                    {selectedClient?.animais?.map((a, i) => (
                      <option key={i} value={a.nome}>{a.nome} {a.especie ? `(${a.especie})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Serviço*</label>
                  <select 
                    required 
                    value={editingApt.serviceId || ''} 
                    onChange={e => {
                      const s = services.find(srv => srv.id === e.target.value);
                      if (s) {
                        const mins = s.durationUnit === 'h' ? s.duration * 60 : s.duration;
                        setEditingApt({...editingApt, serviceId: s.id, serviceName: s.name, endTime: addMinutes(editingApt.startTime || '09:00', mins)});
                      }
                    }} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {services.filter(s => s.status === 'Active').map(s => (
                      <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Profissional (Opcional)</label>
                  <select 
                    value={editingApt.professionalId || ''} 
                    onChange={e => {
                      const p = staff.find(st => st.id === e.target.value);
                      setEditingApt({...editingApt, professionalId: p?.id, professionalName: p?.name});
                    }} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm"
                  >
                    <option value="">Qualquer profissional</option>
                    {staff.filter(s => s.status === 'Active').map(s => (
                      <option key={s.id} value={s.id}>Dr(a) {s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Status</label>
                  <select 
                    value={editingApt.status} 
                    onChange={e => setEditingApt({...editingApt, status: e.target.value as any})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm"
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="confirmed">Confirmado</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Observações (Opcional)</label>
                  <textarea value={editingApt.notes || ''} onChange={e => setEditingApt({...editingApt, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm h-20" placeholder="Motivo do agendamento, restrições..." />
                </div>

                {!editingApt.id && (
                  <div className="col-span-2 flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="sendWa" 
                      checked={sendWaConfirmation} 
                      onChange={e => setSendWaConfirmation(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="sendWa" className="text-sm font-bold text-slate-600">Enviar confirmação por WhatsApp para o cliente</label>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                 <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                 <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-sm shadow-emerald-500/20 transition-all">Salvar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {showDetails && selectedApt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className={`p-6 border-b border-slate-100 flex items-start justify-between ${STATUS_COLORS[selectedApt.status].split(' ')[0]}`}>
                <div>
                   <span className="px-3 py-1 bg-white/60 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                     {STATUS_LABELS[selectedApt.status]}
                   </span>
                   <h3 className="text-xl font-black text-slate-800">{selectedApt.serviceName}</h3>
                   <p className="text-sm font-medium opacity-80">{selectedApt.date.split('-').reverse().join('/')} às {selectedApt.startTime} - {selectedApt.endTime}</p>
                </div>
                <button onClick={() => setShowDetails(false)} className="p-2 rounded-full bg-white/50 hover:bg-white text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
             </div>

             <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p>
                     <p className="text-sm font-bold text-slate-700">{selectedApt.clientName}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Paciente</p>
                     <p className="text-sm font-bold text-slate-700">{selectedApt.patientName}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Profissional</p>
                     <p className="text-sm font-bold text-slate-700">{selectedApt.professionalName ? `Dr(a) ${selectedApt.professionalName}` : 'Qualquer'}</p>
                   </div>
                </div>
                
                {selectedApt.notes && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Observações</p>
                    <p className="text-sm text-slate-600">{selectedApt.notes}</p>
                  </div>
                )}
             </div>

             <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase text-center">Alterar Status</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {selectedApt.status === 'scheduled' && (
                    <button onClick={() => handleStatusChange(selectedApt, 'confirmed')} className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition-colors text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Confirmar</button>
                  )}
                  {(selectedApt.status === 'scheduled' || selectedApt.status === 'confirmed') && (
                    <button onClick={() => handleStatusChange(selectedApt, 'in_progress')} className="px-4 py-2 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-colors text-sm flex items-center gap-1"><PlayCircle className="w-4 h-4"/> Iniciar Atendimento</button>
                  )}
                  {selectedApt.status === 'in_progress' && (
                    <button onClick={() => handleStatusChange(selectedApt, 'completed')} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Concluir</button>
                  )}
                  {selectedApt.status === 'completed' && (
                    <button onClick={() => handleCobrar(selectedApt)} className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors text-sm flex items-center gap-1"><DollarSign className="w-4 h-4"/> Cobrar no PDV</button>
                  )}
                  
                  <button onClick={() => handleStatusChange(selectedApt, 'no_show')} className="px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition-colors text-sm">Faltou</button>
                  <button onClick={() => handleStatusChange(selectedApt, 'cancelled')} className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors text-sm flex items-center gap-1"><XCircle className="w-4 h-4"/> Cancelar</button>
                  
                  {(selectedApt.status === 'in_progress' || selectedApt.status === 'completed') && (
                    <button 
                      onClick={() => {
                        setSelectedRecord({
                          id: `rec_${selectedApt.id}`,
                          patientId: selectedApt.patientId,
                          patientName: selectedApt.patientName,
                          clientId: selectedApt.clientId,
                          clientName: selectedApt.clientName,
                          professionalName: selectedApt.professionalName || userProfile?.nome,
                          date: selectedApt.date,
                          time: selectedApt.startTime,
                          chiefComplaint: '', anamnesis: '', diagnosis: '', treatment: '',
                          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                        });
                        setShowDetails(false);
                      }} 
                      className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1"
                    >
                      Ver/Criar Prontuário
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                  <button onClick={() => { setShowDetails(false); setEditingApt(selectedApt); setShowModal(true); setClientSearch(selectedApt.clientName); }} className="text-sm font-bold text-slate-500 hover:text-primary flex items-center gap-1"><Edit2 className="w-4 h-4" /> Editar</button>
                  <button onClick={() => { if(confirm('Excluir?')) { /* Call delete via save status inactive or actual delete */ setShowDetails(false); } }} className="text-sm font-bold text-red-400 hover:text-red-500 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Excluir</button>
                </div>
             </div>
          </div>
        </div>
      )}
      {selectedRecord && (
        <ProntuarioModal 
          initialRecord={selectedRecord} 
          onClose={() => setSelectedRecord(null)} 
        />
      )}
    </div>
  );
}
