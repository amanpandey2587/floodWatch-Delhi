'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface User {
    id: string;
    email: string;
    role: string;
    ward_number?: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, role?: string, wardNumber?: number) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                email,
                password,
            });

            const { access_token, user: userData } = response.data;

            // Store token and user info
            localStorage.setItem('auth_token', access_token);
            localStorage.setItem('auth_user', JSON.stringify(userData));

            setToken(access_token);
            setUser(userData);
        } catch (error: any) {
            console.error('Login error:', error);
            throw new Error(error.response?.data?.detail || 'Login failed');
        }
    };

    const register = async (
        email: string,
        password: string,
        role: string = 'citizen',
        wardNumber?: number
    ) => {
        try {
            const payload: any = {
                email,
                password,
                role,
            };

            if (wardNumber && role === 'ward_officer') {
                payload.ward_number = wardNumber;
            }

            const response = await axios.post(`${API_BASE_URL}/api/auth/register`, payload);

            const { access_token, user: userData } = response.data;

            // Auto-login after registration
            localStorage.setItem('auth_token', access_token);
            localStorage.setItem('auth_user', JSON.stringify(userData));

            setToken(access_token);
            setUser(userData);
        } catch (error: any) {
            console.error('Registration error:', error);
            throw new Error(error.response?.data?.detail || 'Registration failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
