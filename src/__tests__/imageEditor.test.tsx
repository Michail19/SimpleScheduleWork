import React from 'react';
import { render, waitFor } from '@testing-library/react';
import ImageEditor from '../ImageEditor';

import 'jest-canvas-mock';

describe('ImageEditor', () => {
    const mockSrc = 'https://example.com/image.png';
    const mockLetter = 'A';

    it('renders canvas element', () => {
        const { container } = render(<ImageEditor src={mockSrc} letter={mockLetter} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
    });

    it('calls onRender after image is loaded', async () => {
        const onRenderMock = jest.fn();

        // Подготавливаем spies
        const image = new Image();
        Object.defineProperty(image, 'naturalWidth', { value: 100 });
        Object.defineProperty(image, 'naturalHeight', { value: 100 });

        const imageConstructorSpy = jest.spyOn(global as any, 'Image').mockImplementation(() => {
            setTimeout(() => image.onload?.(null as any), 0);
            return image;
        });

        render(<ImageEditor src={mockSrc} letter={mockLetter} onRender={onRenderMock} />);

        await waitFor(() => {
            expect(onRenderMock).toHaveBeenCalled();
            const dataURL = onRenderMock.mock.calls[0][0];
            expect(typeof dataURL).toBe('string');
            expect(dataURL).toContain('data:image/png');
        });

        imageConstructorSpy.mockRestore();
    });
});
