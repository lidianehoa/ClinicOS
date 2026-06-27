import { useState, useEffect } from 'react';
import { query, where, doc, setDoc, onSnapshot } from 'firebase/firestore';
// import { db } from '../../services/firebase';
import { AppUser, APP_ID, Hospitalization, HospitalizationEvolution, hospitalizationEvolutionsCol } from '../../services/dataService';
import { Loader2, Plus, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  hospitalization: Hospitalization;
  userProfile: AppUser | null;
}

const HospitalizationEvolutions = ({ hospitalization, userProfile }: Props) => {
  const { t } = useTranslation(['medical', 'common']);
  const [evolutions, setEvolutions] = useState<HospitalizationEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [weight, setWeight] = useState('');
  const [temperature, setTemperature] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(hospitalizationEvolutionsCol(APP_ID), where('hospitalizationId', '==', hospitalization.id));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as HospitalizationEvolution));
      list.sort((a, b) => {
        const dtA = new Date(`${a.date}T${a.time}`);
        const dtB = new Date(`${b.date}T${b.time}`);
        return dtB.getTime() - dtA.getTime();
      });
      setEvolutions(list);
      setLoading(false);
    });
    return () => unsub();
  }, [hospitalization.id]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const eRef = doc(hospitalizationEvolutionsCol(APP_ID));
      const now = new Date();
      await setDoc(eRef, {
        id: eRef.id,
        hospitalizationId: hospitalization.id,
        patientId: hospitalization.patientId,
        professionalId: userProfile?.staffId || userProfile?.uid,
        professionalName: userProfile?.nome,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().substring(0,5),
        text,
        weight: weight ? Number(weight) : null,
        temperature: temperature ? Number(temperature) : null,
        tenantId: APP_ID,
        createdAt: now.toISOString()
      });
      
      setText('');
      setWeight('');
      setTemperature('');
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao adicionar evolução.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>;

  return (
    <div className="p-6 space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{t('medical:hospitalization.evolutions_title', 'Evolução Clínica')}</h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> {t('medical:hospitalization.add_evolution', 'Adicionar Evolução')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 space-y-4">
          <textarea 
            value={text} 
            onChange={e => setText(e.target.value)} 
            placeholder={t('medical:hospitalization.evolution_placeholder', 'Descreva a evolução do paciente...')}
            className="w-full h-24 bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500 resize-none text-sm"
          />
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">{t('medical:hospitalization.weight_kg', 'Peso (kg)')}</label>
              <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 text-sm w-24" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">{t('medical:hospitalization.temp_c', 'Temp (°C)')}</label>
              <input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} className="bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 text-sm w-24" />
            </div>
            <div className="flex-1 flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors">{t('common:cancel', 'Cancelar')}</button>
              <button onClick={handleSave} disabled={saving || !text.trim()} className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {t('common:save', 'Salvar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {evolutions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-sm">{t('medical:hospitalization.no_evolutions', 'Nenhuma evolução registrada para este paciente.')}</p>
        </div>
      ) : (
        <div className="relative border-l border-white/10 ml-3 space-y-6">
          {evolutions.map(ev => (
            <div key={ev.id} className="relative pl-6">
              <div className="absolute -left-2.5 top-1.5 w-5 h-5 bg-teal-500/20 border-2 border-teal-500 rounded-full" />
              
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-slate-400 text-xs font-bold font-mono">
                    {ev.date.split('-').reverse().join('/')} às {ev.time}
                  </p>
                  <span className="text-xs text-teal-400 font-bold">Dr(a). {ev.professionalName}</span>
                </div>
                
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{ev.text}</p>
                
                {(ev.weight || ev.temperature) && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-slate-400 font-bold">
                    {ev.weight && <span>Peso: {ev.weight}kg</span>}
                    {ev.temperature && <span>Temp: {ev.temperature}°C</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalizationEvolutions;
