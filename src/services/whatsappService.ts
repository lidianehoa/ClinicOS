import { getIntegrationsConfig } from './dataService';

// Formatar número para padrão internacional
const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
};

// Enviar mensagem de texto
export const sendWhatsAppMessage = async (
  phone: string,
  message: string
): Promise<boolean> => {
  try {
    const config = await getIntegrationsConfig();
    if (!config || !config.whatsappEnabled || !config.evolutionApiUrl || !config.evolutionApiKey) {
      console.warn('WhatsApp API não configurada ou desativada.');
      return false;
    }

    const baseUrl = config.evolutionApiUrl.replace(/\/$/, ''); // remove trailing slash se houver
    const instance = config.evolutionInstanceName || 'clinicos';

    const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.evolutionApiKey,
      },
      body: JSON.stringify({
        number: formatPhone(phone),
        text: message,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
};

// Templates de mensagem
export const templates = {
  appointmentReminder: (
    clientName: string,
    patientName: string,
    date: string,
    time: string,
    clinicName: string
  ) => `Olá, ${clientName}! 👋

Lembramos que *${patientName}* tem consulta agendada amanhã, *${date} às ${time}*.

📍 ${clinicName}

Para confirmar ou reagendar, entre em contato conosco.

_ClinicOS — Sistema de Gestão de Clínicas_`,

  appointmentConfirmation: (
    clientName: string,
    patientName: string,
    date: string,
    time: string,
    serviceName: string
  ) => `Olá, ${clientName}! ✅

Agendamento confirmado para *${patientName}*:

📅 Data: ${date}
⏰ Horário: ${time}
🏥 Serviço: ${serviceName}

Te esperamos!`,

  returnReminder: (
    clientName: string,
    patientName: string,
    returnDate: string
  ) => `Olá, ${clientName}! 🐾

${patientName} tem retorno sugerido para *${returnDate}*.

Deseja agendar? Entre em contato conosco!`,
};
