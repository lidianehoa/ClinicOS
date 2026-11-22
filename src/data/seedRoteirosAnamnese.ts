// Semente Oficial de 30 Roteiros de Anamnese Veterinária Especializada
// Baseado no "Kit de Anamnese Veterinária — 30 Roteiros"

export interface RoteiroCampo {
  id: string;
  pergunta: string;
  tipo: "sim_nao_naosei" | "texto" | "opcoes" | "checklist";
  opcoes?: string[];
  placeholder?: string;
  notaExplicativa?: string;
}

export interface RoteiroSecao {
  titulo: string;
  campos: RoteiroCampo[];
}

export interface RoteiroAnamnese {
  id: string;
  ordem: number;
  nome: string;
  semiologia?: string;
  secoes: RoteiroSecao[];
  naoEsqueca: string[];
  objetivo: string;
  tenantId?: string;
}

export const SEED_ROTEIROS_ANAMNESE: RoteiroAnamnese[] = [
  {
    "id": "roteiro_01",
    "ordem": 1,
    "nome": "Vômito / Êmese",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Frequência",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Nº de episódios por dia",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "O que é eliminado?",
            "tipo": "opcoes",
            "opcoes": [
              "Alimento",
              "Espuma-branco",
              "Água",
              "Muco",
              "Sangue",
              "Outro"
            ],
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Relação com alimentação?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Náusea antes do vômito?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "É vômito ou regurgitação?",
            "tipo": "sim_nao_naosei",
            "notaExplicativa": "regurgitação ocorre logo após comer, sem náusea, com alimento não digerido",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "náusea pode se manifestar por salivação, lambedura de lábios, inquietação, engasgos)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Mudança na alimentação",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Acesso a lixo/restos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Ingestão de plantas/produtos tóxicos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Possível ingestão de corpo estranho",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Uso de medicamentos/suplementos (quais?)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Vacinação e vermifugação em dia",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Diarreia",
              "Inapetência",
              "Apatia/Prostração",
              "Dor abdominal",
              "Aumento da sede",
              "Aumento da micção",
              "Febre",
              "Perda de peso",
              "Tosse/Engasgo",
              "Salivação excessiva",
              "Tremores",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios anteriores de vômito",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Mudança recente de ambiente/contato com outros animais/viagens",
      "Petiscos/alimentos caseiros/ossos",
      "Fezes normais ou alteradas",
      "Medicações administradas pelo tutor antes da consulta",
      "Último cio (fêmeas)/reprodutivo ativo"
    ],
    "objetivo": "Identificar a causa do vômito e sua gravidade para conduzir melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_02",
    "ordem": 2,
    "nome": "Diarreia",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Frequência",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Nº de evacuações/dia",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Consistência (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Há sangue?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há muco?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Grande ou pequeno volume? (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Cor alterada? (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Há urgência/tenesmo?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "O animal evacua dentro de casa?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Vômito",
              "Perda de peso",
              "Inapetência",
              "Sangue nas fezes",
              "Apatia/Prostração",
              "Muco",
              "Dor abdominal",
              "Flatulência",
              "Desidratação",
              "Tremores",
              "Febre",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Alimentação habitual",
      "Petiscos/comida caseira",
      "Fezes anteriores normais",
      "Medicações dadas antes da consulta",
      "Contato com filhotes/outros animais"
    ],
    "objetivo": "Caracterizar a diarreia e sua possível origem para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_03",
    "ordem": 3,
    "nome": "Prurido / Lesões de Pele",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Frequência/intensidade",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Onde começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Prurido veio antes da lesão?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Lesões localizadas ou generalizadas?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há sazonalidade?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "O animal coça, lambe ou morde?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Há queda de pelo?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Há odor ou secreção?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Alopecia",
              "Eritema",
              "Crostas",
              "Pápulas/pústulas",
              "Otite",
              "Mau odor",
              "Lambedura",
              "Descamação",
              "Hiperpigmentação",
              "Dor",
              "Apatia",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Ectoparasitas",
      "Alimentação/petiscos",
      "Otite recorrente",
      "Pessoas ou animais com lesões",
      "Resposta a corticoide/medicações anteriores"
    ],
    "objetivo": "Organizar a anamnese dermatológica para investigar melhor a origem do prurido e das lesões."
  },
  {
    "id": "roteiro_04",
    "ordem": 4,
    "nome": "Alteração Urinária",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Frequência urinária",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Há esforço para urinar?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Há sangue?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Micção em maior/menor volume?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "O animal faz força?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Há dor/vocalização?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Urina em locais diferentes?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Gotas ou jato normal?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Há lambedura da região genital?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Polaciúria",
              "Estrangúria",
              "Hematúria",
              "Inapetência",
              "Apatia/Prostração",
              "Dor abdominal",
              "Vômito",
              "Febre",
              "Obstrução/suspeita",
              "Lamber genitais",
              "Urinar fora do lugar",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Água ingerida",
      "Dieta urinária",
      "Cálculos prévios",
      "Medicação antes da consulta",
      "Estresse/alteração de ambiente"
    ],
    "objetivo": "Investigar alterações no padrão de micção e sinais compatíveis com distúrbios urinários."
  },
  {
    "id": "roteiro_05",
    "ordem": 5,
    "nome": "Poliúria / Polidipsia",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Aumento da água ingerida",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Aumento da micção",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Bebe mais água?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Urina em maior volume?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Urina em locais incomuns?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "O apetite mudou?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Houve perda de peso?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Há incontinência?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "O tutor quantifica o consumo de água?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Polifagia",
              "Emagrecimento",
              "Letargia",
              "Vômito",
              "Diarreia",
              "Incontinência",
              "Febre",
              "Alteração comportamental",
              "Odor urinário",
              "Infecções recorrentes",
              "Apatia",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Quantidade de água",
      "Uso de corticoides",
      "Dieta atual",
      "Peso recente",
      "Castração/ciclo"
    ],
    "objetivo": "Organizar a investigação inicial de aumento de sede e aumento da micção."
  },
  {
    "id": "roteiro_06",
    "ordem": 6,
    "nome": "Inapetência / Perda de Peso",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Apetite reduzido ou ausente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Perda de peso perceptível",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Parou totalmente de comer?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Recusa ração/petiscos/ambos?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há dificuldade para mastigar?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Bebe água normalmente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Perdeu peso rápido ou gradual?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "O apetite varia durante o dia?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Há seletividade alimentar recente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Vômito",
              "Tosse",
              "Diarreia",
              "Desidratação",
              "Apatia/Prostração",
              "Febre",
              "Dor abdominal",
              "Fraqueza",
              "Halitose",
              "Perda muscular",
              "Regurgitação",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Mudança de dieta",
      "Dor oral/dentária",
      "Água ingerida",
      "Fezes e urina normais",
      "Medicações dadas antes da consulta"
    ],
    "objetivo": "Caracterizar a inapetência ou perda de peso para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_07",
    "ordem": 7,
    "nome": "Tosse / Alteração Respiratória",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Frequência",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Piora em exercício/noite",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Tosse seca ou produtiva?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Há secreção nasal?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há dispneia?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Há intolerância ao exercício?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "A tosse parece engasgo?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "O animal respira com esforço?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Piora ao puxar guia/colar?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Espirros",
              "Secreção nasal",
              "Febre",
              "Letargia",
              "Cianose",
              "Síncope",
              "Intolerância ao exercício",
              "Gemidos respiratórios",
              "Inapetência",
              "Vômito/engasgo",
              "Tremores",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Vacinação",
      "Contato com animais",
      "Uso de colar/guia",
      "Cardíaco prévio",
      "Exposição à fumaça"
    ],
    "objetivo": "Organizar a anamnese respiratória para diferenciar melhor a natureza da tosse e de outras alterações respiratórias."
  },
  {
    "id": "roteiro_08",
    "ordem": 8,
    "nome": "Claudicação / Dor",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Membro/região afetada",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Agudo ou crônico?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Houve trauma/queda?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Apoia o membro?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "A dor piora ao se movimentar?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Há rigidez ao levantar?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "A claudicação é constante ou intermitente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "O animal evita escadas/pulos?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Há vocalização?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Edema",
              "Calor local",
              "Rigidez",
              "Crepitação",
              "Apoio reduzido",
              "Fraqueza",
              "Perda muscular",
              "Dor ao toque",
              "Prostração",
              "Tremores",
              "Febre",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Trauma recente",
      "Escadas/pulos",
      "Piso escorregadio",
      "Medicação antes da consulta",
      "Dor ao se levantar"
    ],
    "objetivo": "Investigar a origem da dor ou claudicação para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_09",
    "ordem": 9,
    "nome": "Alteração Ocular",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Qual olho?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Dor ou desconforto?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Há secreção?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Coça o olho?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há blefaroespasmo?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Há fotofobia?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Percebe mudança de visão?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Trauma recente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Uso de colírios/medicações (especifique)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_8",
            "pergunta": "Exposição a produtos/poeira?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Lacrimejamento",
              "Hiperemia",
              "Opacidade",
              "Edema",
              "Secreção",
              "Prurido",
              "Protrusão",
              "Dor",
              "Fotofobia",
              "Assimetria",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Trauma recente",
      "Uso de colírio",
      "Visão mudou?",
      "Secreção?",
      "Banho/tosa recente"
    ],
    "objetivo": "Organizar a investigação inicial de alterações oculares para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_10",
    "ordem": 10,
    "nome": "Alteração de Ouvido",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Qual ouvido?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Dor ou prurido?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Há odor?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Há secreção?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Balança a cabeça?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Dor à manipulação?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Coça a orelha?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Banho/natação recente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Limpeza frequente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_8",
            "pergunta": "Tratamento anterior? (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Eritema",
              "Mau odor",
              "Secreção",
              "Crostas",
              "Edema",
              "Dor",
              "Inclinação de cabeça",
              "Desequilíbrio",
              "Prurido",
              "Feridas",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Banho recente",
      "Otite anterior",
      "Coça a pele?",
      "Medicação antes da consulta",
      "Mau odor"
    ],
    "objetivo": "Organizar a investigação inicial das alterações de ouvido para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_11",
    "ordem": 11,
    "nome": "Convulsão / Alteração Neurológica",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando ocorreu",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Duração",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Frequência",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "É a primeira vez?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Houve perda de consciência?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Houve micção/defecação no episódio?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Como ficou após o episódio?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Houve trauma?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Possível intoxicação?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Medicações em uso? (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_8",
            "pergunta": "Há desorientação?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Ataxia",
              "Tremores",
              "Nistagmo",
              "Paresia",
              "Vocalização",
              "Cegueira",
              "Desorientação",
              "Alteração comportamental",
              "Febre",
              "Fraqueza",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Primeira vez?",
      "Pós-episódio como ficou?",
      "Trauma?",
      "Acesso a tóxicos?",
      "Medicações em uso?"
    ],
    "objetivo": "Organizar a investigação inicial de convulsões e alterações neurológicas para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_12",
    "ordem": 12,
    "nome": "Consulta Preventiva / Check-up",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Idade?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Motivo da visita?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Há alterações percebidas pelo tutor? (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Rotina geral? (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Vacinação em dia?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Vermifugação em dia?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Controle de ectoparasitas?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Alimentação atual? (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Fezes e urina normais?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Medicações contínuas?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Castrado(a)?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_8",
            "pergunta": "Histórico reprodutivo/cio? (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Peso",
              "Escore corporal",
              "Pele/pelo",
              "Cavidade oral",
              "Ouvidos",
              "Olhos",
              "Comportamento",
              "Mobilidade",
              "Digestivo",
              "Urinário",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Episódios anteriores",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Tratamentos/monitoramentos atuais",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Vacinas em dia?",
      "Vermífugo?",
      "Controle de pulgas/carrapatos?",
      "Dieta atual?",
      "Fezes e urina normais?"
    ],
    "objetivo": "Organizar a consulta preventiva para orientar melhor o exame físico, a identificação de riscos e os próximos passos."
  },
  {
    "id": "roteiro_13",
    "ordem": 13,
    "nome": "Apatia / Prostração / Fraqueza",
    "semiologia": "estado geral/fraqueza",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Início",
            "tipo": "opcoes",
            "opcoes": [
              "Súbito",
              "Gradual"
            ],
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Duração",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Pior horário",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Contexto em que foi percebido (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Trauma recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Exercício intenso",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Calor excessivo",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Contato com toxinas",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Medicamentos recentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Vacinação recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Acesso à rua",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_8",
            "pergunta": "Ectoparasitas",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Inapetência",
              "Vômito",
              "Diarreia",
              "Tosse",
              "Dificuldade respiratória",
              "Dor",
              "Tremores",
              "Desmaio/colapso",
              "Febre percebida"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Doenças prévias, Cirurgias recentes, Cardiopatia, Endocrinopatias, Anemia prévia, Idade avançada, Mudança de rotina",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Como estão água, urina e fezes?",
      "Comeu normalmente?",
      "Está conseguindo andar?",
      "Está vocalizando de dor?"
    ],
    "objetivo": "Investigar causas de apatia, prostração ou fraqueza para conduzir melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_14",
    "ordem": 14,
    "nome": "Constipação / Dificuldade para Evacuar",
    "semiologia": "constipação/disquesia",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Há quantos dias?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Redução na frequência?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Faz força?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Elimina pequena quantidade?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Fezes ressecadas?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_6",
            "pergunta": "Episódio agudo ou recorrente?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Mudança de dieta",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Ingestão de ossos/corpo estranho",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Baixa ingestão de água",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Sedentarismo",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Acesso à caixa de areia/local de eliminação",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Trauma pélvico",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Medicamentos (quais?)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Tenesmo",
              "Vômito",
              "Inapetência",
              "Distensão abdominal",
              "Dificuldade para urinar",
              "Perda de peso",
              "Dor abdominal",
              "Prostração"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Episódios anteriores",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Cirurgias",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Doenças ortopédicas/neurológicas",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_4",
            "pergunta": "Hérnia perineal?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_5",
            "pergunta": "Megacólon prévio?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_6",
            "pergunta": "Vermifugação",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_7",
            "pergunta": "Dieta habitual",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Quando evacuou normalmente pela última vez?",
      "Está urinando?",
      "Comeu normalmente?",
      "Houve ingestão de ossos/objetos?"
    ],
    "objetivo": "Investigar a origem da dor ou constipação para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_15",
    "ordem": 15,
    "nome": "Massa / Nódulo / Caroço",
    "semiologia": "aumento de volume/nódulo",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Onde está localizado?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Quando percebeu?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Tamanho aproximado?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Crescimento",
            "tipo": "opcoes",
            "opcoes": [
              "Rápido",
              "Lento"
            ],
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Único ou múltiplo?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Trauma no local",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Picada/mordida",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Aplicação recente no local",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Contato com outros animais",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Acesso à rua",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Exposição solar no local",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Prurido no local",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Perda de peso",
              "Apatia",
              "Sangramento",
              "Dor",
              "Linfonodos aumentados",
              "Prurido",
              "Alteração de pele",
              "Dificuldade para locomover/mastigar dependendo do local"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Já teve nódulos semelhantes antes?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Cirurgias anteriores?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Histórico de neoplasias?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_4",
            "pergunta": "Medicações em uso (quais)?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_5",
            "pergunta": "Vacinação/injeções recentes?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_6",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Está aumentando?",
      "Mudou de cor?",
      "Sangrou?",
      "Interfere na rotina?",
      "Há outros nódulos?"
    ],
    "objetivo": "Investigar a origem do aumento de volume para conduzir melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_16",
    "ordem": 16,
    "nome": "Alteração Oral / Halitose / Dificuldade para Mastigar",
    "semiologia": "cavidade oral",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Início",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Hálito forte?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Dor ao mastigar?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Alimento cai da boca?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_6",
            "pergunta": "Salivação aumentada?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_7",
            "pergunta": "Sangramento oral?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Roeu objeto/osso",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Trauma oral recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Troca de alimento recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Brinquedos duros",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Procedimento dentário recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Contato com produtos químicos",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Halitose intensa",
              "Sialorreia",
              "Gengivorragia",
              "Edema facial",
              "Espirros",
              "Secreção nasal",
              "Perda de peso",
              "Apatia"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Doença periodontal?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Limpeza dentária prévia?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Fraturas dentárias?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_4",
            "pergunta": "Doenças sistêmicas?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_5",
            "pergunta": "Medicações em uso?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_6",
            "pergunta": "Vacinação em dia?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Consegue beber água?",
      "Tem preferência alimentar?",
      "Já houve sangramento?",
      "Há dificuldade para abrir a boca?"
    ],
    "objetivo": "Investigar a origem da dor ou alteração oral para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_17",
    "ordem": 17,
    "nome": "Disfagia / Dificuldade para Engolir",
    "semiologia": "deglutição",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Início",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Súbito ou gradual?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Com sólido/líquido/ambos?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Intermitente ou constante?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Piora progressiva?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Corpo estranho",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Trauma",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Ingestão de osso",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Acesso a objetos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Procedimento recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Exposição a tóxicos/cáusticos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Alteração após medicação",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Sialorreia",
              "Halitose",
              "Vômito/regurgitação",
              "Perda de peso",
              "Inapetência",
              "Secreção nasal",
              "Dispneia",
              "Apatia"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Episódios prévios",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Doenças orais",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Neurológicas ou esofágicas",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_4",
            "pergunta": "Cirurgias",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_5",
            "pergunta": "Alimentação habitual",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_6",
            "pergunta": "Medicações em uso",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "É com alimento, água ou ambos?",
      "Desde quando?",
      "Houve engasgo?",
      "Está conseguindo comer algo?"
    ],
    "objetivo": "Investigar a origem da disfagia para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_18",
    "ordem": 18,
    "nome": "Distensão / Aumento Abdominal",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando percebeu?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Início súbito ou gradual?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Aumento progressivo?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Barriga dura ou flácida?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Constante ou intermitente?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Refeição grande recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Trauma recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Gestação?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Ingestão de objetos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Dieta atual (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Vermifugação em dia",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Histórico de doença hepática/cardíaca",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_8",
            "pergunta": "Acesso a lixo/restos",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Vômito",
              "Diarreia",
              "Inapetência",
              "Dificuldade para urinar",
              "Dificuldade para evacuar",
              "Dispneia",
              "Fraqueza",
              "Perda de peso",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Episódios prévios de distensão",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Cirurgias anteriores (quais?)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Ascite/torção/GDV prévia?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_4",
            "pergunta": "Doenças endócrinas (Cushing, hipotiroidismo)?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_5",
            "pergunta": "Uso de medicações (quais)?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_6",
            "pergunta": "Cio/reprodução (fêmeas)?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Houve dor súbita?",
      "Está urinando?",
      "Está evacuando?",
      "O aumento foi rápido?",
      "Houve trauma?"
    ],
    "objetivo": "Investigar a origem da distensão abdominal para orientar melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_19",
    "ordem": 19,
    "nome": "Polifagia / Aumento do Apetite",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Aumento súbito ou gradual?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Fome constante?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Pede mais comida?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Rouba alimento?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_6",
            "pergunta": "Come mais e",
            "tipo": "opcoes",
            "opcoes": [
              "Mantém",
              "Perde",
              "Ganha peso"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Mudança de dieta",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Uso de petiscos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Competição com outros animais",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Aumento de exercício",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Uso de corticoide",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Vermifugação recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Acesso à rua",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Poliúria",
              "Polidipsia",
              "Vômito",
              "Diarreia",
              "Perda de peso",
              "Ganho de peso",
              "Apatia",
              "Alteração de pelagem"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Castração",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Endocrinopatias",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Parasitas",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_4",
            "pergunta": "Mudanças de rotina",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_5",
            "pergunta": "Medicações em uso",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_6",
            "pergunta": "Doenças prévias",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Quanto come por dia?",
      "Mudou de peso?",
      "Bebe mais água?",
      "Há acesso a outros alimentos?",
      "Alguém alimenta furtivamente?"
    ],
    "objetivo": "Identificar possíveis causas de polifagia e apetite aumentado para conduzir melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_20",
    "ordem": 20,
    "nome": "Ganho de Peso / Obesidade",
    "semiologia": "condição corporal",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando percebeu?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Ganho de peso",
            "tipo": "opcoes",
            "opcoes": [
              "Rápido",
              "Gradual"
            ],
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Peso estimado",
            "tipo": "opcoes",
            "opcoes": [
              "antes",
              "agora, kg"
            ],
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Mudança de escore corporal",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Aumento de circunferência abdominal?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Quantidade de alimento",
            "tipo": "opcoes",
            "opcoes": [
              "Adequada",
              "Excesso"
            ],
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Petiscos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Alimentação ad libitum",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Restos de comida",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Castrado?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Sedentarismo",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Uso de corticoides",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_8",
            "pergunta": "Ambiente  — cada item com campo de Observações",
            "tipo": "opcoes",
            "opcoes": [
              "Interno",
              "Externo",
              "Misto"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Polifagia",
              "Polidipsia",
              "Intolerância ao exercício",
              "Dor locomotora",
              "Constipação",
              "Dermatopatias de dobra",
              "Apatia",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Peso anterior",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Tentativas de emagrecimento",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Doenças endócrinas conhecidas",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_4",
            "pergunta": "Medicações em uso",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_5",
            "pergunta": "Rotina de passeios/atividades",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_6",
            "pergunta": "Composição familiar",
            "tipo": "opcoes",
            "opcoes": [
              "nº pessoas",
              "crianças",
              "outros animais"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Quantas refeições faz?",
      "Quem oferece petiscos?",
      "Houve mudança após castração?",
      "Houve redução de atividade?"
    ],
    "objetivo": "Investigar causas do ganho de peso/obesidade para conduzir melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_21",
    "ordem": 21,
    "nome": "Alteração Comportamental",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Que mudança foi percebida? (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Início",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Frequência",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Gatilho aparente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_5",
            "pergunta": "Súbito ou gradual?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_6",
            "pergunta": "Pior horário",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_7",
            "pergunta": "Pior ambiente",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Mudança de casa/rotina",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Chegada de pessoas/animais",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Estresse",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Trauma",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Punições",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Medicações",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Acesso à rua",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_2_8",
            "pergunta": "Enriquecimento ambiental adequado",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Dor",
              "Inapetência",
              "Alterações de sono",
              "Compulsões (comportamentos repetitivos)",
              "Lambedura excessiva",
              "Prurido",
              "Convulsões",
              "Déficits sensoriais (visão/audição/olfato)"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_4_1",
            "pergunta": "Castração",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_2",
            "pergunta": "Idade geriátrica?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_3",
            "pergunta": "Doenças neurológicas/dermatológicas/dolorosas?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_4",
            "pergunta": "Treinamento prévio?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_4_5",
            "pergunta": "Histórico de ansiedade/agressividade?",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Houve mudança recente de rotina?",
      "Em quais situações acontece?",
      "Há risco para pessoas/animais?",
      "Há vídeos do episódio?"
    ],
    "objetivo": "Investigar a origem da alteração comportamental para conduzir melhor o exame físico e os próximos passos."
  },
  {
    "id": "roteiro_22",
    "ordem": 22,
    "nome": "Desconforto Perianal / Arrastar no Chão",
    "semiologia": "região perianal/cólon distal",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Frequência?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "O animal arrasta no chão?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Lambe a região anal?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Tem dor ao sentar?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há odor forte?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Existe secreção?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Há dificuldade para evacuar?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Coceira intensa?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Região afetada/lateralidade (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Diarreia recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Constipação recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Mudança alimentar",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Vermifugação em dia",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Banho/tosa recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Contato com fezes/lixo",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Edema",
              "Vermelhidão",
              "Dor",
              "Secreção",
              "Sangramento",
              "Esforço para evacuar",
              "Lambedura excessiva",
              "Mau odor",
              "Nódulo/inchaço",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "padrão",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Glândulas anais já inflamaram?",
      "Fezes normais ou ressecadas?",
      "Vermífugo recente?",
      "Mudança na dieta?",
      "Dor ao sentar ou defecar?"
    ],
    "objetivo": "Investigar causas de desconforto perianal para orientar exame físico e próximos passos."
  },
  {
    "id": "roteiro_23",
    "ordem": 23,
    "nome": "Trauma / Atropelamento / Queda",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando ocorreu?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Tipo de evento?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Altura/velocidade/impacto (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Perdeu a consciência?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Consegue andar?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há dor intensa?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Há sangramento visível?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Houve vômito após o trauma?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "O animal foi manipulado após o evento?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Local mais afetado (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Queda de altura",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Atropelamento",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Briga/mordida",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Trauma por objeto",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Acesso à rua",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Uso de medicações prévias",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Claudicação",
              "Dispneia",
              "Sangramento",
              "Prostração",
              "Abdômen distendido",
              "Paralisia/paresia",
              "Fratura suspeita",
              "Dor à palpação",
              "Ferida aberta",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios traumáticos prévios",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "O evento foi visto?",
      "Tempo até o atendimento?",
      "Urina/fezes após o trauma?",
      "Medicação já administrada?",
      "Mudança de comportamento?"
    ],
    "objetivo": "Identificar gravidade, sistemas possivelmente acometidos e urgência do caso traumático."
  },
  {
    "id": "roteiro_24",
    "ordem": 24,
    "nome": "Corpo Estranho / Ingestão de Objeto",
    "semiologia": "corpo estranho/ingestão de objeto",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando houve suspeita?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Objeto suspeito?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Quantidade/tamanho?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Tutor viu a ingestão?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Há vômito?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há engasgo/disfagia?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Há dor abdominal?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Consegue comer/beber?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Eliminou fezes normalmente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Tipo de objeto (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Acesso a brinquedos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Acesso a tecido/meias",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Acesso a ossos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Lixo/objetos pequenos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Histórico prévio de ingestão",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Uso de medicações em casa",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Vômito",
              "Diarreia",
              "Inapetência",
              "Salivação",
              "Regurgitação",
              "Dor abdominal",
              "Esforço para evacuar",
              "Letargia",
              "Distensão abdominal",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios anteriores",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Horário provável da ingestão?",
      "Qual objeto exatamente?",
      "Houve vômito do objeto?",
      "Defecou após o evento?",
      "Tentaram induzir vômito?"
    ],
    "objetivo": "Triar risco de obstrução, perfuração ou irritação gastrointestinal por corpo estranho."
  },
  {
    "id": "roteiro_25",
    "ordem": 25,
    "nome": "Suspeita de Intoxicação / Exposição Tóxica",
    "semiologia": "intoxicação/envenenamento",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando ocorreu?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Substância suspeita?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Via de exposição?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Tutor viu a exposição?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Há vômito?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há tremores/convulsão?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Houve contato cutâneo?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Há salivação intensa?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Apresenta dificuldade respiratória?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Quantidade/dose suspeita (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Medicamentos humanos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Produtos de limpeza",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Plantas tóxicas",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Inseticidas/rodenticidas",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Alimentos tóxicos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Uso de medicações veterinárias recentes",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Vômito",
              "Diarreia",
              "Ataxia",
              "Tremores",
              "Convulsão",
              "Midríase/miose",
              "Dispneia",
              "Fraqueza",
              "Mucosas alteradas",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios prévios de intoxicação",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Produto embalado disponível?",
      "Tempo desde a exposição?",
      "Houve indução de vômito?",
      "Contato com pele/olhos?",
      "Mais de um animal exposto?"
    ],
    "objetivo": "Identificar agente suspeito, gravidade e necessidade de atendimento imediato em casos de intoxicação."
  },
  {
    "id": "roteiro_26",
    "ordem": 26,
    "nome": "Reação Alérgica Aguda / Edema Facial",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Início súbito?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Possível gatilho? (texto)",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Há edema facial?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Há urticária/prurido?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Teve vacina recente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Houve picada/inseto?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Dificuldade respiratória?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Vômito/diarreia associados?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Exposição suspeita (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Medicamento recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Alimento novo",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Picada de inseto",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Vacinação recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Produto tópico recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Contato ambiental diferente",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Edema facial",
              "Prurido",
              "Eritema",
              "Urticária",
              "Dispneia",
              "Salivação",
              "Vômito",
              "Diarreia",
              "Prostração",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios alérgicos anteriores",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Vacina ou medicação recentes?",
      "Picada observada?",
      "Alimento novo?",
      "Sinais respiratórios?",
      "Episódios prévios semelhantes?"
    ],
    "objetivo": "Reconhecer rapidamente possíveis reações de hipersensibilidade e sinais de urgência."
  },
  {
    "id": "roteiro_27",
    "ordem": 27,
    "nome": "Sangramento Espontâneo / Hematomas",
    "semiologia": "sangramento/distúrbios hemorrágicos",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Local do sangramento?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Quantidade?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Houve trauma evidente?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Há sangramento nasal/oral?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há sangue na urina/fezes?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Aparecem hematomas?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Há sangramento contínuo?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Uso de medicação anticoagulante?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Locais afetados (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Rodenticida/veneno",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Trauma recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Cirurgia/procedimento recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Picadas/carrapatos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Uso de AINE/corticoide",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Contato com tóxicos",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Palidez",
              "Fraqueza",
              "Petéquias",
              "Equimoses",
              "Melena",
              "Hematoquezia",
              "Hematúria",
              "Epistaxe",
              "Gengivorragia",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios anteriores",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Houve trauma ou cirurgia?",
      "Usa medicação?",
      "Carrapatos recentes?",
      "Sangra em outros locais?",
      "Mucosas estão pálidas?"
    ],
    "objetivo": "Identificar origem e gravidade de sangramento espontâneo ou presença de hematomas."
  },
  {
    "id": "roteiro_28",
    "ordem": 28,
    "nome": "Mucosas Pálidas",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando foi percebido?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Súbito ou gradual?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Onde foi observado?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Há fraqueza/prostração?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Há perda de sangue visível?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Respiração acelerada?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Exercício intolerante?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Houve desmaio?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Tutor percebe gengiva muito clara?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Coloração observada (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Trauma recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Parasitas/carrapatos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Sangramento conhecido",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Cirurgia recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Uso de medicações",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Doença crônica prévia",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Taquipneia",
              "Taquicardia",
              "Fraqueza",
              "Síncope",
              "Anorexia",
              "Letargia",
              "Sangramento",
              "Icterícia",
              "Febre",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios anteriores",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Cor das mucosas em casa?",
      "Carrapatos recentes?",
      "Perda de sangue?",
      "Uso de remédios?",
      "Apetite e disposição?"
    ],
    "objetivo": "Auxiliar a triagem de possíveis causas de palidez, anemia ou hipoperfusão."
  },
  {
    "id": "roteiro_29",
    "ordem": 29,
    "nome": "Icterícia / Mucosas Amareladas",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando foi percebido?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Onde foi observado?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Início súbito ou gradual?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Urina escura?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Fezes alteradas?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Vômito/diarreia?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Perda de apetite?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Dor abdominal?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Contato com tóxicos?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Regiões amareladas observadas (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Uso de medicamentos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Carrapatos/hemoparasitas",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Doença hepática prévia",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Toxinas/alimentos",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Cirurgia recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Contato com água parada/leptospirose",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Apatia",
              "Anorexia",
              "Vômito",
              "Diarreia",
              "Febre",
              "Urina escura",
              "Dor abdominal",
              "Mucosas pálidas",
              "Desidratação",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios anteriores",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Urina mudou de cor?",
      "Contato com carrapatos?",
      "Remédios recentes?",
      "Apetite e vômito?",
      "Dor abdominal?"
    ],
    "objetivo": "Organizar a investigação inicial de icterícia e sinais sistêmicos associados."
  },
  {
    "id": "roteiro_30",
    "ordem": 30,
    "nome": "Corrimento Vaginal / Alteração Reprodutiva",
    "semiologia": "sistema reprodutivo feminino",
    "secoes": [
      {
        "titulo": "Caracterize o Episódio / Quadro",
        "campos": [
          {
            "id": "campo_1_1",
            "pergunta": "Quando começou?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_2",
            "pergunta": "Tipo de secreção?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_3",
            "pergunta": "Quantidade?",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_1_4",
            "pergunta": "Como evoluiu desde o início?",
            "tipo": "opcoes",
            "opcoes": [
              "Piora progressiva",
              "Melhora gradual",
              "Quadro estável",
              "Intermitente (vai e volta)"
            ],
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Características do Quadro",
        "campos": [
          {
            "id": "campo_2_1",
            "pergunta": "Está no cio?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_2",
            "pergunta": "Foi castrada?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_3",
            "pergunta": "Há odor forte?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_4",
            "pergunta": "Há apatia/febre?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_5",
            "pergunta": "Bebe mais água?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_6",
            "pergunta": "Há esforço para urinar?",
            "tipo": "sim_nao_naosei",
            "placeholder": ""
          },
          {
            "id": "campo_2_7",
            "pergunta": "Cor do corrimento (texto)",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Investigue Exposições e Contexto",
        "campos": [
          {
            "id": "campo_3_1",
            "pergunta": "Cobertura/monta recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_2",
            "pergunta": "Uso de anticoncepcional",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_3",
            "pergunta": "Parto recente",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_4",
            "pergunta": "Pseudociese",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_5",
            "pergunta": "Doença uterina prévia",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_3_6",
            "pergunta": "Uso de medicações recentes",
            "tipo": "texto",
            "placeholder": ""
          }
        ]
      },
      {
        "titulo": "Sinais Associados",
        "campos": [
          {
            "id": "sinais_associados",
            "pergunta": "Sinais Associados Observados",
            "tipo": "checklist",
            "opcoes": [
              "Poliúria/polidipsia",
              "Vômito",
              "Apatia",
              "Febre",
              "Anorexia",
              "Dor abdominal",
              "Lambedura vulvar",
              "Sangramento",
              "Corrimento purulento",
              "Outros"
            ]
          },
          {
            "id": "sinais_obs",
            "pergunta": "Observações Adicionais dos Sinais",
            "tipo": "texto",
            "placeholder": "Detalhes adicionais sobre os sintomas..."
          }
        ]
      },
      {
        "titulo": "Histórico Relevante e Manejo",
        "campos": [
          {
            "id": "campo_5_1",
            "pergunta": "Doenças pré-existentes",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_2",
            "pergunta": "Episódios anteriores",
            "tipo": "texto",
            "placeholder": ""
          },
          {
            "id": "campo_5_3",
            "pergunta": "Resposta ao tratamento anterior",
            "tipo": "opcoes",
            "opcoes": [
              "Melhorou",
              "Não mudou",
              "Piorou",
              "Não se aplica"
            ],
            "placeholder": ""
          }
        ]
      }
    ],
    "naoEsqueca": [
      "Último cio?",
      "Castrada ou inteira?",
      "Monta/gestação recente?",
      "Uso de hormônios?",
      "Aumento de sede/apatia?"
    ],
    "objetivo": "Organizar a triagem inicial de corrimento vaginal e alterações reprodutivas em fêmeas."
  }
];

/**
 * Transforma as respostas estruturadas de um roteiro de anamnese em um resumo corrido,
 * natural e profissional em português brasileiro para o campo Sintomas Principais.
 */
export function gerarResumoAnamnese(
  roteiro: RoteiroAnamnese,
  respostas: Record<string, any>
): string {
  const blocos: string[] = [];

  // 1. Caracterização do Episódio / Introdução
  const secaoEpisodio = roteiro.secoes.find(s => s.titulo.toLowerCase().includes("caracterize"));
  const frasesIntro: string[] = [];

  if (secaoEpisodio) {
    let quando = "";
    let freq = "";
    let numEpisodios = "";
    let evolucao = "";
    const extras: string[] = [];

    secaoEpisodio.campos.forEach(c => {
      const val = respostas[c.id];
      if (!val) return;
      const perg = c.pergunta.toLowerCase();
      if (perg.includes("quando começou") || perg.includes("início")) quando = String(val);
      else if (perg.includes("nº de episódios") || perg.includes("número de episódios")) numEpisodios = String(val);
      else if (perg.includes("frequência") || perg.includes("duração")) freq = String(val);
      else if (perg.includes("evolu") || c.tipo === "opcoes") evolucao = String(val);
      else extras.push(`${c.pergunta}: ${val}`);
    });

    let frasePrincipal = `Quadro de ${roteiro.nome}`;
    if (quando) frasePrincipal += ` iniciado há ${quando}`;
    if (freq) frasePrincipal += `, frequência de ${freq}`;
    if (numEpisodios) frasePrincipal += ` (${numEpisodios} episódios/dia)`;
    if (evolucao) frasePrincipal += `, com evolução em ${evolucao.toLowerCase()}`;
    frasePrincipal += ".";

    frasesIntro.push(frasePrincipal);
    if (extras.length > 0) frasesIntro.push(extras.join("; ") + ".");
  } else {
    frasesIntro.push(`Queixa principal: ${roteiro.nome}.`);
  }
  if (frasesIntro.length > 0) blocos.push(frasesIntro.join(" "));

  // 2. Características do Quadro
  const secaoCaract = roteiro.secoes.find(s => s.titulo.toLowerCase().includes("característica"));
  if (secaoCaract) {
    const afirmacoes: string[] = [];
    const negacoes: string[] = [];
    const descricoes: string[] = [];

    secaoCaract.campos.forEach(c => {
      const val = respostas[c.id];
      if (val === undefined || val === null || val === "") return;

      if (c.tipo === "sim_nao_naosei") {
        if (val === "sim" || val === "Sim") afirmacoes.push(c.pergunta.replace(/\?$/, ""));
        else if (val === "nao" || val === "Não") negacoes.push(c.pergunta.replace(/\?$/, ""));
      } else if (c.tipo === "checklist" && Array.isArray(val) && val.length > 0) {
        descricoes.push(`${c.pergunta}: ${val.join(", ")}`);
      } else if (val) {
        descricoes.push(`${c.pergunta}: ${val}`);
      }
    });

    const frasesCaract: string[] = [];
    if (descricoes.length > 0) frasesCaract.push(descricoes.join("; ") + ".");
    if (afirmacoes.length > 0) frasesCaract.push(`Presença de: ${afirmacoes.join(", ")}.`);
    if (negacoes.length > 0) frasesCaract.push(`Nega: ${negacoes.join(", ")}.`);
    if (frasesCaract.length > 0) blocos.push(frasesCaract.join(" "));
  }

  // 3. Exposições e Contexto
  const secaoExpo = roteiro.secoes.find(s => s.titulo.toLowerCase().includes("investigue"));
  if (secaoExpo) {
    const exposicoesPositivas: string[] = [];
    const exposicoesNegativas: string[] = [];
    const outrasExpos: string[] = [];

    secaoExpo.campos.forEach(c => {
      const val = respostas[c.id];
      if (val === undefined || val === null || val === "") return;

      if (c.tipo === "sim_nao_naosei") {
        if (val === "sim" || val === "Sim") exposicoesPositivas.push(c.pergunta.replace(/\?$/, ""));
        else if (val === "nao" || val === "Não") exposicoesNegativas.push(c.pergunta.replace(/\?$/, ""));
      } else {
        outrasExpos.push(`${c.pergunta}: ${val}`);
      }
    });

    const frasesExpo: string[] = [];
    if (exposicoesPositivas.length > 0) frasesExpo.push(`Histórico de exposição/risco relatado: ${exposicoesPositivas.join(", ")}.`);
    if (exposicoesNegativas.length > 0) frasesExpo.push(`Sem histórico de: ${exposicoesNegativas.join(", ")}.`);
    if (outrasExpos.length > 0) frasesExpo.push(outrasExpos.join("; ") + ".");
    if (frasesExpo.length > 0) blocos.push(frasesExpo.join(" "));
  }

  // 4. Sinais Associados
  const secaoSinais = roteiro.secoes.find(s => s.titulo.toLowerCase().includes("sinais associados"));
  if (secaoSinais) {
    const sinaisArr = respostas["sinais_associados"] || [];
    const sinaisObs = respostas["sinais_obs"];
    const frasesSinais: string[] = [];

    if (Array.isArray(sinaisArr) && sinaisArr.length > 0) {
      frasesSinais.push(`Sinais associados: ${sinaisArr.join(", ")}.`);
    }
    if (sinaisObs && typeof sinaisObs === "string" && sinaisObs.trim()) {
      frasesSinais.push(`Obs de sinais: ${sinaisObs.trim()}.`);
    }
    if (frasesSinais.length > 0) blocos.push(frasesSinais.join(" "));
  }

  // 5. Histórico Relevante e Manejo
  const secaoHist = roteiro.secoes.find(s => s.titulo.toLowerCase().includes("histórico"));
  if (secaoHist) {
    const partesHist: string[] = [];
    secaoHist.campos.forEach(c => {
      const val = respostas[c.id];
      if (!val) return;
      if (c.tipo === "sim_nao_naosei") {
        if (val === "sim" || val === "Sim") partesHist.push(`Apresenta ${c.pergunta.toLowerCase()}`);
        else if (val === "nao" || val === "Não") partesHist.push(`Sem ${c.pergunta.toLowerCase()}`);
      } else {
        partesHist.push(`${c.pergunta}: ${val}`);
      }
    });
    if (partesHist.length > 0) blocos.push("Histórico relevante: " + partesHist.join("; ") + ".");
  }

  return blocos.join("\n\n");
}
