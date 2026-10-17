'use strict';

/* =========================================================================
   СИМУЛЯТОР ЖИЗНИ
   Жанр: симулятор жизни (поджанр стратегий / симуляторов бога).
   Два аспекта жанра:
     • биологический — геном, здоровье, продолжительность жизни;
     • социальный    — учёба, работа, общение, семья.
   Особое место: симулятор питомца.
   Игра не имеет единственной цели — важен сам процесс жизни.
   ========================================================================= */

/* ------------------------------ Утилиты ------------------------------ */
const $ = (sel) => document.querySelector(sel);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const ri = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[ri(arr.length)];
const chance = (p) => Math.random() < p;
const rub = (n) => Math.round(n).toLocaleString('ru-RU') + ' ₽';
const num = (n) => Math.round(n).toLocaleString('ru-RU');
/** Правильное склонение: 1 год, 2 года, 5 лет. */
function years(n) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 'лет';
  if (b === 1) return 'год';
  if (b >= 2 && b <= 4) return 'года';
  return 'лет';
}

/* ------------------------------ Данные ------------------------------ */
const NAMES_M = ['Алекс', 'Иван', 'Марк', 'Дмитрий', 'Кирилл', 'Егор', 'Артём', 'Лев', 'Максим', 'Тимур'];
const NAMES_F = ['Аня', 'Мария', 'Ева', 'Ольга', 'Дарья', 'София', 'Ника', 'Полина', 'Вера', 'Алиса'];

const EDU_LEVELS = [
  'Без образования',
  'Начальное',
  'Среднее',
  'Среднее специальное',
  'Бакалавриат',
  'Магистратура',
  'Докторантура'
];

const TRAITS = [
  { id: 'strong',    name: 'Крепкое здоровье',  icon: '💪', good: true,  desc: 'Медленнее теряет здоровье' },
  { id: 'sickly',    name: 'Слабое здоровье',   icon: '🤒', good: false, desc: 'Быстрее теряет здоровье' },
  { id: 'genius',    name: 'Гений',             icon: '🧠', good: true,  desc: '+интеллект, быстрее учится' },
  { id: 'dull',      name: 'Тугодум',           icon: '🐢', good: false, desc: 'Медленнее учится' },
  { id: 'charmer',   name: 'Обаятельный',       icon: '😎', good: true,  desc: '+харизма, легче знакомится' },
  { id: 'athletic',  name: 'Спортивная жилка',  icon: '🏃', good: true,  desc: '+форма и энергия' },
  { id: 'longevity', name: 'Долгожитель',       icon: '🍀', good: true,  desc: 'Живёт дольше' },
  { id: 'optimist',  name: 'Оптимист',          icon: '😊', good: true,  desc: 'Настроение выше' },
  { id: 'melancholic', name: 'Меланхолик',      icon: '😔', good: false, desc: 'Настроение ниже' },
  { id: 'workaholic', name: 'Трудоголик',       icon: '📈', good: true,  desc: '+доход от работы' },
  { id: 'frugal',    name: 'Экономный',         icon: '🪙', good: true,  desc: '−расходы' },
  { id: 'spender',   name: 'Транжира',          icon: '💸', good: false, desc: '+расходы' },
  { id: 'allergy',   name: 'Аллергия',          icon: '🤧', good: false, desc: 'Иногда теряет здоровье' },
  { id: 'lucky',     name: 'Везунчик',          icon: '🎲', good: true,  desc: 'Чаще везёт в событиях' }
];

const JOBS = [
  { name: 'Курьер',             edu: 0, salary: 620000 },
  { name: 'Продавец',           edu: 2, salary: 840000 },
  { name: 'Офис-менеджер',      edu: 3, salary: 1150000 },
  { name: 'Специалист',         edu: 4, salary: 1750000 },
  { name: 'Ведущий специалист', edu: 4, salary: 2400000 },
  { name: 'Руководитель отдела',edu: 5, salary: 3600000 },
  { name: 'Директор',           edu: 6, salary: 6200000 },
  { name: 'Топ-менеджер',       edu: 6, salary: 9500000 }
];

const STAGE_NAMES = { baby: 'Младенец', child: 'Ребёнок', teen: 'Подросток', adult: 'Взрослый', elder: 'Пожилой' };
const STAGE_ICON  = { baby: '👶', child: '🧒', teen: '🧑', adult: '🧑‍💼', elder: '🧓' };

/* ------------------------------ Состояние ------------------------------ */
let S = null;
let pendingGender = 'М';
let genome = [];

