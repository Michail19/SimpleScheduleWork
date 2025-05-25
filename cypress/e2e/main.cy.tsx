/// <reference types="cypress" />

import { formatWeekRange } from '../../src/Worksheet/timeParsers'; // путь поправь под структуру проекта
import { translations } from '../../src/Worksheet/translations';

describe('Тесты страницы расписания сотрудников', () => {
    beforeEach(() => {
        cy.visit('/main.html');
        // Ждём либо запрос, либо появление интерфейса
        cy.get('.worksheet', { timeout: 20000 }).should('exist');
        cy.get('#preloader').should('not.be.visible');
    });

    it('Проверяем загрузку данных', () => {
        // Проверяем отображение данных
        cy.get('.worksheet__row.current .worksheet__cell_name')
            .should('contain', 'Ершов Михаил Алексеевич');
    });

    it('Проверка элементов хедера', () => {
        // Добавляем проверку видимости элементов
        cy.get('.header__up-blocks__headbar__btn', { timeout: 10000 })
            .should('be.visible')
            .and('have.length', 3)

        // Проверка кнопок управления
        cy.get('.header__up-blocks__headbar__btn')
            .should('have.length', 3)
            .first()
            .should('contain', 'Добавить сотрудника')

        cy.get('.header__up-blocks__headbar__btn')
            .eq(1)
            .should('contain', 'Удалить сотрудника')

        // Проверка навигационных ссылок
        cy.get('.header__up-blocks__wrapper__list__btn')
            .should('have.length', 4)
            .first()
            .should('have.attr', 'href', './index.html')
    })

    it('Проверка сайдбара', () => {
        cy.viewport(1500, 800); // если тест на десктоп

        // Дожидаемся появления всех кнопок
        cy.get('.sidebar__btn', { timeout: 10000 }).should('have.length.at.least', 4);

        // Проверка текста
        cy.get('.sidebar__btn').first().should('contain', 'Расписание');
        cy.get('.sidebar__btn').contains('Поиск и фильтры').should('exist');
    });

    it('Проверка отображения расписания', () => {
        cy.get('.worksheet__row__header__cell', { timeout: 10000 })
            .should('be.visible')

        // Проверка заголовков таблицы
        cy.get('.worksheet__row__header__cell, .worksheet__row__header__cell_clock')
            .should('have.length', 9)
            .first()
            .should('contain', 'Сотрудник')

        // Проверка отображения данных
        cy.get('.worksheet__row.current .worksheet__cell_name')
            .should('contain', 'Ершов Михаил Алексеевич')

        // Проверка формата времени
        cy.get('.worksheet__row.current .worksheet__cell')
            .eq(0)
            .should('contain', '08:00 - 13:40')
    })

    it('Проверка пагинации', () => {
        cy.get('.footer__btn', { timeout: 10000 })
            .should('be.visible')

        cy.get('.footer__btn').should('have.length', 2)
        cy.get('.footer__place').should('contain', 'Лист 1 из 2')

        // Проверка переключения страниц
        cy.get('.footer__btn:not([disabled])').click()
        cy.get('.footer__place').should('contain', 'Лист 2 из 2')
    })

    it('Проверка переключения недель', () => {
        cy.get('.subtitle__date__btn').should('have.length', 2)
        cy.get('.week-range').should('contain', '17-23 Марта 2025')

        // Клик на кнопку переключения недели
        cy.get('.week-button').last().click()

        // Вычисляем диапазон текущей недели
        const today = new Date();
        const currentDay = today.getDay(); // 0 (вс) – 6 (сб)
        const diffToMonday = (currentDay + 6) % 7;

        const monday = new Date(today);
        monday.setDate(today.getDate() - diffToMonday + 7);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        // Используем русский перевод
        const currentTranslation = translations['ru'];
        const expectedRange = formatWeekRange(monday, sunday, currentTranslation);

        // Проверка на UI
        cy.get('.week-range', { timeout: 10000 }).should('contain', expectedRange);
    })

    it('Проверка кнопок добавления/удаления сотрудника', () => {
        // Мокаем ответ API
        cy.intercept('POST', '/api/employees', { statusCode: 201 }).as('addEmployee')
        cy.intercept('DELETE', '/api/employees/*', { statusCode: 200 }).as('deleteEmployee')

        cy.get('.header__up-blocks__headbar__btn').first().click()
        cy.get('.add-employee-popup .close-btn').click();

        cy.get('.header__up-blocks__headbar__btn').eq(1).click()
        cy.get('.delete-popup .close-btn').click();
    })

    it('Проверка фильтрации', () => {
        cy.get('.header__up-blocks__headbar [data-key="sidebar_filters"]').click()

        cy.get('.header__up-blocks__headbar input[type="text"]').type('Иванов')

        // Проверка фильтрации данных
        cy.get('.worksheet__row .worksheet__cell_name')
            .should('have.length', 1)
            .and('contain', 'Иванов Иван Иванович')
    })
})