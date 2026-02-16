# Olam Katan - Children Registration Management System

עולם קטן - מערכת ניהול רישום ילדים

A modern web application for managing children's registration and information for early childhood programs.

## Features

- **RTL Layout**: Full right-to-left support for Hebrew language
- **Tab Navigation**: Children, Team, Schedule, and Settings tabs
- **Editable Children Table**: Manage children's information with inline editing
- **Age Group Management**: Configurable age categories with automatic grouping
- **Real-time Statistics**: Widget showing number of children in each age group
- **Data Persistence**: All data saved to browser localStorage

## Technology Stack

- React 18
- Vite (build tool and dev server)
- Modern CSS with RTL support

## Setup Instructions

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd olam-katan
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

Start the development server:
```bash
npm run dev
```

The application will open automatically in your browser at `http://localhost:3000`

### Building for Production

To create a production build:
```bash
npm run build
```

The built files will be in the `dist` directory.

To preview the production build:
```bash
npm run preview
```

### Configuration

Defaults are in `src/config.js`. Override via environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_WORK_HOURS_MIN` | 7 | Earliest working hour |
| `VITE_WORK_HOURS_MAX` | 17 | Latest working hour |
| `VITE_REFERENCE_DATE_YEAR` | 2026 | Reference date year (age calculations) |
| `VITE_REFERENCE_DATE_MONTH` | 8 | Reference date month (0-indexed, 8 = September) |
| `VITE_REFERENCE_DATE_DAY` | 1 | Reference date day |

For deployment overrides, add these as GitHub repository secrets.

## Usage

### Children Tab

- **View and Edit**: Click on any cell in the table to edit
- **Add New Child**: Start typing a name in the first empty row at the bottom
- **Date Format**: Use European format (DD/MM/YYYY) for dates of birth
- **Auto Grouping**: When you enter a date of birth, the system will automatically suggest the appropriate age group

### Settings Tab

- **Configure Age Groups**: Add, edit, or delete age group categories
- **Age Range**: Set minimum and maximum age in months for each group
- **Validation**: Cannot delete age groups that have children assigned

### Age Group Widget

The widget at the top of the Children tab shows:
- Number of children in each age group
- Total number of children registered

## Data Storage

**Without Supabase (default):** Data is stored in the browser's localStorage.
- Persists across sessions on the same device
- Data does *not* sync across devices

**With Supabase (optional):** Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to sync data across devices.
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Add secrets to your repo (Settings → Secrets) and to `.env` for local dev
4. See `.env.example` for the required variables

## Project Structure

```
olam-katan/
├── src/
│   ├── components/
│   │   ├── ChildrenTab.jsx      # Main children management table
│   │   ├── AgeGroupWidget.jsx   # Statistics widget
│   │   └── SettingsTab.jsx      # Age group configuration
│   ├── utils/
│   │   └── storage.js           # localStorage utilities
│   ├── App.jsx                  # Main application component
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Global styles with RTL support
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── vite.config.js              # Vite configuration
└── README.md                    # This file
```

## Future Enhancements

- Add child via dedicated button (currently can add via empty row)
- Full Hebrew translation of all UI elements
- Backend integration for multi-user support
- Export/import functionality
- Team and Schedule tab implementations
- Additional tabs as needed

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## License

This project is for internal use.
