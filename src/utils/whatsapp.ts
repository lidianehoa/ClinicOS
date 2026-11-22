/** Link para abrir a conversa no WhatsApp Web (ou no app, no celular). Assume Brasil (55) se vier sem DDI. */
export function linkWhatsApp(telefone?: string | null): string | null {
  let d = String(telefone || '').replace(/\D/g, '');
  if (d.length < 10) return null;
  if (!(d.startsWith('55') && d.length >= 12)) d = '55' + d;
  return `https://web.whatsapp.com/send?phone=${d}`;
}