function trait(s, id) { return s.traits.includes(id); }
function incomeMult(s) { let m = 1; if (trait(s, 'workaholic')) m += .25; if (trait(s, 'lucky')) m += .05; return m; }
function expMult(s) { let m = 1; if (trait(s, 'frugal')) m -= .25; if (trait(s, 'spender')) m += .30; return m; }
function stageOf(age) { return age < 4 ? 'baby' : age < 13 ? 'child' : age < 18 ? 'teen' : age < 60 ? 'adult' : 'elder'; }

function newState(name, gender, traits) {
  const s = {
    name, gender, traits,
    age: 6, alive: true, stage: 'child',
    stat: { health: 88, energy: 85, fullness: 82, social: 72, mood: 80 },
    attr: { intellect: 50, charisma: 50, fitness: 50 },
    money: 0,
    edu: 0, studyXP: 0,
    job: -1, careerXP: 0, careerLevel: 0,
    partner: false, children: 0, pet: false,
    monthsLeft: 12,
    log: [], achievements: [],
    sumHealth: 0, sumMood: 0, turns: 0, peakMoney: 0, workedYears: 0
  };
  if (trait(s, 'strong'))   s.stat.health += 6;
  if (trait(s, 'sickly'))   s.stat.health -= 10;
  if (trait(s, 'genius'))   s.attr.intellect += 15;
  if (trait(s, 'dull'))     s.attr.intellect -= 12;
  if (trait(s, 'charmer'))  s.attr.charisma += 15;
  if (trait(s, 'athletic')) { s.attr.fitness += 15; s.stat.energy += 8; }
  if (trait(s, 'optimist'))  s.stat.mood += 12;
  if (trait(s, 'melancholic')) s.stat.mood -= 14;
  return s;
}

/* ------------------------------ Лог ------------------------------ */
function logItem(text, cls = '') {
  S.log.push({ year: S.age, text, cls });
  if (S.log.length > 600) S.log.shift();
}
function logYear(title) { S.log.push({ year: S.age, text: title, cls: 'year' }); }

/* ------------------------------ Изменение статов ------------------------------ */
function add(s, key, v) { s.stat[key] = clamp(s.stat[key] + v); }
function addAttr(s, key, v) { s.attr[key] = clamp(s.attr[key] + v); }

/** Течение времени: за каждый потраченный месяц нужды падают. */
function spend(s, months) {
  const child = s.age < 18;
  s.stat.fullness = clamp(s.stat.fullness - months * 4);
  s.stat.energy   = clamp(s.stat.energy   - months * (trait(s, 'athletic') ? 3 : 4));
  s.stat.social   = clamp(s.stat.social   - months * (child ? 3.5 : 3));
  s.stat.mood     = clamp(s.stat.mood     - months * (trait(s, 'optimist') ? 2 : 2.5));
  s.monthsLeft = Math.max(0, s.monthsLeft - months);
  checkDepletion(s);
}

/** Кризис нужд наносит лишь небольшой урон и не повторяется бесконечно. */
function checkDepletion(s) {
  if (s.stat.fullness <= 5) { add(s, 'health', -1); add(s, 'mood', -1); }
  if (s.stat.energy <= 5)   { add(s, 'health', -1); }
  if (s.stat.social <= 5)   { add(s, 'mood', -2); }
  if (s.stat.health <= 0)   s.stat.health = 0;
}

/** Оплата с учётом кошелька: уйти в минус из-за действия нельзя. */
function pay(s, amount) {
  const paid = Math.min(amount, Math.max(0, s.money));
  s.money -= paid;
  return paid;
}

