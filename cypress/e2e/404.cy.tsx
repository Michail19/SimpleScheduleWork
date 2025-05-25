/// <reference types="cypress" />

describe('404 Page Tests', () => {
    beforeEach(() => {
        cy.visit('/404.html');
    });

    it('should display the 404 page correctly', () => {
        // Проверка основных элементов
        cy.get('h1').should('contain', '404');
        cy.get('p[data-key="okak"]').should('contain', 'ОКАК');
        cy.get('p[data-key="not_founded"]').should('contain', 'Страница не найдена');
        cy.get('a[data-key="returning"]').should('have.attr', 'href', './index.html');
    });
});
