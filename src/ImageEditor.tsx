import React, {useRef, useEffect, useMemo} from 'react';

interface ImageEditorProps {
    src: string;
    letter: string;
    onRender?: (dataUrl: string) => void;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    return '#' + Array.from({ length: 6 })
        .map(() => letters[Math.floor(Math.random() * 16)])
        .join('');
}

function invertColor(hex: string): string {
    // Убираем # если есть
    hex = hex.replace('#', '');

    // Если короткий формат (#abc), превращаем в #aabbcc
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    const r = 255 - parseInt(hex.slice(0, 2), 16);
    const g = 255 - parseInt(hex.slice(2, 4), 16);
    const b = 255 - parseInt(hex.slice(4, 6), 16);

    // Преобразуем обратно в hex и добавляем #
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ src, letter, onRender }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Цвет генерируется один раз
    const color = useMemo(() => getRandomColor(), []);
    const bgColor = invertColor(color);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Рисуем изображение
            ctx.drawImage(img, 0, 0);

            // Заполняем фон
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = color;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 5, 0, 2 * Math.PI);
            ctx.stroke();

            // Добавляем текст
            ctx.fillStyle = color;
            ctx.font = `bold ${canvas.width / 2.5}px Verdana`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter, canvas.width / 2, canvas.height / 2);
            // console.log(letter);

            // Генерация dataURL, если нужно
            if (onRender) {
                const dataUrl = canvas.toDataURL('image/png');
                onRender(dataUrl);
            }
        };

        img.src = src;
    }, [src, letter, color, bgColor, onRender]);

    return <canvas ref={canvasRef}
                   className='header__up-blocks__wrapper__icon_gen'/>;
                   //style={{ border: `3px solid ${color}`}}  //, borderRadius: '10px' }} />;
};

export default ImageEditor;
