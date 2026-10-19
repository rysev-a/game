// tools/version.js
// ВЕРСИИ ИГРЫ — как на GitHub, даже когда игра запущена локально. Каждый коммит в main (первый родитель) — версия 1.<n>,
// где n — порядковый номер коммита. Русское описание версии лежит в changelog.json: ключ — номер PR (если в заголовке
// есть «(#N)») или сама версия («1.207»), если коммит сделан прямо в main.
//
//   node tools/version.js                 — записать version.json в корень репозитория (его читает окно версий в настройках;
//                                           файл в .gitignore, на GitHub Pages его пишет workflow тем же скриптом)
//   node tools/version.js <путь>          — записать в другое место (workflow: _site/version.json)
//   node tools/version.js --next          — напечатать номер версии, которую получит следующий коммит
//   node tools/version.js --check         — перечислить версии, у которых нет русского описания в changelog.json
//   node tools/version.js --tag           — поставить git-теги v1.<n> на все коммиты, где их еще нет
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, TZ: 'Europe/Moscow' } });

function history() {
  const out = git('log', '--first-parent', '--reverse', '--date=format-local:%d.%m.%Y', '--format=%H%x09%cd%x09%s').split('\n').filter(Boolean);
  return out.map((line, i) => {
    const [sha, date, subject] = line.split('\t');
    const pr = (subject.match(/#(\d+)/) || [])[1] || null;
    return { sha, version: '1.' + (i + 1), date, title: subject.replace(/ \(#\d+\)$/, ''), pr };
  });
}

const changelog = () => JSON.parse(fs.readFileSync(path.join(root, 'changelog.json'), 'utf8'));
const hasText = (c, log) => !!(log[c.version] || (c.pr && log[c.pr]));

const arg = process.argv[2];
const all = history();
if (arg === '--next') {
  console.log('1.' + (all.length + 1));
} else if (arg === '--check') {
  const log = changelog();
  const missing = all.filter((c) => c.pr || true).filter((c) => !hasText(c, log));
  for (const c of missing) console.log(c.version + ' ' + c.date + ' ' + c.title);
  if (!missing.length) console.log('У всех версий есть русское описание.');
} else if (arg === '--tag') {
  const have = new Set(git('tag').split('\n'));
  for (const c of all) if (!have.has('v' + c.version)) git('tag', '-a', 'v' + c.version, '-m', c.title, c.sha);
} else {
  const target = arg ? path.resolve(arg) : path.join(root, 'version.json');
  const last = all[all.length - 1];
  const data = { version: last.version, date: last.date, sha: last.sha.slice(0, 7), changes: all.map(({ version, date, title, pr }) => ({ version, date, title, pr })).reverse() };
  fs.writeFileSync(target, JSON.stringify(data));
  console.log('version.json: ' + last.version + ' от ' + last.date);
}