/* ------------------------------ Действия ------------------------------ */
const ACTIONS = [
  {
    id: 'eat', icon: '🍲', label: 'Хорошо поесть', cost: 1,
    desc: 'Восстанавливает сытость и немного настроение',
    avail: () => true,
    run: (s) => { spend(s, 1); const c = pay(s, 1600 * expMult(s)); add(s, 'fullness', 50); add(s, 'mood', 5); return `Сытный обед (−${rub(c)})`; }
  },
  {
    id: 'rest', icon: '😴', label: 'Отдохнуть', cost: 2,
    desc: 'Возвращает энергию, успокаивает',
    avail: () => true,
    run: (s) => { spend(s, 2); add(s, 'energy', 50); add(s, 'mood', 4); return 'Хорошенько выспался и набрался сил'; }
  },
  {
    id: 'meditate', icon: '🧘', label: 'Медитация', cost: 1,
    desc: 'Спокойствие: +настроение, +здоровье',
    avail: () => S.age >= 13,
    run: (s) => { spend(s, 1); add(s, 'mood', 12); add(s, 'health', 3); return 'Помедитировал и успокоил мысли'; }
  },
  {
    id: 'work', icon: '💼', label: 'Работать', cost: 4,
    desc: 'Заработок, карьерный рост, но −энергия и −общение',
    avail: () => S.job >= 0,
    run: (s) => {
      spend(s, 4);
      const earn = salaryOf(s) * 4 / 12;
      s.money += earn; s.workedYears++;
      add(s, 'energy', -18); add(s, 'mood', -4); add(s, 'social', -4); add(s, 'fullness', -6);
      s.careerXP += 20 + s.attr.intellect / 8;
      const up = tryPromote(s);
      return `Отработал и получил ${rub(earn)}${up ? ' — ' + up : ''}`;
    }
  },
  {
    id: 'study', icon: '📚', label: 'Учиться', cost: 4,
    desc: 'Знания и диплом, открывают лучшие профессии',
    avail: () => S.edu < EDU_LEVELS.length - 1,
    run: (s) => {
      spend(s, 4);
      let c = 0;
      if (s.age >= 18) { c = pay(s, 22000 * expMult(s)); }
      let gain = 22 + s.attr.intellect / 4;
      if (trait(s, 'genius')) gain *= 1.35;
      if (trait(s, 'dull')) gain *= .7;
      s.studyXP += gain;
      addAttr(s, 'intellect', 1.5);
      add(s, 'energy', -12); add(s, 'mood', -3);
      let msg = s.age < 18 ? 'Учился в школе' : `Учился (−${rub(c)})`;
      const need = studyNeed(s);
      if (s.studyXP >= need && s.edu < EDU_LEVELS.length - 1) {
        s.studyXP = 0; s.edu++;
        msg += `. Новый уровень образования: ${EDU_LEVELS[s.edu]}!`;
        if (s.job >= 0) recomputeJob(s);
      }
      return msg;
    }
  },
  {
    id: 'jobsearch', icon: '🔎', label: 'Искать работу', cost: 1,
    desc: 'Найти лучшую должность под ваш диплом',
    avail: () => S.age >= 16 && bestJobIndex(S) > S.job,
    run: (s) => {
      spend(s, 1);
      const bi = bestJobIndex(s);
      if (bi > s.job) {
        s.job = bi; s.careerXP = 0; s.careerLevel = 0;
        return `Устроился на работу: ${JOBS[bi].name} (${rub(salaryOf(s))}/год)`;
      }
      return 'Подходящих вакансий не нашлось';
    }
  },
  {
    id: 'freelance', icon: '🛠', label: 'Подработка', cost: 3,
    desc: 'Немного денег без официальной работы',
    avail: () => S.age >= 14 && S.job < 0,
    run: (s) => { spend(s, 3); const e = (90000 + S.attr.intellect * 900) * incomeMult(s); s.money += e; add(s, 'energy', -14); return `Халтурил за ${rub(e)}`; }
  },
  {
    id: 'socialize', icon: '🗣', label: 'Общаться', cost: 2,
    desc: 'Друзья, общение и хорошее настроение',
    avail: () => true,
    run: (s) => {
      spend(s, 2);
      const c = pay(s, 2500 * expMult(s));
      add(s, 'social', trait(s, 'charmer') ? 42 : 34); add(s, 'mood', 14);
      addAttr(s, 'charisma', 1.2);
      return `Провёл время с друзьями (−${rub(c)})`;
    }
  },
  {
    id: 'sport', icon: '🏋', label: 'Спортзал', cost: 2,
    desc: 'Форма и здоровье, но тратит силы',
    avail: () => S.age >= 6,
    run: (s) => {
      spend(s, 2);
      const c = pay(s, 3000 * expMult(s));
      addAttr(s, 'fitness', 2.4); add(s, 'health', 6); add(s, 'energy', -18); add(s, 'fullness', -10);
      return `Тренировка (−${rub(c)}): +форма, +здоровье`;
    }
  },
  {
    id: 'hobby', icon: '🎨', label: 'Хобби', cost: 3,
    desc: 'Радость и творческое развитие',
    avail: () => true,
    run: (s) => {
      spend(s, 3);
      add(s, 'mood', 22); add(s, 'energy', -8);
      addAttr(s, chance(.5) ? 'intellect' : 'charisma', 1.5);
      return 'Занялся любимым делом — настроение выросло';
    }
  },
  {
    id: 'doctor', icon: '🏥', label: 'К врачу', cost: 1,
    desc: 'Поправить здоровье за деньги',
    avail: () => S.stat.health < 92,
    run: (s) => {
      spend(s, 1);
      const c = pay(s, 14000 * expMult(s));
      add(s, 'health', 30);
      return `Обследование и лечение (−${rub(c)}): +здоровье`;
    }
  },
  {
    id: 'travel', icon: '✈️', label: 'Путешествие', cost: 3,
    desc: 'Много впечатлений, дорого',
    avail: () => S.age >= 16 && S.money >= 90000,
    run: (s) => {
      spend(s, 3);
      const c = pay(s, 95000 * expMult(s));
      add(s, 'mood', 34); add(s, 'social', 12); add(s, 'energy', -14);
      return `Съездил в путешествие (−${rub(c)}): +настроение`;
    }
  },
  {
    id: 'date', icon: '💕', label: 'Свидание', cost: 2,
    desc: 'Найти вторую половинку',
    avail: () => S.age >= 16 && !S.partner,
    run: (s) => {
      spend(s, 2);
      const c = pay(s, 6000 * expMult(s));
      add(s, 'mood', 20); add(s, 'social', 16);
      const p = trait(s, 'charmer') ? .55 : .38;
      if (chance(p)) { s.partner = true; return `Нашёл вторую половинку! (−${rub(c)})`; }
      return `Свидание прошло приятно, но пары пока нет (−${rub(c)})`;
    }
  },
  {
    id: 'family', icon: '👨‍👩‍👧', label: 'Время с семьёй', cost: 2,
    desc: 'Тепло дома, +настроение',
    avail: () => S.partner || S.children > 0,
    run: (s) => { spend(s, 2); add(s, 'mood', 24); add(s, 'social', 20); add(s, 'energy', 5); return 'Провёл время с близкими'; }
  },
  {
    id: 'child', icon: '👶', label: 'Завести ребёнка', cost: 3,
    desc: 'Семья растёт (нужен партнёр)',
    avail: () => S.partner && S.age >= 18 && S.children < 5,
    run: (s) => {
      spend(s, 3);
      s.children++;
      add(s, 'mood', 26); add(s, 'energy', -20);
      return `В семье родился ребёнок! Теперь детей: ${s.children}`;
    }
  },
  {
    id: 'pet', icon: '🐶', label: 'Завести питомца', cost: 2,
    desc: 'Верный друг и +настроение каждый год',
    avail: () => !S.pet && S.age >= 10,
    run: (s) => { spend(s, 2); const c = pay(s, 25000 * expMult(s)); s.pet = true; add(s, 'mood', 18); return `Завёл питомца (−${rub(c)}). Теперь дома есть друг`; }
  }
];

