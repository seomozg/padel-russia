// Итоговый консольный отчёт поиска клубов.
import { CourtCandidate } from '../../src/modules/courts/court-discovery';
import { Stats } from './stats';

export function printDiscoveryReport(
  stats: Stats,
  newList: CourtCandidate[],
  nogeo: CourtCandidate[]
): void {
  // Отчёт
  console.log('\n' + '='.repeat(60));
  console.log('📊 ОТЧЁТ ПО ПОИСКУ КЛУБОВ');
  console.log(
    `  Найдено в источниках: padelmesh=${stats.found.padelmesh ?? 0}, myachmyach=${
      stats.found.myachmyach ?? 0
    }, federation=${stats.found.federation ?? 0}`
  );
  console.log(
    `  Дубликаты (пропущены): sourceUrl=${stats.duplicates.sourceUrl}, name+city=${
      stats.duplicates.nameCity
    }, coords<200м=${stats.duplicates.nearCoords}`
  );
  console.log(`  Без координат (не будут добавлены): ${nogeo.length}`);
  console.log(`  ✅ НОВЫХ К ДОБАВЛЕНИЮ: ${newList.length}`);
  if (stats.warnings.length > 0) {
    console.log(`  ⚠️ Предупреждения (${stats.warnings.length}):`);
    for (const warning of stats.warnings.slice(0, 20)) console.log(`     - ${warning}`);
    if (stats.warnings.length > 20) console.log(`     … ещё ${stats.warnings.length - 20}`);
  }

  if (newList.length > 0) {
    console.log('\nСписок новых клубов:');
    for (const candidate of newList) {
      const coords = candidate.coordinates
        ? `${candidate.coordinates.lat.toFixed(5)}, ${candidate.coordinates.lng.toFixed(5)}`
        : '—';
      console.log(
        `  + ${candidate.name} | ${candidate.city} | ${candidate.address || 'адрес уточняется'} | ${coords} | ${candidate.type} | ${candidate.phone || 'телефон —'} | ${candidate.source}`
      );
    }
  }
  console.log('='.repeat(60));
}
