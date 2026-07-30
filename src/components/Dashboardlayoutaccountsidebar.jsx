import * as React from 'react';
import PropTypes from 'prop-types';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { DemoProvider } from '@toolpad/core/internal';
import demoTheme from '../Theme';
import NAVIGATION from '../Navigation';
import CustomToolbarActions from '../components/Customtoolbaractions';
import DemoPageContent from '../components/PageDemoContent';
import SidebarFooterAccount from '../components/SidebarFooterAccount';
import { UserProvider, useUser } from '../contexts/UserContext';
import LoginPage from '../Screens/LoginPage';

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

  const demoWindow = window !== undefined ? window() : undefined;

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
    <DemoProvider window={demoWindow}>
      <AppProvider
        navigation={NAVIGATION}
        router={router}
        theme={demoTheme}
        window={demoWindow}
        branding={{ title: "Energy Monitoing Admin Panel", logo: null }}
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
      </AppProvider>
    </DemoProvider>
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