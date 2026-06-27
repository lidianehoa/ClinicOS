import { 
  getAppointments, 
  getCustomer, 
  getClinicConfig,
  saveNotificationLog
} from './dataService';
import { sendWhatsAppMessage, templates } from './whatsappService';

const getTomorrowDateStr = (): string => {
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  const y = tmrw.getFullYear();
  const m = String(tmrw.getMonth() + 1).padStart(2, '0');
  const d = String(tmrw.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const sendDailyReminders = async (): Promise<void> => {
  try {
    const tomorrowStr = getTomorrowDateStr();
    
    // 1. Obter todos agendamentos
    const allApts = await getAppointments();
    
    // 2. Filtrar para amanhã, e status validos
    const apts = allApts.filter(a => 
      a.date === tomorrowStr && 
      (a.status === 'scheduled' || a.status === 'confirmed')
    );
    
    if (apts.length === 0) {
      console.log('Nenhum lembrete para enviar.');
      return;
    }

    const clinic = await getClinicConfig();
    const clinicName = clinic?.name || 'Clínica';

    // 3. Para cada agendamento, notificar
    for (const apt of apts) {
      const client = await getCustomer(apt.clientId);
      if (!client || !client.telefone) {
        // Log Falha - Sem Telefone
        await saveNotificationLog({
          id: `notif_${Date.now()}_${apt.id}`,
          type: 'reminder',
          appointmentId: apt.id,
          clientName: apt.clientName,
          phone: 'N/A',
          message: 'Falha: Cliente sem telefone cadastrado',
          status: 'failed',
          sentAt: new Date().toISOString()
        });
        continue;
      }

      const msg = templates.appointmentReminder(
        client.nome,
        apt.patientName,
        apt.date.split('-').reverse().join('/'),
        apt.startTime,
        clinicName
      );

      const success = await sendWhatsAppMessage(client.telefone, msg);

      await saveNotificationLog({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'reminder',
        appointmentId: apt.id,
        clientName: client.nome,
        phone: client.telefone,
        message: msg,
        status: success ? 'sent' : 'failed',
        sentAt: new Date().toISOString()
      });
      
      // Sleep para não bater rate limit
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log(`Lembretes de amanhã concluídos. Total processados: ${apts.length}`);
  } catch (err) {
    console.error('Erro em sendDailyReminders:', err);
    throw err;
  }
};
