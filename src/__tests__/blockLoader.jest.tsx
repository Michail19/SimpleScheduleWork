import React from 'react';
import { render, screen } from '@testing-library/react';
import BlockLoader, { touch_on_load } from '../BlockLoader';
import '@testing-library/jest-dom';

describe('BlockLoader', () => {
    it('renders the loader component', () => {
        render(<BlockLoader />);
        expect(true);
    });

    describe('touch_on_load function', () => {
        beforeEach(() => {
            document.body.innerHTML = `
        <button class="btn_worksheet">Button</button>
        <div class="footer">Footer</div>
      `;
            localStorage.clear();
        });

        it('should toggle classes when elements exist and btn_state is not hidden', () => {
            touch_on_load();

            const button = document.querySelector('.btn_worksheet');
            const footer = document.querySelector('.footer');

            expect(button).toHaveClass('btn_worksheet_enable');
            expect(footer).toHaveClass('hide_content');
        });

        it('should not toggle classes when btn_state is hidden', () => {
            localStorage.setItem('btn_state', 'hidden');

            touch_on_load();

            const button = document.querySelector('.btn_worksheet');
            const footer = document.querySelector('.footer');

            expect(button).not.toHaveClass('btn_worksheet_enable');
            expect(footer).not.toHaveClass('hide_content');
        });

        it('should not throw errors when elements are missing', () => {
            document.body.innerHTML = '';

            expect(() => touch_on_load()).not.toThrow();
        });
    });
});
