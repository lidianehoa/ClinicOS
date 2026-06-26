# Análise de Funcionalidades do Projeto - ClinicOS

Este projeto é um sistema de gestão (CRM/ERP) completo e moderno voltado para qualquer **Clínica de Saúde**. O sistema foi construído para unificar o fluxo de atendimento, o gerenciamento de clientes/pacientes e o faturamento, tudo isso potencializado por Inteligência Artificial.

Abaixo estão descritas todas as funcionalidades centrais divididas por módulos (Páginas/Tabs):

## 1. Monitoramento (Fila e Fluxo de Atendimento)
- **Gestão de Fila:** Acompanhamento em tempo real dos pacientes que estão na recepção aguardando atendimento.
- **Painel de Atendimentos:** Controle do status de cada paciente (em consulta, em observação, internado, alta médica).
- **Integração com CRM:** Acesso rápido ao prontuário e histórico do paciente direto da tela de monitoramento, garantindo agilidade para os profissionais de saúde e recepcionistas.

## 2. Caixa (PDV e Gestão Financeira)
- **Ponto de Venda (PDV):** Lançamento de serviços, exames, procedimentos e produtos.
- **Recebimentos:** Múltiplas formas de pagamento, cálculo de troco e fechamento de conta.
- **Histórico de Vendas:** Rastreamento do que foi faturado no dia, ticket médio e fluxo de caixa da recepção.

## 3. PDV Autônomo (Modo Totem/Autoatendimento)
- Uma visão simplificada e independente (operada sem a barra lateral completa) para atuar como um terminal de autoatendimento ou PDV rápido focado exclusivamente em finalizar compras e serviços de balcão sem poluição visual.

## 4. CRM (Gestão de Relacionamento de Clientes e Pacientes)
- **Ficha do Cliente e do Paciente:** Cadastro completo com informações de contato, tipo, categoria, peso, etc.
- **Histórico Clínico e Financeiro:** Visão unificada de tudo o que o paciente já realizou na clínica.
- **Lembretes e Retornos:** Agendamentos de vacinas, retornos de consultas e acompanhamento de tratamentos contínuos para garantir o retorno do cliente (retenção).

## 5. Importador de Dados
- Módulo estratégico de migração (Onboarding).
- Permite importar planilhas e dados exportados do sistema anterior, mapeando clientes, pacientes e históricos de procedimentos de forma automatizada para facilitar a transição da clínica para este novo sistema.

## 6. Assistente Inteligente (IA)
- Um chatbot/assistente integrado diretamente no sistema para apoiar a equipe médica e de recepção.
- Pode ajudar na sugestão de respostas para clientes no WhatsApp, na revisão de protocolos ou na rápida consulta de informações.

## 7. Dashboard (Inteligência de Negócios)
- Painel analítico gerencial focado em métricas vitais da clínica.
- Visualização gráfica de faturamento, quantidade de atendimentos, taxa de retorno, entrada de novos clientes e indicadores de produtividade da equipe.

## 8. Configurações e Console de Administração
- **Gestão de Perfil:** Configuração de dados da conta e preferências do usuário logado.
- **Admin Console:** Gerenciamento da clínica como um todo, criação e bloqueio de usuários da equipe, definição de níveis de acesso (Profissional, Recepção, Gestor) e personalizações globais do sistema.
- **Integração de Autenticação:** Login seguro, gerenciamento de sessão e proteção de rotas integrados ao Firebase Auth.

---
**Arquitetura e Tecnologias Utilizadas:**
- **Frontend:** React 18 com TypeScript, estruturado via Vite.
- **Estilização:** Tailwind CSS (com integração do PostCSS) e ícones via Lucide React.
- **Backend/Banco de Dados:** Google Firebase (Authentication e Firestore) operando de forma Serverless e em tempo real.
- **Integração de IA:** Google GenAI (`@google/genai`).
- **Manipulação de Dados:** Utiliza `date-fns` para lidar com agendamentos/datas e `papaparse` para a leitura eficiente e importação dos arquivos CSV/Excel oriundos de sistemas anteriores.
