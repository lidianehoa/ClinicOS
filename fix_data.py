import re

f = 'src/services/dataService.ts'
with open(f, 'r') as file:
    content = file.read()

content = content.replace(
  "status: 'pendente' | 'analisando' | 'analisado' | 'erro';",
  "status: 'pendente' | 'analisando' | 'analisado' | 'erro';\n  resumoCaso?: string;"
)

with open(f, 'w') as file:
    file.write(content)
