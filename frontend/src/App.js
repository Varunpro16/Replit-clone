import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import Main from './Main'; // Your terminal page
import XTerminal from './components/XTerminal'
import DBTerminal from './components/DBTerminal';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/main" element={<Main />} />
        <Route path="/terminal" element={<DBTerminal />} />
      </Routes>
    </Router>
  );
}

export default App;