/* ------------------------------ Карьера ------------------------------ */
function bestJobIndex(s) {
  let best = -1;
  for (let i = 0; i < JOBS.length; i++) if (JOBS[i].edu <= s.edu) best = i;
  return best;
}
function salaryOf(s) {
  if (s.job < 0) return 0;
  return JOBS[s.job].salary * (1 + s.careerLevel * 0.15) * incomeMult(s);
}
function tryPromote(s) {
  const need = 90 + s.careerLevel * 55;
  if (s.careerXP < need) return '';
  s.careerXP = 0; s.careerLevel++;
  const next = s.job + 1;
  if (next < JOBS.length && JOBS[next].edu <= s.edu) {
    s.job = next;
    return `повышение до «${JOBS[next].name}»`;
  }
  return `прибавка к зарплате (теперь ${rub(salaryOf(s))}/год)`;
}
/** Если игрок доучился — автоматически предложим работу лучше. */
function recomputeJob(s) {
  const bi = bestJobIndex(s);
  if (bi > s.job) { s.job = bi; s.careerXP = 0; logItem(`Благодаря образованию получил должность «${JOBS[bi].name}»`, 'good'); }
}

/* ------------------------------ Учёба ------------------------------ */
function studyNeed(s) { return 55 + s.edu * 45; }

