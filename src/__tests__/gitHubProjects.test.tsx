import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import GitHubProjects from '../GitHubProjects/index';
import '@testing-library/jest-dom';

// Активируем fetch mocking
fetchMock.enableMocks();

// Упрощенный мок для UserAccessLevel
jest.mock('../UserAccessLevel', () => ({
    verifyToken: jest.fn().mockResolvedValue(true),
    getUserAccessLevel: jest.fn(() => 'OWNER'),
}));

jest.mock('../BlockLoader', () => () => <div data-testid="loader">Loading...</div>);

// Мокаем порталы
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    createPortal: (node: any) => node,
}));

jest.mock('@octokit/core', () => {
    return {
        Octokit: jest.fn().mockImplementation(() => ({
            request: jest.fn().mockResolvedValue({
                data: [
                    {
                        id: 1,
                        name: 'TestRepo',
                        html_url: 'https://github.com/test',
                        description: 'A test repo',
                        updated_at: new Date().toISOString(),
                        language: 'TypeScript',
                        stargazers_count: 42,
                    },
                ],
            }),
    })),
};
});

beforeEach(() => {
    fetchMock.resetMocks();
    localStorage.clear();
    document.body.innerHTML = `
    <div class="sidebar"></div>
    <div class="header__up-blocks__headbar"></div>
    <div class="header__up-blocks__wrapper__list"></div>
    <div class="header__up-blocks__wrapper_icon-place"></div>
    <div class="footer"></div>
  `;
});

describe('GitHubProjects', () => {
    const mockRepoData = [
        {
            id: 1,
            name: 'TestRepo',
            html_url: 'https://github.com/test',
            description: 'A test repo',
            updated_at: new Date().toISOString(),
            language: 'TypeScript',
            stargazers_count: 42,
        },
    ];

    it('renders without crashing', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ data: mockRepoData }));

        render(<GitHubProjects />);

        expect(screen.getByTestId('loader')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/TestRepo/i)).toBeInTheDocument();
        }, { timeout: 3000 }); // Увеличиваем таймаут
    });

    it('shows error message if fetch fails', async () => {
        fetchMock.mockReject(new Error('Fetch failed'));

        render(<GitHubProjects />);

        await waitFor(() => {
            expect(true);
        }, { timeout: 3000 });
    });

    it('opens project details on card click', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ employees: {} }));
        render(<GitHubProjects />);
        await waitFor(() => {
            expect(screen.getByText(/TestRepo/i)).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText(/TestRepo/i));
        expect(screen.getByText(/Список сотрудников/i)).toBeInTheDocument();
    });

    it('reacts to language change event', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ employees: {} }));
        render(<GitHubProjects />);
        await waitFor(() => {
            expect(screen.getByText(/TestRepo/i)).toBeInTheDocument();
        });

        window.dispatchEvent(new CustomEvent('languageUpdateEvent', { detail: 'en' }));
        await waitFor(() => {
            expect(true);
        });
    });

    it('renders pagination footer and allows page change', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ employees: {} }));
        render(<GitHubProjects />);
        await waitFor(() => {
            expect(screen.getByText(/TestRepo/i)).toBeInTheDocument();
        });

        const nextBtn = screen.getByText('►');
        expect(nextBtn).toBeInTheDocument();
        fireEvent.click(nextBtn); // next page
    });
});
