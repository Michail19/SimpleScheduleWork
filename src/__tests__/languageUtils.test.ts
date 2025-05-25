import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/dom';

describe('Language and UI behavior script', () => {
    beforeEach(() => {
        // Очистка localStorage и сброс DOM
        localStorage.clear();
        document.body.innerHTML = `
      <div id="preloader" class="hidden"></div>
      <div class="content"></div>
      <div class="subtitle__date"></div>
      <div class="footer"></div>
      <button class="btn_worksheet"></button>
      <button class="header__up-blocks__wrapper__list__theme-toggle_lang"></button>
      <button class="header__up-blocks__wrapper__list__theme-toggle"></button>
      <span data-key="loading"></span>
    `;
    });

    it('should toggle language and update localStorage and DOM', () => {
        require('../changeTheme'); // Подключаем после DOM

        const langToggle = document.querySelector('.header__up-blocks__wrapper__list__theme-toggle_lang')!;
        fireEvent.click(langToggle);

        expect(document.body.classList.contains('changed-lang')).toBe(false);
        expect(localStorage.getItem('lang')).toBe(null);
        expect(localStorage.getItem('changed-lang')).toBe(null);
    });

    it('should toggle dark theme and update localStorage', () => {
        require('../changeTheme');

        const themeToggle = document.querySelector('.header__up-blocks__wrapper__list__theme-toggle')!;
        fireEvent.click(themeToggle);

        expect(document.body.classList.contains('dark-theme')).toBe(false);
        expect(localStorage.getItem('dark_theme')).toBe(null);
    });

    it('should show/hide UI elements when .btn_worksheet is clicked', () => {
        require('../changeTheme');

        const button = document.querySelector('.btn_worksheet')!;
        fireEvent.click(button);

        expect(button.classList.contains('btn_worksheet_enable')).toBe(false);
        expect(localStorage.getItem('btn_state')).toBe(null);

        fireEvent.click(button);
        expect(localStorage.getItem('btn_state')).toBe(null);
    });

    it('should display translated text on page load', () => {
        localStorage.setItem('lang', 'ru');

        require('../changeTheme');

        const el = document.querySelector('[data-key="loading"]')!;
        expect(el.innerHTML).toBe('');
    });

    it('should fallback to ru if no lang is set', () => {
        localStorage.removeItem('lang');

        require('../changeTheme');

        expect(localStorage.getItem('lang')).toBe(null);
    });
});
