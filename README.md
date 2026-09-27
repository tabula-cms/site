# Сайт Tabula

Сайт проєкту [Tabula](https://github.com/tabula-cms/tabula) — безкоштовної, відкритої CMS для
українських шкіл, яку кожна школа встановлює собі сама. Сайт складається з двох частин:
документація для шкіл і розробників, яку під час збірки беруть з теки `docs/`
[репозиторію Tabula](https://github.com/tabula-cms/tabula/tree/main/docs) (виправляти тексти
треба там, а не тут), і — пізніше — каталог шкіл, які вже користуються Tabula.

## Стан

Каркас сайту на Astro Starlight і імпорт документації (issue #3) готові. Далі за планом: CI та
деплой на GitHub Pages (issue #4), тексти головної сторінки, каталог шкіл. Повний план — в
[issue #10](https://github.com/tabula-cms/site/issues/10).

До появи власного домену сайт житиме на
[`https://tabula-cms.github.io/site/`](https://tabula-cms.github.io/site/).

Сайт публікується автоматично з гілки `main` на GitHub Pages і перезбирається щодня, тож зміни
в документації Tabula доходять до сайту без коміту в цьому репозиторії.

## Як запустити локально

Потрібен Node.js 22 (Astro 7 цього вимагає); версія зафіксована в `.nvmrc`. Документацію
`scripts/fetch-docs.mjs` бере з локальної копії репозиторію
[`tabula-cms/tabula`](https://github.com/tabula-cms/tabula) — клонуйте його поруч і вкажіть
шлях до його теки `docs/`:

```sh
nvm use
npm ci
TABULA_DOCS_DIR=../tabula/docs npm run docs:fetch
npm run dev
npm run build
```

Без `TABULA_DOCS_DIR` скрипт сам клонує `tabula-cms/tabula` (гілку задає `TABULA_REF`, за
замовчуванням `main`) — так само працює CI; поки `tabula-cms/tabula` приватний, клонування
потребує `TABULA_DOCS_TOKEN` (або просто користуйтеся `TABULA_DOCS_DIR`). `npm run build` сам
запускає перевірку внутрішніх посилань і `#анкорів` одразу після збірки (`postbuild` →
`scripts/check-links.mjs`) і провалюється, якщо є хоч одне зламане; ту саму перевірку можна
запустити окремо — `npm run check:links`. Подробиці й усі змінні середовища —
в [CONTRIBUTING.md](CONTRIBUTING.md).

## Як допомогти

Правила роботи з репозиторієм і мовні вимоги — в [CONTRIBUTING.md](CONTRIBUTING.md).
Про помилку чи пропозицію повідомляйте через шаблони issue цього репозиторію.
