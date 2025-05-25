/// <reference types="cypress" />

describe('Тесты переходов по ссылкам на главной странице', () => {
    beforeEach(() => {
        cy.visit('/index.html') // Предполагаем, что базовый URL настроен в конфиге Cypress
    })

    it('Проверка ссылок в хедере', () => {
        cy.get('.header__up-blocks__wrapper__list__btn').should('have.length', 2)
            .first()
            .should('have.attr', 'href', './main.html')
            .and('contain', 'Расписание')

        cy.get('.header__up-blocks__wrapper__list__btn').eq(1)
            .should('have.attr', 'href', './project.html')
            .and('contain', 'Проекты')
    })

    it('Проверка внешних ссылок в футере', () => {
        // Проверка основных ссылок
        const externalLinks = [
            { selector: 'a[data-key="go_schedule"]', href: './main.html', text: 'Перейти к расписанию' },
            { selector: 'a[data-key="go_projects"]', href: './project.html', text: 'К проектам' },
            { selector: 'a[data-key="contacts"]', href: './contact.html', text: 'Контакты' }
        ]

        externalLinks.forEach(link => {
            cy.get(link.selector)
                .should('have.attr', 'href', link.href)
                .and('contain', link.text)
        })

        // Проверка доступности страниц
        cy.get('a[href="./contact.html"]').then($link => {
            cy.request($link.prop('href')).its('status').should('eq', 200)
        })
    })

    it('Проверка плавной прокрутки к разделам', () => {
        // Прокручиваем страницу вниз перед тестом
        cy.scrollTo('bottom')

        cy.get('a[href="#start"]').click()
        cy.window().its('scrollY').should('be.closeTo', 0, 100)

        cy.get('a[href="#answer"]').click()
        cy.get('#answer').should('be.visible')
    })

    it('Проверка работы попапа авторизации', () => {
        // Проверяем что попап изначально скрыт
        cy.get('.login-content').should('not.exist')

        // Кликаем кнопку входа
        cy.get('#head button').contains('Вход').click()

        // Проверяем появление попапа
        cy.get('.login-content')
            .should('be.visible')
            .within(() => {
                cy.get('h2').should('contain', 'Вход')
                cy.get('input[type="text"]').should('have.attr', 'placeholder', 'Имя пользователя')
                cy.get('input[type="password"]').should('have.attr', 'placeholder', 'Пароль')
                cy.get('button[type="submit"]').should('contain', 'Войти')
                cy.get('button').contains('Отмена').click()
            })

        // Проверяем закрытие попапа после отмены
        cy.get('.login-content').should('not.exist')
    })

    // Модифицированный тест для проверки кнопки входа
    it('Проверка кнопки входа', () => {
        cy.get('#head button')
            .should('contain', 'Вход')
            .click()

        // Дополнительная проверка что попап открылся
        cy.get('.login-content').should('be.visible')
    })

    it('Проверка количества ссылок в футере', () => {
        cy.get('.footer__columns__info .footer__column-link')
            .should('have.length', 6)
    })

    it('Проверка анимации загрузки', () => {
        cy.get('#preloader').should('have.class', 'hidden')
        // Здесь можно добавить тесты на появление прелоадера при загрузке
    })
})
