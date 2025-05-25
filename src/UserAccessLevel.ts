import { jwtDecode } from "jwt-decode";

interface MyJwtPayload {
    userId: number;
    accessLevel: string; // Или 'USER' | 'OWNER'
    sub: string;
    exp: number;
    iat: number;
}

export function getUserAccessLevel() {
    const token = localStorage.getItem("authToken"); // или sessionStorage, смотря где хранишь
    if (!token) return null;

    try {
        const decoded = jwtDecode<MyJwtPayload>(token);
        return decoded.accessLevel; // это то, что ты положил в claims
    } catch (error) {
        console.error("Invalid token:", error);
        return null;
    }
}

export function getUsername() {
    const token = localStorage.getItem("authToken"); // или sessionStorage, смотря где хранишь
    if (!token) return null;

    try {
        const decoded = jwtDecode<MyJwtPayload>(token);
        return decoded.sub; // это то, что ты положил в claims
    } catch (error) {
        console.error("Invalid token:", error);
        return null;
    }
}

export async function verifyToken(): Promise<boolean> {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort(); // Это вызовет ошибку AbortError внутри fetch
    }, 8000); // 8 сек

    try {
        const response = await fetch('https://ssw-backend.onrender.com/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(response.status);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('authToken');
                return false;
            }
            throw new Error('Server error');
        }

        clearTimeout(timeoutId);

        return true;
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem("userIcon");
        return false;
    }
}
