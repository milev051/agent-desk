// Zakazano slanje Gmail nacrta za Agent Desk.
// Radi na Google serverima, pa slanje ne zavisi od uključenog računara.
// Agent napravi nacrt i doda mu oznaku "Zakazano/GGGG-MM-DD SS:MM" (beogradsko vreme).
// Okidač svakih 5 minuta šalje nacrte čije je vreme prošlo, skida oznaku i briše praznu oznaku.
// Postavljanje: script.google.com, nov projekat, nalepi ovaj fajl, pokreni podesi() i odobri pristup.

const KOREN = 'Zakazano/';
const ZONA = 'Europe/Belgrade';

function podesi() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'posaljiZakazane')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('posaljiZakazane').timeBased().everyMinutes(5).create();
  posaljiZakazane();
}

function posaljiZakazane() {
  const sada = new Date();
  const dospele = GmailApp.getUserLabels().filter((oznaka) => {
    const ime = oznaka.getName();
    if (ime.indexOf(KOREN) !== 0) return false;
    try {
      return Utilities.parseDate(ime.slice(KOREN.length), ZONA, 'yyyy-MM-dd HH:mm') <= sada;
    } catch (e) {
      return false;
    }
  });
  if (!dospele.length) return;

  const nacrti = GmailApp.getDrafts();
  dospele.forEach((oznaka) => {
    const niti = oznaka.getThreads().map((nit) => nit.getId());
    nacrti
      .filter((nacrt) => niti.indexOf(nacrt.getMessage().getThread().getId()) !== -1)
      .forEach((nacrt) => {
        try {
          const poslata = nacrt.send();
          poslata.getThread().removeLabel(oznaka);
          console.log('Poslato: ' + poslata.getSubject() + ' (' + oznaka.getName() + ')');
        } catch (e) {
          console.error('Nije poslato (' + oznaka.getName() + '): ' + e);
        }
      });
    if (!oznaka.getThreads(0, 1).length) oznaka.deleteLabel();
  });
}
