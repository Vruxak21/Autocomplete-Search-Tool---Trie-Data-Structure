import { Outlet, NavLink } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Auto-Complete Search Tool
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                Real-time search suggestions with Trie data structure visualization
              </p>
            </div>
            {/* Mobile-friendly logo or additional header content can go here */}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `border-b-2 px-2 sm:px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`
              }
            >
              Search
            </NavLink>
            <NavLink
              to="/visualization"
              className={({ isActive }) =>
                `border-b-2 px-2 sm:px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`
              }
            >
              Trie Visualization
            </NavLink>
            <NavLink
              to="/performance"
              className={({ isActive }) =>
                `border-b-2 px-2 sm:px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`
              }
            >
              Performance
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
            <p>© 2024 Auto-Complete Search Tool. Built with React & Trie data structures.</p>
            <div className="mt-2 sm:mt-0 flex space-x-4">
              <span>Response Time: &lt;100ms</span>
              <span>•</span>
              <span>Memory Optimized</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;