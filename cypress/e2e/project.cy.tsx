/// <reference types="cypress" />

describe('SimpleScheduleWork Project Page Tests', () => {
    beforeEach(() => {
        // cy.intercept(
        //     'GET',
        //     'https://api.github.com/users/Michail19/repos*',
        //     { fixture: 'mock-github-repos.json' }
        // ).as('githubApi');

        // cy.visit('/project.html');

        cy.visit('/project.html', {
            onBeforeLoad(win) {
                const originalFetch = win.fetch;
                win.fetch = (...args) => {
                    const [url] = args;
                    if (typeof url === 'string' && url.includes('https://api.github.com/users/Michail19/repos')) {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve(require('../fixtures/mock-github-repos.json')),
                        });
                    }
                    return originalFetch(...args);
                };
            }
        });
    });

    it('should display preloader initially (visible before load)', () => {
        // cy.wait('@githubApi');

        cy.get('#preloader').should('not.have.class', 'hidden');
    });

    it('should have correct header elements', () => {
        cy.get('.header__title_logo').should('contain.text', 'SSW');
        cy.get('.header__up-blocks__headbar__btn').should('contain.text', 'Поиск проекта');
        cy.get('.header__up-blocks__wrapper__icon').should('exist');
    });

    it('should have working navigation links', () => {
        cy.get('[data-key="home"]').should('have.attr', 'href', './index.html');
        cy.get('[data-key="schedule"]').should('have.attr', 'href', './main.html');
    });

    it('should display correct subtitle', () => {
        cy.get('.subtitle__title').should('contain.text', 'Список проектов');
    });

    it('should have active projects button in sidebar', () => {
        cy.get('.sidebar__btn.btn_worksheet_enable').should('contain.text', 'Проекты');
    });

    it('should display project cards with correct data', () => {
        // cy.wait('@githubApi');

        cy.get('.repo-card').should('have.length.at.least', 1);
        cy.get('.repo-card').first().within(() => {
            cy.get('.repo-name').should('contain.text', 'SimpleScheduleWork');
            cy.get('.repo-link').should('have.attr', 'href', 'https://github.com/Michail19/SimpleScheduleWork');
            cy.get('.repo-meta').should('contain.text', 'TypeScript');
            cy.get('.repo-meta').should('contain.text', '⭐ 1');
        });
    });

    it('should have working pagination', () => {
        // cy.wait('@githubApi');

        cy.get('.footer__btn').should('have.length', 2);
        cy.get('.footer__btn').first().should('be.disabled');
        cy.get('.footer__btn').last().should('not.be.disabled');
        cy.get('.footer__place').should('contain.text', 'Лист 1 из 3');
    });

    it('should have theme toggle buttons', () => {
        cy.get('.header__up-blocks__wrapper__list__theme-toggle').should('exist');
        cy.get('.header__up-blocks__wrapper__list__theme-toggle_lang').should('exist');
    });

    it('should have mobile menu toggle', () => {
        cy.get('.header__up-blocks__menu-toggle').should('contain.text', '☰');
    });
});
