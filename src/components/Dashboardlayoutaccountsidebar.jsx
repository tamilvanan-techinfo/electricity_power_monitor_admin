// DashboardLayoutAccountSidebar.jsx
import * as React from 'react';
import PropTypes from 'prop-types';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import demoTheme from '../Theme';
import NAVIGATION from '../Navigation';
import CustomToolbarActions from '../components/Customtoolbaractions';
import DemoPageContent from '../components/PageDemoContent';
import SidebarFooterAccount from '../components/SidebarFooterAccount';
import { UserProvider, useUser } from '../contexts/UserContext';
import LoginPage from '../Screens/LoginPage';
import FloatingWebviewPanel from '../components/FloatingWebviewPanel';
import logo from "../asstes/logo.png";

// The route your Electron app (and the LED screen itself) renders the
// live display on — mirrored in the floating panel.
const DISPLAY_URL = 'http://localhost:1029/';

// Inner component — must be inside UserProvider to use useUser()
function DashboardContent({ window }) {
  const { user, logout } = useUser();
  const [pathname, setPathname] = React.useState('/dashboard');

  const router = React.useMemo(() => {
    return {
      pathname,
      searchParams: new URLSearchParams(),
      navigate: (path) => setPathname(String(path)),
    };
  }, [pathname]);

  const appWindow = window !== undefined ? window() : undefined;

  const session = user
    ? { user: { name: user.username, email: user.email, image: null } }
    : null;

  const authentication = React.useMemo(() => {
    return {
      signIn: () => {},
      signOut: () => { logout(); },
    };
  }, [logout]);

  if (!user) return <LoginPage />;

  return (
    <AppProvider
      navigation={NAVIGATION}
      router={router}
      theme={demoTheme}
      window={appWindow}
      branding={{ title: "Energy Monitoing Admin Panel", logo: <img src={logo} alt="logo" style={{ height: 32 }} /> }}
      authentication={authentication}
      session={session}
    >
      <DashboardLayout
        slots={{
          toolbarActions: CustomToolbarActions,
          sidebarFooter: SidebarFooterAccount,
        }}
      >
        <DemoPageContent pathname={pathname} />
      </DashboardLayout>

      {/* Floating, draggable mini live-preview — sits above the layout,
          persists across route changes since it's rendered outside
          DemoPageContent. */}
      <FloatingWebviewPanel src={DISPLAY_URL} title="Live Display" />
    </AppProvider>
  );
}

// Outer component — wraps everything in UserProvider (only once)
function DashboardLayoutAccountSidebar(props) {
  return (
    <UserProvider>
      <DashboardContent window={props.window} />
    </UserProvider>
  );
}

DashboardLayoutAccountSidebar.propTypes = {
  window: PropTypes.func,
};

export default DashboardLayoutAccountSidebar;