/* ------------------------------ События ------------------------------ */
const EVENTS = [
  { id: 'ill', w: 8, good: false, cond: (s) => s.stat.health < 55 || trait(s, 'sickly'),
    run: (s) => { const d = trait(s, 'strong') ? 6 : 10; add(s, 'health', -d); return [`Простудился и проболел часть года (−${d} здоровья)`, 'bad']; } },
  { id: 'allergy', w: 6, good: false, cond: (s) => trait(s, 'allergy'),
    run: (s) => { add(s, 'health', -7); add(s, 'mood', -5); return ['Сезонная аллергия испортила самочувствие', 'bad']; } },
  { id: 'lottery', w: 5, good: true, cond: (s) => s.age >= 18,
    run: (s) => { const win = 20000 + ri(600000); s.money += win; return [`Выиграл в лотерею ${rub(win)}!`, 'good']; } },
  { id: 'bonus', w: 8, good: true, cond: (s) => s.job >= 0,
    run: (s) => { const b = salaryOf(s) * (0.1 + Math.random() * 0.2); s.money += b; return [`Премия на работе: +${rub(b)}`, 'good']; } },
  { id: 'lost_job', w: 4, good: false, cond: (s) => s.job >= 0 && s.age < 65 && s.careerLevel < 3,
    run: (s) => { const old = JOBS[s.job].name; s.job = -1; s.careerXP = 0; s.careerLevel = 0; add(s, 'mood', -14); return [`Сократили на работе: потерял должность «${old}»`, 'bad']; } },
  { id: 'friend', w: 12, good: true, cond: () => true,
    run: (s) => { add(s, 'social', 18); add(s, 'mood', 10); addAttr(s, 'charisma', 1); return ['Обзавёлся новым другом', 'good']; } },
  { id: 'quarrel', w: 8, good: false, cond: (s) => s.stat.social < 60,
    run: (s) => { add(s, 'mood', -12); add(s, 'social', -8); return ['Поссорился с близким человеком', 'bad']; } },
  { id: 'love', w: 7, good: true, cond: (s) => s.age >= 18 && !s.partner,
    run: (s) => { if (chance(trait(s, 'charmer') ? .6 : .4)) { s.partner = true; return ['Встретил любовь всей жизни!', 'good']; } add(s, 'mood', 6); return ['Короткий роман, но без продолжения', 'event']; } },
  { id: 'move', w: 6, good: true, cond: (s) => s.age >= 22,
    run: (s) => { const rich = s.money > 300000; add(s, 'mood', rich ? 12 : -8); return [rich ? 'Переехал в новую квартиру' : 'Пришлось переехать в жильё поскромнее', rich ? 'good' : 'bad']; } },
  { id: 'injury', w: 5, good: false, cond: (s) => s.attr.fitness > 55,
    run: (s) => { add(s, 'health', -8); addAttr(s, 'fitness', -5); return ['Спортивная травма (−8 здоровья)', 'bad']; } },
  { id: 'inherit', w: 3, good: true, cond: (s) => s.age >= 35,
    run: (s) => { const g = 150000 + ri(900000); s.money += g; return [`Внезапное наследство: +${rub(g)}`, 'good']; } },
  { id: 'scam', w: 4, good: false, cond: (s) => s.money > 100000,
    run: (s) => { const l = Math.min(s.money, 30000 + ri(200000)); s.money -= l; add(s, 'mood', -10); return [`Мошенники обманули на ${rub(l)}`, 'bad']; } },
  { id: 'viral', w: 4, good: true, cond: (s) => s.age >= 14 && trait(s, 'charmer'),
    run: (s) => { s.money += 400000; addAttr(s, 'charisma', 4); return ['Ролик стал вирусным: +400 000 ₽ и слава', 'good']; } },
  { id: 'pet_joy', w: 8, good: true, cond: (s) => s.pet,
    run: (s) => { add(s, 'mood', 10); return ['Питомец поднял настроение как всегда', 'good']; } },
  { id: 'burnout', w: 6, good: false, cond: (s) => s.stat.energy < 45 && s.job >= 0,
    run: (s) => { add(s, 'mood', -14); add(s, 'health', -4); return ['Профессиональное выгорание', 'bad']; } }
];

function eventWeight(s, e) {
  if (!trait(s, 'lucky')) return e.w;
  return e.w * (e.good ? 1.4 : 0.7);
}

function rollEvent(s) {
  const pool = EVENTS.filter((e) => e.cond(s));
  let total = 0;
  for (const e of pool) total += eventWeight(s, e);
  if (total <= 0) return;
  let r = Math.random() * total;
  for (const e of pool) {
    r -= eventWeight(s, e);
    if (r <= 0) { const [text, cls] = e.run(s); logItem(text, cls); return; }
  }
}

/* ------------------------------ Итоги года ------------------------------ */
function endYear() {
  if (!S.alive) return;
  const s = S;

  // Пассивный доход партнёра и расходы на жизнь
  if (s.age >= 18) {
    let net = 0;
    if (s.partner) net += 800000;
    let expenses = (160000 + s.children * 120000) * expMult(s);
    if (s.partner) expenses *= 1.3;
    if (s.pet) expenses += 30000;
    net -= expenses;
    s.money += net;
    if (net >= 0) logItem(`Годовой баланс: +${rub(net)}`, 'good');
    else logItem(`Расходы превысили доход: ${rub(net)}`, 'bad');
    if (s.money < 0) { add(s, 'mood', -8); add(s, 'health', -2); logItem('Долги давят на жизнь: −настроение, −здоровье', 'bad'); }
  } else {
    if (s.money < 0) s.money = 0; // ребёнка содержат родители
  }

  // Естественное старение и восстановление
  if (s.age >= 45) add(s, 'health', -Math.round((s.age - 44) * 0.22));
  if (trait(s, 'strong')) add(s, 'health', 2);
  if (s.stat.mood > 80) add(s, 'health', 3);
  if (s.stat.mood < 30) add(s, 'health', -3);

  // Здоровый образ жизни помогает восстановиться
  let regen = 0;
  if (s.stat.fullness > 55) regen += 2;
  if (s.stat.energy > 55) regen += 1;
  if (s.stat.social > 50) regen += 1;
  if (s.stat.mood > 55) regen += 1;
  if (s.age >= 65) regen = Math.round(regen * 0.5);
  add(s, 'health', regen);

  // Случайное событие года
  rollEvent(s);

  // Достижения
  checkAchievements(s);

  // Статистика для итогового счёта
  s.sumHealth += s.stat.health;
  s.sumMood += s.stat.mood;
  s.turns++;
  s.peakMoney = Math.max(s.peakMoney, s.money);

  // Смерть
  if (s.stat.health <= 0) { die('Здоровье подвело — жизнь оборвалась.'); return; }
  const dc = deathChance(s);
  if (chance(dc)) { die(deathReason(s)); return; }

  // Новый год
  s.age++;
  s.stage = stageOf(s.age);
  s.monthsLeft = 12;
  if (s.stage === 'elder' && !s._elderLogged) { s._elderLogged = true; logItem('Вышел на пенсию — начинается тихая жизнь', 'event'); }
  if (s.job >= 0 && s.age >= 67) { logItem('Вышел на пенсию по возрасту', 'event'); s.job = -1; }

  logYear(`— ${s.age} ${years(s.age)} · ${STAGE_NAMES[s.stage]} —`);
  save();
  render();
}

