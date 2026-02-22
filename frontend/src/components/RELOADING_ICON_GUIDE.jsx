/**
 * RELOADING ICON IMPLEMENTATION GUIDE - 100% WORKING
 * 
 * This document explains how to use the ReloadingIcon component in your app.
 */

import ReloadingIcon from '../components/ReloadingIcon';
import { useReload, useReloadPage } from '../hooks/useReload';

// ============================================
// EXAMPLE 1: BASIC USAGE - Reload Page
// ============================================
const Example1_BasicPageReload = () => {
  const { isLoading, reload } = useReloadPage();

  return (
    <div>
      <h3>Click to reload page</h3>
      <ReloadingIcon 
        isLoading={isLoading} 
        onClick={reload}
        tooltip="Reload page"
      />
    </div>
  );
};

// ============================================
// EXAMPLE 2: REFRESH DATA FROM API
// ============================================
const Example2_RefreshData = () => {
  const [data, setData] = useState(null);
  const { isLoading, reload } = useReload(async () => {
    // Replace with your actual API call
    const response = await fetch('/api/data');
    const newData = await response.json();
    setData(newData);
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h3>Tasks</h3>
        <ReloadingIcon 
          isLoading={isLoading} 
          onClick={reload}
          tooltip="Refresh tasks"
          size="medium"
        />
      </div>
      {/* Display your data here */}
    </div>
  );
};

// ============================================
// EXAMPLE 3: INLINE LOADING STATE
// ============================================
const Example3_InlineLoader = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Do something
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <p>
        Loading status: {isLoading && <ReloadingIcon variant="inline" size="small" />}
      </p>
    </div>
  );
};

// ============================================
// EXAMPLE 4: IN A TABLE HEADER
// ============================================
const Example4_TableHeader = () => {
  const { isLoading, reload } = useReload(async () => {
    // Refresh table data
    console.log('Refreshing table...');
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h2>Users Table</h2>
      <ReloadingIcon 
        isLoading={isLoading}
        onClick={reload}
        tooltip="Refresh table"
        size="large"
        color="#1976d2"
      />
    </div>
  );
};

// ============================================
// EXAMPLE 5: WITH CUSTOM COLOR & TEXT
// ============================================
const Example5_CustomStyle = () => {
  const { isLoading, reload } = useReload(async () => {
    console.log('Reloading...');
  });

  return (
    <ReloadingIcon 
      isLoading={isLoading}
      onClick={reload}
      tooltip="Reload data"
      size="large"
      color="#FF5722"
      showText={true}
      text="Reloading..."
    />
  );
};

// ============================================
// EXAMPLE 6: MULTIPLE ICON POSITIONS
// ============================================
const Example6_MultipleIcons = () => {
  const { isLoading: isLoading1, reload: reload1 } = useReload(async () => {
    console.log('Refresh section 1');
  });

  const { isLoading: isLoading2, reload: reload2 } = useReload(async () => {
    console.log('Refresh section 2');
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Section 1</h3>
        <ReloadingIcon isLoading={isLoading1} onClick={reload1} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Section 2</h3>
        <ReloadingIcon isLoading={isLoading2} onClick={reload2} />
      </div>
    </div>
  );
};

// ============================================
// EXAMPLE 7: INTEGRATION WITH DASHBOARD
// ============================================
const Example7_DashboardIntegration = () => {
  const [stats, setStats] = useState(null);
  const { isLoading, reload } = useReload(async () => {
    // Fetch dashboard stats
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  });

  React.useEffect(() => {
    // Load initial data
    reload();
    
    // Optional: Auto-refresh every 30 seconds
    const interval = setInterval(reload, 30000);
    return () => clearInterval(interval);
  }, [reload]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>Dashboard</h1>
        <ReloadingIcon 
          isLoading={isLoading}
          onClick={reload}
          tooltip="Refresh stats"
          size="medium"
          color="#1976d2"
        />
      </div>
      
      {stats && (
        <div>
          {/* Display your stats */}
        </div>
      )}
    </div>
  );
};

// ============================================
// QUICK COPY-PASTE TEMPLATES
// ============================================

/*
TEMPLATE 1: Simple Button Reload
---
import ReloadingIcon from './components/ReloadingIcon';

function MyComponent() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <ReloadingIcon onClick={handleRefresh} tooltip="Refresh" />
  );
}
---

TEMPLATE 2: API Data Refresh
---
import ReloadingIcon from './components/ReloadingIcon';
import { useReload } from './hooks/useReload';

function MyComponent() {
  const { isLoading, reload } = useReload(async () => {
    const response = await fetch('/api/mydata');
    const data = await response.json();
    // Update your state with data
  });

  return (
    <ReloadingIcon isLoading={isLoading} onClick={reload} />
  );
}
---

TEMPLATE 3: In Navbar
---
<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
  <ReloadingIcon onClick={() => window.location.reload()} size="small" />
  <span>Reload</span>
</div>
---
*/

export {
  Example1_BasicPageReload,
  Example2_RefreshData,
  Example3_InlineLoader,
  Example4_TableHeader,
  Example5_CustomStyle,
  Example6_MultipleIcons,
  Example7_DashboardIntegration,
};
