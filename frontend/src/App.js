import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Context for authentication
const AuthContext = createContext();

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Get user info from token or API
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
    setLoading(false);
  }, [token]);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Login Component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister 
        ? { email, password, username, full_name: fullName }
        : { email, password };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);
      
      login(response.data.user, response.data.access_token);
      navigate('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
      alert(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/${provider}`, {
        token: 'dummy-token'
      });
      login(response.data.user, response.data.access_token);
      navigate('/dashboard');
    } catch (error) {
      console.error('OAuth error:', error);
      alert('OAuth authentication failed');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full space-y-8 p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {isRegister ? 'Create account' : 'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {isRegister && (
              <>
                <div>
                  <input
                    type="text"
                    required
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    required
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <input
                type="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} placeholder-gray-500 text-gray-900 ${isRegister ? '' : 'rounded-t-md'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : (isRegister ? 'Register' : 'Sign in')}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                className={`w-full inline-flex justify-center py-2 px-4 border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-md shadow-sm text-sm font-medium ${darkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-500 bg-white hover:bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('github')}
                className={`w-full inline-flex justify-center py-2 px-4 border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-md shadow-sm text-sm font-medium ${darkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-500 bg-white hover:bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                GitHub
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('linkedin')}
                className={`w-full inline-flex justify-center py-2 px-4 border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-md shadow-sm text-sm font-medium ${darkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-500 bg-white hover:bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                LinkedIn
              </button>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className={`text-indigo-600 hover:text-indigo-500 ${darkMode ? 'text-indigo-400' : ''}`}
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ currentPage, onPageChange }) => {
  const { darkMode } = useTheme();
  const { logout, user } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'problems', name: 'Problems', icon: '💻' },
    { id: 'editor', name: 'Code Editor', icon: '⚡' },
    { id: 'leaderboard', name: 'Leaderboard', icon: '🏆' },
    { id: 'profile', name: 'Profile', icon: '👤' },
  ];

  return (
    <div className={`w-64 h-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex flex-col`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          CodeChamp
        </h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Welcome, {user?.username}
        </p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-indigo-600 text-white'
                    : darkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={logout}
          className={`w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors ${
            darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="mr-3">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
};

// Header Component
const Header = () => {
  const { darkMode, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className={`h-16 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6`}>
      <div className="flex items-center space-x-4">
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Coding Challenge Platform
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <span className="text-yellow-500">⚡</span>
          <span className="font-semibold">{user?.points || 0} pts</span>
          <span className="text-orange-500">🔥</span>
          <span className="font-semibold">{user?.streak_days || 0} day streak</span>
        </div>
        
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/user/progress`);
        setStats(response.data.stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [API_BASE_URL]);

  const chartData = {
    labels: ['Solved', 'Unsolved'],
    datasets: [
      {
        data: stats ? [stats.solved_questions, stats.total_questions - stats.solved_questions] : [0, 0],
        backgroundColor: ['#10B981', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const activityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Problems Solved',
        data: [2, 4, 1, 3, 5, 2, 1],
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Problems Solved
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats?.solved_questions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Points
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {user?.points || 0}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">🔥</span>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Current Streak
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {user?.streak_days || 0} days
              </p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Accuracy
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats?.accuracy?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Problem Completion
          </h3>
          <div className="w-64 h-64 mx-auto">
            <Doughnut 
              data={chartData} 
              options={{
                plugins: {
                  legend: {
                    labels: {
                      color: darkMode ? '#fff' : '#000'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Weekly Activity
          </h3>
          <Bar 
            data={activityData} 
            options={{
              responsive: true,
              plugins: {
                legend: {
                  labels: {
                    color: darkMode ? '#fff' : '#000'
                  }
                }
              },
              scales: {
                x: {
                  ticks: {
                    color: darkMode ? '#fff' : '#000'
                  }
                },
                y: {
                  ticks: {
                    color: darkMode ? '#fff' : '#000'
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Problems List Component
const Problems = ({ onSelectProblem }) => {
  const { darkMode } = useTheme();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ language: '', difficulty: '', topic: '' });

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const params = new URLSearchParams();
        if (filter.language) params.append('language', filter.language);
        if (filter.difficulty) params.append('difficulty', filter.difficulty);
        if (filter.topic) params.append('topic', filter.topic);

        const response = await axios.get(`${API_BASE_URL}/api/questions?${params}`);
        setQuestions(response.data);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [filter, API_BASE_URL]);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Problems
        </h2>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filter.language}
            onChange={(e) => setFilter({ ...filter, language: e.target.value })}
            className={`px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
          >
            <option value="">All Languages</option>
            <option value="JavaScript">JavaScript</option>
            <option value="Java">Java</option>
            <option value="Python">Python</option>
            <option value="SQL">SQL</option>
          </select>
          
          <select
            value={filter.difficulty}
            onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
            className={`px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          
          <select
            value={filter.topic}
            onChange={(e) => setFilter({ ...filter, topic: e.target.value })}
            className={`px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
          >
            <option value="">All Topics</option>
            <option value="Arrays">Arrays</option>
            <option value="Strings">Strings</option>
            <option value="Stack">Stack</option>
            <option value="APIs">APIs</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question) => (
          <div
            key={question.id}
            className={`p-4 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => onSelectProblem(question.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {question.title}
                </h3>
                <div className="flex items-center space-x-3 mt-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty}
                  </span>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {question.language}
                  </span>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {question.topic}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {question.points} pts
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Code Editor Component
const CodeEditor = ({ questionId }) => {
  const { darkMode } = useTheme();
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    if (questionId) {
      const fetchQuestion = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/questions/${questionId}`);
          setQuestion(response.data);
          setCode(response.data.starter_code || '');
          setLanguage(response.data.language.toLowerCase());
        } catch (error) {
          console.error('Error fetching question:', error);
        }
      };

      fetchQuestion();
    }
  }, [questionId, API_BASE_URL]);

  const handleSubmit = async () => {
    if (!question) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/questions/${question.id}/submit`, {
        code,
        language
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error submitting code:', error);
      setResult({
        status: 'error',
        score: 0,
        passed_test_cases: 0,
        total_test_cases: 0,
        points_earned: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (!questionId) {
    return (
      <div className="p-6 text-center">
        <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Code Editor
        </h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Select a problem to start coding
        </p>
      </div>
    );
  }

  if (!question) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {question.title}
        </h2>
        <div className="flex items-center space-x-4 mb-4">
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            question.difficulty === 'Easy' ? 'text-green-600 bg-green-100' :
            question.difficulty === 'Medium' ? 'text-yellow-600 bg-yellow-100' :
            'text-red-600 bg-red-100'
          }`}>
            {question.difficulty}
          </span>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {question.language} • {question.topic}
          </span>
          <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {question.points} points
          </span>
        </div>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {question.description}
        </p>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/2 flex flex-col">
          <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Test Cases
            </h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {question.test_cases?.map((testCase, index) => (
              <div key={index} className={`mb-4 p-3 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Input: {testCase.input}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Expected: {testCase.expected}
                </div>
              </div>
            )) || (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No test cases available
              </p>
            )}
          </div>
        </div>

        <div className="w-1/2 flex flex-col border-l border-gray-200 dark:border-gray-700">
          <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Code Editor
              </h3>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Run & Submit'}
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            <Editor
              height="100%"
              language={language}
              value={code}
              theme={darkMode ? 'vs-dark' : 'light'}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {result && (
            <div className={`flex-none p-4 border-t border-gray-200 dark:border-gray-700 ${
              result.status === 'passed' ? 'bg-green-50 dark:bg-green-900' :
              result.status === 'failed' ? 'bg-red-50 dark:bg-red-900' :
              'bg-yellow-50 dark:bg-yellow-900'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`font-semibold ${
                    result.status === 'passed' ? 'text-green-800 dark:text-green-200' :
                    result.status === 'failed' ? 'text-red-800 dark:text-red-200' :
                    'text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {result.status === 'passed' ? '✅ All tests passed!' :
                     result.status === 'failed' ? '❌ Some tests failed' :
                     '⚠️ Runtime error'}
                  </span>
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {result.passed_test_cases}/{result.total_test_cases} test cases passed
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Score: {result.score}%
                  </div>
                  {result.points_earned > 0 && (
                    <div className="text-green-600 font-semibold">
                      +{result.points_earned} points
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Leaderboard Component
const Leaderboard = () => {
  const { darkMode } = useTheme();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/leaderboard`);
        setLeaderboard(response.data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [API_BASE_URL]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="p-6">
      <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Leaderboard
      </h2>
      
      <div className={`rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Rank
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  User
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Points
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Streak
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
              {leaderboard.map((user) => (
                <tr key={user.rank} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="flex items-center">
                      {user.rank <= 3 && (
                        <span className="mr-2">
                          {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                      #{user.rank}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    {user.username}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    {user.points}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    🔥 {user.streak_days} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Profile Component
const Profile = () => {
  const { darkMode } = useTheme();
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Profile
      </h2>
      
      <div className={`max-w-2xl rounded-lg shadow p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center space-x-6 mb-6">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {user?.full_name || user?.username}
            </h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              @{user?.username}
            </p>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {user?.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {user?.points || 0}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Points
              </div>
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {user?.streak_days || 0}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Day Streak
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Container
const DashboardContainer = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const { darkMode } = useTheme();

  const handleSelectProblem = (questionId) => {
    setSelectedQuestionId(questionId);
    setCurrentPage('editor');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'problems':
        return <Problems onSelectProblem={handleSelectProblem} />;
      case 'editor':
        return <CodeEditor questionId={selectedQuestionId} />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardContainer />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
