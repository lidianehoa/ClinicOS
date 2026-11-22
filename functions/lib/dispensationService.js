"use strict";
/**
 * Serviço de Token de Dispensação e Formatação da Receita Digital ClinicOS (Server-side)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRAZOS_VALIDADE_PADRAO = exports.ALFABETO_DISPENSACAO = void 0;
exports.generateDispensationToken = generateDispensationToken;
exports.calcularValidadeReceita = calcularValidadeReceita;
exports.formatDataExtensoPtBR = formatDataExtensoPtBR;
exports.formatIdadeCalculada = formatIdadeCalculada;
exports.getTituloCentralReceita = getTituloCentralReceita;
exports.mascararCpf = mascararCpf;
exports.ALFABETO_DISPENSACAO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
exports.PRAZOS_VALIDADE_PADRAO = {
    simples: 30,
    controle_especial: 30,
    antimicrobiano: 10,
    magistral: 30,
};
function generateDispensationToken(dataReferencia = new Date()) {
    const d = dataReferencia;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = String(d.getFullYear());
    const prefixoData = `${dia}${mes}${ano}`;
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        const idx = Math.floor(Math.random() * exports.ALFABETO_DISPENSACAO.length);
        codigo += exports.ALFABETO_DISPENSACAO[idx];
    }
    return `${prefixoData}-${codigo}`;
}
function calcularValidadeReceita(subtipo, dataEmissao = new Date(), customDias) {
    const emissao = typeof dataEmissao === 'string' ? new Date(dataEmissao) : dataEmissao;
    const dias = customDias && customDias > 0 ? customDias : (exports.PRAZOS_VALIDADE_PADRAO[subtipo] || 30);
    const dataValidade = new Date(emissao.getTime());
    dataValidade.setDate(dataValidade.getDate() + dias);
    const dia = String(dataValidade.getDate()).padStart(2, '0');
    const mes = String(dataValidade.getMonth() + 1).padStart(2, '0');
    const ano = dataValidade.getFullYear();
    return {
        validadeAte: `${dia}/${mes}/${ano}`,
        validadeDias: dias,
        dataValidade
    };
}
function formatDataExtensoPtBR(data = new Date()) {
    const d = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(d.getTime()))
        return '';
    const diasSemana = [
        'domingo',
        'segunda-feira',
        'terça-feira',
        'quarta-feira',
        'quinta-feira',
        'sexta-feira',
        'sábado'
    ];
    const meses = [
        'janeiro',
        'fevereiro',
        'março',
        'abril',
        'maio',
        'junho',
        'julho',
        'agosto',
        'setembro',
        'outubro',
        'novembro',
        'dezembro'
    ];
    const diaSemana = diasSemana[d.getDay()];
    const dia = d.getDate();
    const mes = meses[d.getMonth()];
    const ano = d.getFullYear();
    return `Emitido em ${diaSemana}, ${dia} de ${mes} de ${ano}`;
}
function formatIdadeCalculada(idadeOuNascimento) {
    if (!idadeOuNascimento)
        return '';
    if (typeof idadeOuNascimento === 'number') {
        const anos = Math.floor(idadeOuNascimento);
        const meses = Math.round((idadeOuNascimento - anos) * 12);
        if (anos === 0)
            return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
        if (meses === 0)
            return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
        return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    }
    const d = new Date(idadeOuNascimento);
    if (!isNaN(d.getTime()) && idadeOuNascimento.includes('-') && idadeOuNascimento.length >= 8) {
        const hoje = new Date();
        let anos = hoje.getFullYear() - d.getFullYear();
        let meses = hoje.getMonth() - d.getMonth();
        if (hoje.getDate() < d.getDate()) {
            meses--;
        }
        if (meses < 0) {
            anos--;
            meses += 12;
        }
        if (anos < 0)
            return '';
        if (anos === 0 && meses === 0)
            return 'menos de 1 mês';
        if (anos === 0)
            return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
        if (meses === 0)
            return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
        return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    }
    return String(idadeOuNascimento);
}
function getTituloCentralReceita(subtipo) {
    switch (subtipo) {
        case 'controle_especial':
            return 'RECEITA DE CONTROLE ESPECIAL';
        case 'antimicrobiano':
            return 'RECEITA DE ANTIMICROBIANO';
        case 'magistral':
            return 'PRESCRIÇÃO DE PREPARAÇÃO MAGISTRAL VETERINÁRIA';
        case 'simples':
        default:
            return 'RECEITA';
    }
}
function mascararCpf(cpf) {
    if (!cpf)
        return '';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11)
        return cpf;
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}
//# sourceMappingURL=dispensationService.js.map