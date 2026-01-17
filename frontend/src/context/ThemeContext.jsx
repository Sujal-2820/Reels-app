import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Check localStorage or system preference
    const getInitialTheme = () => {
        const savedTheme = localStorage.getItem('reelbox_theme');
        if (savedTheme) return savedTheme;

        // Default to light theme
        return 'light';
    };

    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old theme classes
        root.classList.remove('light-theme', 'dark-theme');

        // Add current theme class
        root.classList.add(`${theme}-theme`);

        // Save to localStorage
        localStorage.setItem('reelbox_theme', theme);
    }, [theme]);

    // We removed the system theme listener to ensure the app stays in the default 'light' theme
    // unless the user manually toggles it.

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
