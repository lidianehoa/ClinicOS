import re

f = 'src/services/dataService.ts'
with open(f, 'r') as file:
    content = file.read()

new_sub = """export const subscribeCasoClinico = (id: string, callback: (caso: CasoClinico | null) => void) => {
  if (!db) return () => {};
  const docRef = doc(casosClinicosCol(), id);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as CasoClinico);
    } else {
      callback(null);
    }
  });
};
"""

content = content.replace(
  "export const subscribeAllCasos",
  new_sub + "\nexport const subscribeAllCasos"
)

with open(f, 'w') as file:
    file.write(content)
