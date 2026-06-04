import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css';

// --- 1. LOGIN COMPONENT ---
function Login({ setAuth, setRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/login/', { email, password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user_id', response.data.user_id);
      localStorage.setItem('role', response.data.role);
      
      setAuth(true);
      setRole(response.data.role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || "SYS_ERR: Invalid credentials.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <form onSubmit={handleLogin} className="glass-panel" style={{ width: '350px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Nexus<span className="highlight-text">Library</span></h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-muted)' }}>AUTHORIZED ACCESS ONLY</p>
        
        {error && <div className="cyber-alert error">{error}</div>}
        
        <input type="email" placeholder="USER IDENTIFICATION" required className="cyber-input" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="SECURITY KEY" required className="cyber-input" value={password} onChange={e => setPassword(e.target.value)} />
        
        <button type="submit" className="cyber-btn" style={{ marginTop: '1rem' }}>Initiate Login</button>
      </form>
    </div>
  );
}

// --- 2. LIBRARIAN ADMIN PANEL ---
function LibrarianDashboard({ setAuth }) {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState('');
  
  const [newCat, setNewCat] = useState('');
  const [newBook, setNewBook] = useState({ title: '', author: '', barcode: '', total_copies: 1, category_id: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [booksRes, catRes] = await Promise.all([api.get('/books/search/'), api.get('/categories/')]);
    setBooks(booksRes.data);
    setCategories(catRes.data);
    if (catRes.data.length > 0) setNewBook(prev => ({...prev, category_id: catRes.data[0].id}));
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories/', { name: newCat });
      showMsg('success', 'NODE ADDED: Category initialized.');
      setNewCat('');
      fetchData();
    } catch (err) { showMsg('error', 'ERR: Category creation failed.'); }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      await api.post('/books/', newBook);
      showMsg('success', 'ASSET SECURED: Book added to inventory.');
      setNewBook({ title: '', author: '', barcode: '', total_copies: 1, category_id: categories[0]?.id || '' });
      fetchData();
    } catch (err) { showMsg('error', err.response?.data?.detail || 'ERR: Asset registration failed.'); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(false);
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="flex-between" style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1>Nexus<span className="highlight-text">Library</span> <span style={{fontSize: '1rem', color: '#e67e22'}}>[SYS_ADMIN]</span></h1>
        <button onClick={handleLogout} className="cyber-btn danger" style={{ width: 'auto' }}>Disconnect</button>
      </header>

      {message && <div className={`cyber-alert ${message.type}`}>{message.text}</div>}

      <div className="flex-row" style={{ marginBottom: '3rem' }}>
        <section className="glass-panel" style={{ flex: '1', minWidth: '300px' }}>
          <h3>[ Initialize Category ]</h3>
          <form onSubmit={handleAddCategory} className="flex-between" style={{ gap: '1rem', marginTop: '1.5rem' }}>
            <input type="text" placeholder="e.g. Quantum Computing" required className="cyber-input" style={{ marginBottom: 0 }} value={newCat} onChange={e => setNewCat(e.target.value)} />
            <button type="submit" className="cyber-btn" style={{ width: 'auto' }}>Execute</button>
          </form>
        </section>

        <section className="glass-panel" style={{ flex: '2', minWidth: '400px' }}>
          <h3>[ Register New Asset ]</h3>
          <form onSubmit={handleAddBook} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            <input type="text" placeholder="Asset Title" required className="cyber-input" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} />
            <input type="text" placeholder="Author/Creator" required className="cyber-input" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} />
            <input type="text" placeholder="Barcode ID (e.g. CS-101)" required className="cyber-input" value={newBook.barcode} onChange={e => setNewBook({...newBook, barcode: e.target.value})} />
            <div className="flex-between" style={{ gap: '1rem' }}>
              <input type="number" min="1" placeholder="Units" required className="cyber-input" style={{ width: '40%' }} value={newBook.total_copies} onChange={e => setNewBook({...newBook, total_copies: parseInt(e.target.value)})} />
              <select className="cyber-input" style={{ width: '60%' }} required value={newBook.category_id} onChange={e => setNewBook({...newBook, category_id: parseInt(e.target.value)})}>
                <option value="" disabled>Select Sector</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <button type="submit" className="cyber-btn" style={{ gridColumn: 'span 2' }}>Register to Grid</button>
          </form>
        </section>
      </div>

      <section className="glass-panel">
        <h3>[ Global Inventory Grid ]</h3>
        <table className="cyber-table">
          <thead>
            <tr>
              <th>Asset Title</th>
              <th>Creator</th>
              <th>ID Hash</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {books.map(book => (
              <tr key={book.id}>
                <td style={{ fontWeight: 'bold' }}>{book.title}</td>
                <td>{book.author}</td>
                <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{book.barcode}</td>
                <td>
                  <span className={`inventory-badge ${book.available_copies > 0 ? 'in-stock' : 'out-stock'}`}>
                    {book.available_copies} / {book.total_copies} UNITS
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// --- 3. STUDENT DASHBOARD ---
function Dashboard({ setAuth }) {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');

  const [books, setBooks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { fetchBooks(); fetchRecommendations(); }, []);

  const fetchBooks = async (query = '') => {
    try {
      const url = query ? `/books/search/?title=${query}` : '/books/search/';
      const res = await api.get(url);
      setBooks(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await api.get(`/recommendations/${userId}`);
      setRecommendations(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks(searchQuery);
  };

  const handleIssue = async (bookId) => {
    try {
      await api.post('/issue/', { book_id: bookId, user_id: parseInt(userId) });
      setMessage({ type: 'success', text: 'DOWNLOAD COMPLETE: Book issued successfully.' });
      fetchBooks(searchQuery); 
      fetchRecommendations();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'ERR: Issue request denied.' });
    }
    setTimeout(() => setMessage(''), 4000);
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(false);
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="flex-between" style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.2)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1>Nexus<span className="highlight-text">Library</span> <span style={{fontSize: '1rem', color: '#8892b0'}}>[USER_TERMINAL]</span></h1>
        <button onClick={handleLogout} className="cyber-btn danger" style={{ width: 'auto' }}>Disconnect</button>
      </header>

      {message && <div className={`cyber-alert ${message.type}`}>{message.text}</div>}

      <section style={{ marginBottom: '4rem' }}>
        <h3>[ AI Predictive Suggestions ]</h3>
        <div className="flex-row" style={{ marginTop: '1.5rem' }}>
          {recommendations.length > 0 ? (
            recommendations.map(book => (
              <div key={book.id} className="cyber-card recommended">
                <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0' }}>{book.title}</h2>
                <p className="book-author">{book.author}</p>
                <button onClick={() => handleIssue(book.id)} className="cyber-btn" disabled={book.available_copies <= 0}>
                  {book.available_copies > 0 ? 'Initiate Issue' : 'Depleted'}
                </button>
              </div>
            ))
          ) : (<p style={{ color: 'var(--text-muted)' }}>Awaiting sufficient user data to generate matrix...</p>)}
        </div>
      </section>

      <section>
        <div className="flex-between" style={{ marginBottom: '2rem' }}>
          <h3>[ Master Database ]</h3>
          <form onSubmit={handleSearch} className="flex-between" style={{ gap: '1rem' }}>
            <input type="text" placeholder="Query Matrix..." className="cyber-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ marginBottom: 0, width: '300px' }} />
            <button type="submit" className="cyber-btn" style={{ width: 'auto' }}>Search</button>
          </form>
        </div>

        <div className="flex-row">
          {books.length > 0 ? (
            books.map(book => (
              <div key={book.id} className="cyber-card">
                <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0' }}>{book.title}</h2>
                <p className="book-author">{book.author}</p>
                <span className={`inventory-badge ${book.available_copies > 0 ? 'in-stock' : 'out-stock'}`}>
                  {book.available_copies} / {book.total_copies} AVAIL
                </span>
                <button onClick={() => handleIssue(book.id)} className="cyber-btn" disabled={book.available_copies <= 0}>
                  {book.available_copies > 0 ? 'Initiate Issue' : 'Depleted'}
                </button>
              </div>
            ))
          ) : (<p style={{ color: 'var(--text-muted)' }}>No records found in current query.</p>)}
        </div>
      </section>
    </div>
  );
}

// --- 4. MAIN APP ROUTER ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} setRole={setRole} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={
          isAuthenticated ? (role === 'librarian' ? <LibrarianDashboard setAuth={setIsAuthenticated} /> : <Dashboard setAuth={setIsAuthenticated} />) 
          : <Navigate to="/login" />
        } />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;