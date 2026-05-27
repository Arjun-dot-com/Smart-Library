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
      setRole(response.data.role); // Update role state immediately
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6' }}>
      <form onSubmit={handleLogin} style={{ padding: '2.5rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: '320px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#2c3e50' }}>Smart Library</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#7f8c8d' }}>Sign in to continue</p>
        {error && <div style={{ color: 'white', backgroundColor: '#e74c3c', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        <input type="email" placeholder="Email address" required style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" style={btnStyle}>Log In</button>
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
  const [newBook, setNewBook] = useState({
    title: '', author: '', barcode: '', total_copies: 1, category_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [booksRes, catRes] = await Promise.all([
      api.get('/books/search/'),
      api.get('/categories/')
    ]);
    setBooks(booksRes.data);
    setCategories(catRes.data);
    // Auto-select first category if available
    if (catRes.data.length > 0) setNewBook(prev => ({...prev, category_id: catRes.data[0].id}));
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories/', { name: newCat });
      setMessage({ type: 'success', text: 'Category added!' });
      setNewCat('');
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add category.' });
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      await api.post('/books/', newBook);
      setMessage({ type: 'success', text: 'Book added successfully!' });
      setNewBook({ title: '', author: '', barcode: '', total_copies: 1, category_id: categories[0]?.id || '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to add book.' });
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(false);
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1>Librarian Admin Panel <span style={{fontSize: '1rem', color: '#e67e22'}}>(ADMIN)</span></h1>
        <button onClick={handleLogout} style={{...btnStyle, backgroundColor: '#e74c3c', width: 'auto'}}>Logout</button>
      </header>

      {message && <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '6px', backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>{message.text}</div>}

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
        {/* Category Form */}
        <section style={{ flex: '1', minWidth: '300px', backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '12px' }}>
          <h2>📁 Add Category</h2>
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" placeholder="e.g. Data Science" required style={{...inputStyle, marginBottom: 0}} value={newCat} onChange={e => setNewCat(e.target.value)} />
            <button type="submit" style={{...btnStyle, backgroundColor: '#2ecc71', width: 'auto'}}>Add</button>
          </form>
        </section>

        {/* Book Form */}
        <section style={{ flex: '2', minWidth: '400px', backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '12px' }}>
          <h2>📚 Add New Book</h2>
          <form onSubmit={handleAddBook} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="text" placeholder="Book Title" required style={inputStyle} value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} />
            <input type="text" placeholder="Author" required style={inputStyle} value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} />
            <input type="text" placeholder="Barcode (e.g. CS-101)" required style={inputStyle} value={newBook.barcode} onChange={e => setNewBook({...newBook, barcode: e.target.value})} />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input type="number" min="1" placeholder="Copies" required style={{...inputStyle, width: '40%'}} value={newBook.total_copies} onChange={e => setNewBook({...newBook, total_copies: parseInt(e.target.value)})} />
              <select style={{...inputStyle, width: '60%'}} required value={newBook.category_id} onChange={e => setNewBook({...newBook, category_id: parseInt(e.target.value)})}>
                <option value="" disabled>Select Category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <button type="submit" style={{...btnStyle, backgroundColor: '#3498db', gridColumn: 'span 2'}}>+ Register Book to Inventory</button>
          </form>
        </section>
      </div>

      {/* Inventory List */}
      <section>
        <h2>Current Inventory Status</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Title</th>
              <th style={{ padding: '1rem' }}>Author</th>
              <th style={{ padding: '1rem' }}>Barcode</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {books.map(book => (
              <tr key={book.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{book.title}</td>
                <td style={{ padding: '1rem' }}>{book.author}</td>
                <td style={{ padding: '1rem' }}>{book.barcode}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: book.available_copies > 0 ? '#d4edda' : '#f8d7da', color: book.available_copies > 0 ? '#155724' : '#721c24', fontWeight: 'bold', fontSize: '0.875rem' }}>
                    {book.available_copies} / {book.total_copies} Available
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

// --- 3. STUDENT DASHBOARD (Kept exactly the same as previous) ---
function Dashboard({ setAuth }) {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('user_id');

  const [books, setBooks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBooks();
    fetchRecommendations();
  }, []);

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
      setMessage({ type: 'success', text: 'Book issued successfully!' });
      fetchBooks(searchQuery); 
      fetchRecommendations();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to issue book.' });
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(false);
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1>Library Portal <span style={{fontSize: '1rem', color: '#666'}}>({role.toUpperCase()})</span></h1>
        <button onClick={handleLogout} style={{...btnStyle, backgroundColor: '#e74c3c', width: 'auto'}}>Logout</button>
      </header>

      {message && <div style={{ padding: '1rem', marginBottom: '2rem', borderRadius: '6px', backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>{message.text}</div>}

      <section style={{ marginBottom: '3rem' }}>
        <h2>✨ AI Recommended For You</h2>
        <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {recommendations.length > 0 ? (
            recommendations.map(book => (
              <div key={book.id} style={cardStyle(true)}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{book.title}</h3>
                <p style={{ margin: '0 0 1rem 0', color: '#555' }}>By {book.author}</p>
                <button onClick={() => handleIssue(book.id)} style={btnStyle} disabled={book.available_copies <= 0}>
                  {book.available_copies > 0 ? 'Issue Book' : 'Out of Stock'}
                </button>
              </div>
            ))
          ) : (<p style={{ color: '#666' }}>Borrow some books to get personalized recommendations!</p>)}
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Full Catalog</h2>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" placeholder="Search by title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{...inputStyle, marginBottom: 0, width: '250px'}} />
            <button type="submit" style={{...btnStyle, width: 'auto'}}>Search</button>
          </form>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {books.length > 0 ? (
            books.map(book => (
              <div key={book.id} style={cardStyle(false)}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{book.title}</h3>
                <p style={{ margin: '0 0 0.5rem 0', color: '#555' }}>By {book.author}</p>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: book.available_copies > 0 ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                  {book.available_copies} / {book.total_copies} Available
                </p>
                <button onClick={() => handleIssue(book.id)} style={{...btnStyle, backgroundColor: book.available_copies > 0 ? '#3498db' : '#ccc'}} disabled={book.available_copies <= 0}>
                  {book.available_copies > 0 ? 'Issue Book' : 'Out of Stock'}
                </button>
              </div>
            ))
          ) : (<p style={{ color: '#666' }}>No books found in the catalog.</p>)}
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
        
        {/* Magic Routing: Decides which dashboard to show based on Role */}
        <Route path="/dashboard" element={
          isAuthenticated ? (
            role === 'librarian' ? <LibrarianDashboard setAuth={setIsAuthenticated} /> : <Dashboard setAuth={setIsAuthenticated} />
          ) : <Navigate to="/login" />
        } />
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

// Styles
const inputStyle = { width: '100%', padding: '0.875rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box', fontSize: '1rem' };
const btnStyle = { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '0.875rem', borderRadius: '6px', cursor: 'pointer', width: '100%', fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s' };
const cardStyle = (isRecommended) => ({ border: isRecommended ? '2px solid #9b59b6' : '1px solid #e0e0e0', borderRadius: '12px', padding: '1.5rem', width: '260px', backgroundColor: isRecommended ? '#faf5ff' : 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' });

export default App;