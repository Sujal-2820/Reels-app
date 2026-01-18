import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Check localStorage or system preference
    const getInitialTheme = () => {
        // We changed the key to 'v2' to force a reset for anyone who was stuck on the old dark default
        const savedTheme = localStorage.getItem('reelbox_theme_v2');
        if (savedTheme) return savedTheme;

        // Default to light theme for everyone
        return 'light';
    };

    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old theme classes
        root.classList.remove('light-theme', 'dark-theme');

        // Add current theme class
        root.classList.add(`${theme}-theme`);

        // Save to localStorage with the new keyv2
        localStorage.setItem('reelbox_theme_v2', theme);
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
