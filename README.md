# Сайт Tabula

Сайт проєкту [Tabula](https://github.com/tabula-cms/tabula) — безкоштовної, відкритої CMS для
українських шкіл, яку кожна школа встановлює собі сама. Сайт складається з двох частин:
документація для шкіл і розробників, яку під час збірки беруть з теки `docs/`
[репозиторію Tabula](https://github.com/tabula-cms/tabula/tree/main/docs) (виправляти тексти
треба там, а не тут), і — пізніше — каталог шкіл, які вже користуються Tabula.

## Стан

Каркас сайту на Astro Starlight готовий. Далі за планом: імпорт документації (issue #3), CI та
деплой на GitHub Pages (issue #4), тексти головної сторінки, каталог шкіл. Повний план — в
[issue #10](https://github.com/tabula-cms/site/issues/10).

До появи власного домену сайт житиме на
[`https://tabula-cms.github.io/site/`](https://tabula-cms.github.io/site/).

## Як запустити локально

Потрібен Node.js 22 (Astro 7 цього вимагає); версія зафіксована в `.nvmrc`.

```sh
nvm use
npm ci
npm run docs:fetch   # заглушка до issue #3; issue #3 додасть TABULA_DOCS_DIR
npm run dev
npm run build
```

## Як допомогти

Правила роботи з репозиторієм і мовні вимоги — в [CONTRIBUTING.md](CONTRIBUTING.md).
Про помилку чи пропозицію повідомляйте через шаблони issue цього репозиторію.
