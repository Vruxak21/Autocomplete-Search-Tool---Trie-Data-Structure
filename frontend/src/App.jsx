import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContainer';
import Layout from './components/Layout';
import SearchPage from './pages/SearchPage';
import VisualizationPage from './pages/VisualizationPage';
import PerformancePage from './pages/PerformancePage';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<SearchPage />} />
              <Route path="visualization" element={<VisualizationPage />} />
              <Route path="performance" element={<PerformancePage />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