function deathChance(s) {
  if (s.age < 18) return 0; // дети крайне редко умирают — игра про жизнь, а не про случайность
  let c = 0;
  if (s.age >= 60) c += (s.age - 60) * 0.012;
  c += Math.max(0, 100 - s.stat.health) / 1200;
  if (trait(s, 'longevity')) c -= 0.02;
  if (trait(s, 'sickly')) c += 0.012;
  if (s.stat.mood > 75) c -= 0.005;
  if (s.age >= 110) c = 1;
  return Math.max(0, c);
}
function deathReason(s) {
  const r = ['остановилось сердце во сне', 'подвело здоровье', 'тихо скончался в кругу семьи', 'жизнь угасла от старости'];
  if (s.stat.health < 35) return 'Здоровье было подорвано — организм не справился.';
  return `Прожил долгую жизнь и умер: ${pick(r)}.`;
}

/* ------------------------------ Достижения ------------------------------ */
const ACHIEVEMENTS = [
  { id: 'millionaire', name: '💰 Миллионер', cond: (s) => s.money >= 1000000 },
  { id: 'rich', name: '🤑 Магнат', cond: (s) => s.money >= 10000000 },
  { id: 'longlife', name: '🕰 Долгожитель', cond: (s) => s.age >= 90 },
  { id: 'family3', name: '👨‍👩‍👧‍👦 Многодетный', cond: (s) => s.children >= 3 },
  { id: 'professor', name: '🎓 Доктор наук', cond: (s) => s.edu >= 6 },
  { id: 'athlete', name: '🏅 Атлет', cond: (s) => s.attr.fitness >= 85 },
  { id: 'genius', name: '🧠 Гений', cond: (s) => s.attr.intellect >= 90 },
  { id: 'socialite', name: '🎉 Душа компании', cond: (s) => s.attr.charisma >= 90 },
  { id: 'happy', name: '😄 Счастливчик', cond: (s) => s.stat.mood >= 95 },
  { id: 'petyear', name: '🐶 Заботливый хозяин', cond: (s) => s.pet && s.age >= 40 },
  { id: 'married', name: '💍 Вторая половинка', cond: (s) => s.partner && s.age >= 45 }
];
function checkAchievements(s) {
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements.includes(a.id) && a.cond(s)) {
      s.achievements.push(a.id);
      logItem(`Достижение: ${a.name}`, 'good');
    }
  }
}

/* ------------------------------ Смерть и счёт ------------------------------ */
function die(reason) {
  S.alive = false;
  S.sumHealth += S.stat.health;
  S.sumMood += S.stat.mood;
  S.turns++;
  checkAchievements(S);
  logItem(reason, 'bad');
  save();
  renderOver(reason);
  showScreen('over');
}

function lifeScore(s) {
  const t = Math.max(1, s.turns);
  const avgH = s.sumHealth / t, avgM = s.sumMood / t;
  let score = 0;
  score += avgH * 3;
  score += avgM * 3;
  score += s.attr.intellect * 1.6;
  score += s.attr.charisma * 1.6;
  score += s.attr.fitness * 1.6;
  score += s.edu * 22;
  score += s.careerLevel * 12 + (s.job >= 0 ? 20 : 0);
  score += Math.min(s.peakMoney / 20000, 260);
  score += s.children * 22 + (s.partner ? 45 : 0);
  score += s.pet ? 18 : 0;
  score += s.achievements.length * 25;
  score += s.age * 1.2;
  return Math.round(score);
}
function rankOf(score) {
  if (score >= 2000) return '🌟 Легендарная жизнь';
  if (score >= 1650) return '🏆 Великолепная жизнь';
  if (score >= 1300) return '😊 Хорошая жизнь';
  if (score >= 1000) return '🙂 Достойная жизнь';
  if (score >= 700)  return '😐 Обычная жизнь';
  if (score >= 400)  return '😕 Непростая жизнь';
  return '💔 Трудная судьба';
}

