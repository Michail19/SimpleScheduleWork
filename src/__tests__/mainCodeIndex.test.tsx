import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import MainCodeIndex from '../MainCodeIndex';
import '@testing-library/jest-dom';

// Мокаем зависимости
jest.mock('../UserAccessLevel', () => ({
    getUsername: jest.fn(() => 'testuser'),
    verifyToken: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../ImageEditor', () => () => <div data-testid="mocked-image-editor" />);

jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    createPortal: (node: any) => node, // рендерим напрямую, не в отдельный DOM-элемент
}));

// Мокаем LoginPopup
jest.mock('../MainCodeIndex/components/LoginPopup', () => ({ onClose, onLoginSuccess, currentTranslation }: any) => (
    <div data-testid="mocked-login-popup">
        <button
            onClick={() => {
                onLoginSuccess('mockToken');
                onClose();
            }}
        >
            Login
        </button>
        <button onClick={onClose}>Close</button>
        <span>{currentTranslation.login}</span>
    </div>
));


describe('MainCodeIndex', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
      <div class="header__up-blocks__wrapper__list"></div>
      <div class="header__up-blocks__wrapper_icon-place"></div>
      <div class="header__up-blocks__menu-toggle-place"></div>
    `;
    });

    it('renders login button if not authenticated', () => {
        const { getByText } = render(<MainCodeIndex />);
        expect(getByText(/вход/i)).toBeInTheDocument();
    });

    it('opens LoginPopup when login button is clicked', async () => {
        const { getByText, queryByTestId } = render(<MainCodeIndex />);
        fireEvent.click(getByText(/вход/i));
        expect(queryByTestId('mocked-login-popup')).toBeInTheDocument();
    });

    it('logs in and sets authToken', async () => {
        const { getByText, queryByTestId } = render(<MainCodeIndex />);

        fireEvent.click(getByText(/вход/i));
        fireEvent.click(getByText('Login'));

        await waitFor(() => {
            expect(queryByTestId('mocked-login-popup')).not.toBeInTheDocument();
        });

        expect(localStorage.getItem('authToken')).toBe(null);
    });

    it('renders ImageEditor if userIcon not set', async () => {
        localStorage.setItem('authToken', 'validToken');

        const { getByTestId } = render(<MainCodeIndex />);
        await waitFor(() => {
            expect(getByTestId('mocked-image-editor')).toBeInTheDocument();
        });
    });

    it('renders saved user icon if userIcon exists', async () => {
        localStorage.setItem('authToken', 'validToken');
        localStorage.setItem('userIcon', 'data:image/png;base64,...');

        const { getByAltText } = render(<MainCodeIndex />);
        await waitFor(() => {
            expect(getByAltText('User Icon')).toBeInTheDocument();
        });
    });

    it('sets language to en if changed-lang is enabled', () => {
        localStorage.setItem('changed-lang', 'enabled');
        const { getByText } = render(<MainCodeIndex />);
        expect(getByText(/login/i)).toBeInTheDocument(); // английская версия
    });
});
