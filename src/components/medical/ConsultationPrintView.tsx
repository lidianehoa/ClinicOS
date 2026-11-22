import { Consultation } from '../../services/dataService';
import { Printer, X } from 'lucide-react';

interface Props {
  consultation: Consultation;
  onClose: () => void;
}

const ConsultationPrintView = ({ consultation, onClose }: Props) => {

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      {/* HEADER PARA TELA (não impresso) */}
      <div className="flex items-center justify-between p-4 bg-slate-800 text-white print:hidden shadow-md">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Printer className="w-5 h-5" /> Visualização de Impressão (Prontuário)
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
          <button 
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Fechar
          </button>
        </div>
      </div>

      {/* CONTEÚDO IMPRESSO E VISUALIZADO */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
        <div className="bg-white text-black p-10 max-w-4xl w-full shadow-lg print:shadow-none print:p-0">
          
          <div className="border-b-2 border-black pb-4 mb-6">
            <h1 className="text-3xl font-black uppercase text-center mb-2">Prontuário de Atendimento</h1>
            <div className="flex justify-between text-sm mt-4">
              <div>
                <p><strong>Paciente:</strong> {consultation.patientName}</p>
                <p><strong>Tutor:</strong> {consultation.clientName}</p>
              </div>
              <div className="text-right">
                <p><strong>Data:</strong> {consultation.date.split('-').reverse().join('/')}</p>
                <p><strong>Profissional:</strong> {consultation.professionalName}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            
            <section>
              <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2">Sinais Vitais e Parâmetros</h2>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <p><strong>Peso:</strong> {consultation.weight ? `${consultation.weight} kg` : '-'}</p>
                <p><strong>Temp:</strong> {consultation.temperature ? `${consultation.temperature} °C` : '-'}</p>
                <p><strong>FC:</strong> {consultation.heartRate ? `${consultation.heartRate} bpm` : '-'}</p>
                <p><strong>FR:</strong> {consultation.respiratoryRate ? `${consultation.respiratoryRate} rpm` : '-'}</p>
                <p><strong>TPC:</strong> {consultation.tpc ? `${consultation.tpc} seg` : '-'}</p>
                <p><strong>Mucosas:</strong> {consultation.mucosas || '-'}</p>
                <p><strong>Hidratação:</strong> {consultation.hydration || '-'}</p>
                <p><strong>PA:</strong> {consultation.bloodPressure || '-'}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2">Histórico / Anamnese</h2>
              <p className="whitespace-pre-wrap text-sm">{consultation.anamnesis || 'Sem informações.'}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2">Queixa Principal (Sintomas)</h2>
              <p className="whitespace-pre-wrap text-sm">{consultation.chiefComplaint || 'Sem informações.'}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2">Exame Físico Específico</h2>
              <p className="whitespace-pre-wrap text-sm">{consultation.physicalExam || 'Sem informações.'}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2">Diagnóstico Presuntivo</h2>
              <p className="whitespace-pre-wrap text-sm">{consultation.diagnosis || 'Sem informações.'}</p>
            </section>

            <section>
              <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2">Tratamento / Observações Gerais</h2>
              <p className="whitespace-pre-wrap text-sm">{consultation.treatment || 'Sem informações.'}</p>
            </section>

            {consultation.prescription && consultation.prescription.length > 0 && (
              <section>
                <h2 className="text-lg font-bold uppercase border-b border-gray-300 mb-2">Prescrição Recomendada</h2>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {consultation.prescription.map((item, idx) => (
                    <li key={idx}><strong>{item.medication}</strong> - {item.dosage} ({item.frequency}) por {item.duration} - {item.instructions}</li>
                  ))}
                </ul>
              </section>
            )}

          </div>

          <div className="mt-16 pt-8 text-center text-sm">
            <div className="w-64 border-t border-black mx-auto mb-2"></div>
            <p><strong>{consultation.professionalName}</strong></p>
            <p>Assinatura do Profissional Responsável</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ConsultationPrintView;