/* ------------------------------ Экран итогов ------------------------------ */
function renderOver(reason) {
  const s = S;
  $('#over-title').textContent = `${s.name} · ${s.age} ${years(s.age)}`;
  $('#over-summary').textContent = `${reason} ${STAGE_NAMES[stageOf(s.age)]} · ${EDU_LEVELS[s.edu]}.`;
  $('#over-score').textContent = num(lifeScore(s));
  $('#over-rank').textContent = rankOf(lifeScore(s));
  const badges = $('#over-achievements');
  badges.innerHTML = '';
  if (!s.achievements.length) badges.innerHTML = '<span class="badge" style="border-color:#26303f;color:#8ea0b8">Без особых достижений</span>';
  for (const id of s.achievements) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) badges.innerHTML += `<span class="badge">${a.name}</span>`;
  }
  $('#over-log').innerHTML = renderLogItems(s.log.slice().reverse());
}

/* ------------------------------ Отрисовка ------------------------------ */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  $('#screen-' + name).classList.add('active');
  window.scrollTo(0, 0);
}

const NEEDS = [
  { key: 'health',   name: '❤️ Здоровье' },
  { key: 'energy',   name: '⚡ Энергия' },
  { key: 'fullness', name: '🍽 Сытость' },
  { key: 'social',   name: '🗣 Общение' },
  { key: 'mood',     name: '😊 Настроение' }
];

function barClass(v) { return v < 25 ? 'low' : v < 50 ? 'mid' : ''; }

function render() {
  if (!S) return;
  const s = S;
  $('#hud-avatar').textContent = STAGE_ICON[stageOf(s.age)];
  $('#hud-name').textContent = s.name + (s.gender === 'Ж' ? ' ♀' : ' ♂');
  $('#hud-sub').textContent = `${STAGE_NAMES[stageOf(s.age)]} · ${s.age} ${years(s.age)}`;
  $('#hud-age').textContent = s.age;
  $('#hud-money').textContent = rub(s.money);
  $('#hud-money').style.color = s.money < 0 ? 'var(--bad)' : 'var(--accent)';
  $('#hud-job').textContent = s.job >= 0 ? JOBS[s.job].name : 'Безработный';
  $('#hud-edu').textContent = EDU_LEVELS[s.edu];

  // Нужды
  $('#needs').innerHTML = NEEDS.map((n) => {
    const v = Math.round(s.stat[n.key]);
    return `<div class="need"><div class="need-top"><span>${n.name}</span><span class="v">${v}</span></div>
      <div class="bar"><i class="${barClass(v)}" style="width:${v}%"></i></div></div>`;
  }).join('');

  // Характеристики
  const need = studyNeed(s);
  $('#attrs').innerHTML = `
    <div class="attr"><div class="k">Интеллект</div><div class="v">${Math.round(s.attr.intellect)}</div></div>
    <div class="attr"><div class="k">Харизма</div><div class="v">${Math.round(s.attr.charisma)}</div></div>
    <div class="attr"><div class="k">Форма</div><div class="v">${Math.round(s.attr.fitness)}</div></div>
    <div class="attr"><div class="k">Опыт учёбы</div><div class="v">${Math.round(s.studyXP)}/${need}</div></div>
    <div class="attr"><div class="k">Карьера</div><div class="v">ур. ${s.careerLevel}</div></div>
    <div class="attr"><div class="k">Зарплата</div><div class="v">${s.job >= 0 ? rub(salaryOf(s)) : '—'}</div></div>`;

  // Близкие
  const fam = [];
  fam.push(s.partner ? '<span class="fam">💍 Партнёр</span>' : '');
  for (let i = 0; i < s.children; i++) fam.push('<span class="fam">👶 Ребёнок</span>');
  if (s.pet) fam.push('<span class="fam">🐶 Питомец</span>');
  $('#family').innerHTML = fam.filter(Boolean).length
    ? fam.filter(Boolean).join('')
    : '<span class="fam none">Пока никого нет</span>';

  // Черты
  $('#trait-list').innerHTML = s.traits.map((id) => {
    const t = TRAITS.find((x) => x.id === id);
    return `<span class="trait" title="${t.desc}">${t.icon} ${t.name}</span>`;
  }).join('');

  // Время
  $('#months-left').textContent = s.monthsLeft;
  const pct = (s.monthsLeft / 12) * 100;
  const tf = $('#time-fill');
  tf.style.width = pct + '%';
  tf.className = pct < 25 ? 'low' : pct < 50 ? 'mid' : '';

  // Действия
  $('#actions').innerHTML = '';
  for (const a of ACTIONS) {
    const avail = safeAvail(a) && s.monthsLeft >= a.cost;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action';
    btn.disabled = !avail;
    btn.innerHTML = `<span class="a-cost">${a.cost} мес.</span>
      <div class="a-top"><span class="ic">${a.icon}</span><span>${a.label}</span></div>
      <div class="a-desc">${a.desc}</div>`;
    if (avail) btn.addEventListener('click', () => doAction(a));
    $('#actions').appendChild(btn);
  }
  const endBtn = $('#btn-endyear');
  endBtn.textContent = s.monthsLeft > 0 ? '⏭ Завершить год досрочно' : '⏭ Итоги года';
  endBtn.disabled = false;

  // Лог
  $('#log').innerHTML = renderLogItems(s.log.slice().reverse().slice(0, 120));
  logSaveThrottled();
}

