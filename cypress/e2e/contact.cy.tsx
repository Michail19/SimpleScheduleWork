/// <reference types="cypress" />

describe('Contacts Page Tests', () => {
    beforeEach(() => {
        cy.visit('/contact.html');
    });

    it('should display the main elements correctly', () => {
        // Проверка заголовка
        cy.get('h1[data-key="contact_information"]').should('contain', 'Контактная информация');

        // Проверка ссылки на главную
        cy.get('a[data-key="home"]')
            .should('contain', 'Главная')
            .and('have.attr', 'href', './index.html');

        // Проверка контактной информации
        cy.contains('strong', 'ФИО:').should('exist');
        cy.contains('Ершов Михаил Алексеевич').should('exist');
        cy.contains('GitHub (вопросы, предложения):').should('exist');
        cy.contains('Учебное заведение:').should('exist');
        cy.contains('МИРЭА - Российский технологический университет').should('exist');
        cy.contains('Email:').should('exist');
    });
});
