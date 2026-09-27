# Сайт Tabula

Сайт проєкту [Tabula](https://github.com/tabula-cms/tabula) — безкоштовної, відкритої CMS для
українських шкіл, яку кожна школа встановлює собі сама. Сайт складається з двох частин:
документація для шкіл і розробників, яку під час збірки беруть з теки `docs/`
[репозиторію Tabula](https://github.com/tabula-cms/tabula/tree/main/docs) (виправляти тексти
треба там, а не тут), і — пізніше — каталог шкіл, які вже користуються Tabula.

## Стан

Каркасу сайту ще немає. Далі за планом: каркас на Astro Starlight, імпорт документації, CI та
деплой на GitHub Pages, тексти головної сторінки, каталог шкіл. Повний план — в
[issue #10](https://github.com/tabula-cms/site/issues/10).

До появи власного домену сайт житиме на
[`https://tabula-cms.github.io/site/`](https://tabula-cms.github.io/site/).

## Як запустити локально

Код сайту зʼявиться з issue #2–#4; тоді команди будуть такими:

```sh
npm ci
TABULA_DOCS_DIR=../tabula/docs npm run docs:fetch
npm run dev
npm run build
```

## Як допомогти

Правила роботи з репозиторієм і мовні вимоги — в [CONTRIBUTING.md](CONTRIBUTING.md).
Про помилку чи пропозицію повідомляйте через шаблони issue цього репозиторію.
