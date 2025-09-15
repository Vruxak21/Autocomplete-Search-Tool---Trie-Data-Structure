# SearchInput Component

A React component that provides real-time search suggestions with keyboard navigation, loading states, and error handling.

## Features

- ✅ Real-time search with 300ms debounce
- ✅ Keyboard navigation (↑↓ arrows, Enter, Escape)
- ✅ Loading states and error handling
- ✅ Responsive design with Tailwind CSS
- ✅ Accessibility support (ARIA attributes)
- ✅ Frequency tracking and highlighting
- ✅ Click outside to close suggestions
- ✅ Prefix highlighting in suggestions

## Usage

```jsx
import SearchInput from './components/SearchInput';

function App() {
  const handleSearch = (query, suggestions) => {
    console.log('Search performed:', query, suggestions);
  };

  const handleSelect = (suggestion) => {
    console.log('Suggestion selected:', suggestion);
  };

  return (
    <SearchInput
      onSearch={handleSearch}
      onSelect={handleSelect}
      className="mb-4"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSearch` | `function` | `undefined` | Callback fired when search is performed. Receives `(query, suggestions)` |
| `onSelect` | `function` | `undefined` | Callback fired when suggestion is selected. Receives `(suggestion)` |
| `className` | `string` | `''` | Additional CSS classes to apply to the container |

## API Integration

The component expects the backend API to provide:

### Search Endpoint
- **URL**: `GET /api/search`
- **Query Parameters**:
  - `query`: The search query string
  - `limit`: Maximum number of suggestions (default: 5)
- **Response Format**:
```json
{
  "suggestions": [
    {
      "word": "Tokyo",
      "frequency": 100,
      "category": "city"
    }
  ],
  "query": "tok",
  "timestamp": 1234567890
}
```

### Frequency Increment Endpoint
- **URL**: `POST /api/search/increment`
- **Body**:
```json
{
  "word": "Tokyo"
}
```

## Keyboard Navigation

- **↓ Arrow**: Navigate down through suggestions
- **↑ Arrow**: Navigate up through suggestions
- **Enter**: Select the currently highlighted suggestion
- **Escape**: Close suggestions dropdown

## Error Handling

The component handles various error scenarios:

- **Network errors**: Shows "Failed to fetch suggestions" message
- **Timeout errors**: Shows "Search timeout" message
- **No results**: Shows "No suggestions found" message
- **Auto-clear**: Error messages automatically clear after 5 seconds

## Accessibility

The component includes proper ARIA attributes:

- `role="combobox"` on the input
- `aria-expanded` to indicate dropdown state
- `aria-haspopup="listbox"` to indicate popup type
- `role="listbox"` on suggestions container
- `role="option"` on each suggestion
- `aria-selected` to indicate selected suggestion

## Testing

The component includes comprehensive unit tests covering:

- Basic rendering and interaction
- API integration
- Keyboard navigation
- Error handling
- Accessibility features
- Loading states

Run tests with:
```bash
npm test
```