import React, { useState } from 'react';
import { X, CheckSquare, Check, ShieldAlert } from 'lucide-react';
import { saveAuditoriaCompliance, AuditoriaCompliance } from '../services/dataService';

interface AuditoriaModalProps {
  clientId: string;
  onClose: () => void;
}

const auditItems: Record<'checklist_compliance' | 'conferencia_maleta', string[]> = {
  checklist_compliance: [
    'Uso correto de EPIs',
    'Higienização das mãos antes e depois do contato',
    'Descarte adequado de perfurocortantes',
    'Termos de consentimento devidamente assinados',
    'Acondicionamento adequado de resíduos biológicos',
  ],
  conferencia_maleta: [
    'Estetoscópio e termômetro calibrados/limpos',
    'Seringas e agulhas em quantidade suficiente',
    'Medicamentos de emergência (Adrenalina, Atropina) no prazo de validade',
    'Material para curativo (Gaze, atadura, esparadrapo)',
    'Caixa de perfurocortantes portátil',
    'Luvas de procedimento e estéreis'
  ]
};

const AuditoriaModal: React.FC<AuditoriaModalProps> = ({ onClose }) => {
  const [tipo, setTipo] = useState<'checklist_compliance' | 'conferencia_maleta'>('checklist_compliance');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const toggleCheck = (index: number) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setCheckedItems(newSet);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const total = auditItems[tipo].length;
    const conformes = checkedItems.size;
    
    // Critérios simples
    let parecer: 'apto' | 'adequacao' | 'critico' = 'apto';
    if (conformes < total) parecer = 'adequacao';
    if (conformes < total / 2) parecer = 'critico';

    const auditoria: AuditoriaCompliance = {
      id: `audit_${Date.now()}`,
      veterinarioId: 'vet_atual', // MVP simplificado
      tipo,
      data: new Date().toISOString(),
      itensConformes: conformes,
      itensTotal: total,
      parecer
    };

    await saveAuditoriaCompliance(auditoria);
    
    setIsSaving(false);
    setIsDone(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Auditoria & Checklist</h2>
              <p className="text-xs text-slate-500">Controle de Qualidade Domiciliar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isDone ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Auditoria Registrada!</h3>
              <p className="text-sm text-slate-500">Checklist salvo com sucesso no sistema.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Seletor de Tipo */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => { setTipo('checklist_compliance'); setCheckedItems(new Set()); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tipo === 'checklist_compliance' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Compliance (Atendimento)
                </button>
                <button
                  onClick={() => { setTipo('conferencia_maleta'); setCheckedItems(new Set()); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tipo === 'conferencia_maleta' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Conferência de Maleta
                </button>
              </div>

              {/* Lista de itens */}
              <div className="space-y-3">
                {auditItems[tipo].map((item, index) => (
                  <label key={index} className="flex items-start gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={checkedItems.has(index)}
                      onChange={() => toggleCheck(index)}
                      className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500" 
                    />
                    <span className="text-sm text-slate-700 font-medium leading-tight">{item}</span>
                  </label>
                ))}
              </div>

              <div className="bg-slate-50 text-slate-600 p-3 rounded-xl flex gap-2 items-start text-xs border border-slate-100">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                <p>O preenchimento do checklist gera um parecer automático de aptidão que fica registrado para fins de compliance.</p>
              </div>
            </div>
          )}
        </div>

        {!isDone && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 mt-auto">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? 'Salvando...' : 'Finalizar Checklist'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditoriaModal;
