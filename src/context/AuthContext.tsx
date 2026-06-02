import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  site?: {
    id: string;
    name: string;
    location: string;
  };
  avatar?: string;
  designation?: string;
  jobTitle?: string;
  siteId?: string;
  isBiometricEnrolled?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved session on load
    const savedToken = localStorage.getItem('tf_token');
    const savedUser = localStorage.getItem('tf_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData: User, newToken: string) => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('tf_token', newToken);
    localStorage.setItem('tf_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('tf_user', JSON.stringify(userData));
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'ADMIN';

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