function safeAvail(a) { try { return a.avail(S); } catch (e) { return false; } }

function renderLogItems(items) {
  return items.map((it) => `<div class="log-item ${it.cls || ''}">
    ${it.cls === 'year' ? '' : `<span class="yr">${it.year}</span>`}${escapeHtml(it.text)}</div>`).join('');
}
function escapeHtml(t) { return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ------------------------------ Действие игрока ------------------------------ */
function doAction(a) {
  if (!S.alive) return;
  const text = a.run(S);
  logItem(text, 'good');
  if (S.monthsLeft <= 0) { render(); setTimeout(endYear, 450); return; }
  save();
  render();
}

/* ------------------------------ Геном ------------------------------ */
let rerollsLeft = 3;
function rollGenome() {
  const pool = TRAITS.slice();
  const res = [];
  const n = 2 + ri(2); // 2–3 черты
  for (let i = 0; i < n && pool.length; i++) {
    const idx = ri(pool.length);
    res.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  return res;
}
function renderGenome() {
  $('#genome').innerHTML = genome.map((id) => {
    const t = TRAITS.find((x) => x.id === id);
    return `<span class="gene ${t.good ? 'good' : 'bad'}"><span class="ic">${t.icon}</span>
      <span><b>${t.name}</b><br><small style="color:var(--muted)">${t.desc}</small></span></span>`;
  }).join('');
  $('#rerolls').textContent = rerollsLeft;
  $('#btn-reroll').disabled = rerollsLeft <= 0;
}

/* ------------------------------ Сохранение ------------------------------ */
const SAVE_KEY = 'lifeSimSave_v1';
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
let saveTimer = null;
function logSaveThrottled() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 800); }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.age !== 'number') return null;
    return s;
  } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

/* ------------------------------ Инициализация ------------------------------ */
function startGame() {
  const name = ($('#inp-name').value || '').trim() || (pendingGender === 'Ж' ? pick(NAMES_F) : pick(NAMES_M));
  S = newState(name, pendingGender, genome.slice());
  S.stage = stageOf(S.age);
  logYear(`— Рождение: ${name}, 6 лет —`);
  logItem('Начинается ваша история. Впереди целая жизнь.', 'event');
  save();
  render();
  showScreen('game');
}

function bindCreation() {
  $('#inp-name').placeholder = pick(NAMES_M.concat(NAMES_F));
  document.querySelectorAll('#seg-gender .seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#seg-gender .seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      pendingGender = b.dataset.gender;
    });
  });
  $('#btn-reroll').addEventListener('click', () => {
    if (rerollsLeft <= 0) return;
    rerollsLeft--;
    genome = rollGenome();
    renderGenome();
  });
  $('#btn-start').addEventListener('click', startGame);
  $('#btn-endyear').addEventListener('click', endYear);
  $('#btn-restart').addEventListener('click', () => {
    clearSave();
    S = null;
    rerollsLeft = 3;
    genome = rollGenome();
    renderGenome();
    showScreen('creation');
  });
  $('#btn-menu').addEventListener('click', () => {
    if (confirm('Начать жизнь заново? Текущий прогресс будет удалён.')) {
      clearSave(); S = null; showScreen('creation');
      if (!genome.length) { genome = rollGenome(); renderGenome(); }
    }
  });
}

function boot() {
  bindCreation();
  genome = rollGenome();
  renderGenome();
  const saved = load();
  if (saved && saved.alive) {
    S = saved;
    render();
    showScreen('game');
  } else {
    showScreen('creation');
  }
}

document.addEventListener('DOMContentLoaded', boot);
