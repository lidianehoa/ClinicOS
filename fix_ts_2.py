import re
import os

# 1. PatientTimeline.tsx
f = 'src/components/PatientTimeline.tsx'
with open(f, 'r') as file:
    content = file.read()

content = re.sub(r'date: a\.criadoEm', r'date: a.dataAnalise', content)
content = re.sub(r'status: \'pendente\'\n\s*\}\);', r"status: 'pendente',\n        tenantId: ''\n      });", content)

with open(f, 'w') as file:
    file.write(content)

# 2. ReviewAnaliseModal.tsx
f = 'src/components/ReviewAnaliseModal.tsx'
with open(f, 'r') as file:
    content = file.read()

content = re.sub(r'\{/\* analise\.achados is no longer an array, it is text \*/\}\{analise\.achados as unknown as string\}', r'{analise.interpretacaoClinica}', content)

with open(f, 'w') as file:
    file.write(content)

# 3. CasoClinicoDetail.tsx
f = 'src/pages/medico/CasoClinicoDetail.tsx'
with open(f, 'r') as file:
    content = file.read()

content = re.sub(r'import \{ type AppUser \} from \'../../services/dataService\';\n', r'', content)

with open(f, 'w') as file:
    file.write(content)

# 4. dataService.ts
f = 'src/services/dataService.ts'
with open(f, 'r') as file:
    content = file.read()

content = re.sub(r'b\.criadoEm\.localeCompare\(a\.criadoEm\)', r'b.dataAnalise.localeCompare(a.dataAnalise)', content)

with open(f, 'w') as file:
    file.write(content)

