import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Check localStorage or system preference
    const getInitialTheme = () => {
        const savedTheme = localStorage.getItem('reelbox_theme_v2');
        if (savedTheme) return savedTheme;
        return 'light';
    };

    const [theme, setTheme] = useState(getInitialTheme);
    const [availableThemes, setAvailableThemes] = useState(['light', 'dark']);

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old theme classes (matching *-theme pattern)
        const classesToRemove = Array.from(root.classList).filter(c => c.endsWith('-theme'));
        classesToRemove.forEach(c => root.classList.remove(c));

        // Add current theme class
        root.classList.add(`${theme}-theme`);

        // Save to localStorage with the new keyv2
        localStorage.setItem('reelbox_theme_v2', theme);
    }, [theme]);

    // We removed the system theme listener to ensure the app stays in the default 'light' theme
    // unless the user manually toggles it.

    const changeTheme = (newTheme, isPremium = false, userHasPremium = false) => {
        if (isPremium && !userHasPremium) {
            return { success: false, message: 'This theme requires a premium subscription!' };
        }
        setTheme(newTheme);
        return { success: true };
    };

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme, toggleTheme }}>
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
